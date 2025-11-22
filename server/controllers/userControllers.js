// ? Chose not to use bcrypt since argon is a more secure alternative.
import argon2, { argon2id } from 'argon2'
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import {v4 as uuid} from 'uuid';
import { consumeIfNotWhitelisted, isIpWhitelisted, limiterSlowBruteByIP, redisClient } from '../middleware/loginRateLimiter.js';
import sendEmail from '../utils/sendEmail.js';
import __dirname from '../utils/directory.js'
import crypto from 'node:crypto';

// Site Link Variable.
// ! Data stored in env file
const siteLink = process.env.SITE_LINK;

import User from '../models/userModel.js'
import { HttpError } from "../models/errorModel.js"
import { version } from 'os';

// Not Being Used at the moment
// import { request } from 'http'
// import { memoryUsage } from 'process';


const sleep = ms => new Promise(r => setTimeout(r, ms))
// Number of Failed Login before trigger
const failedLogin = 5


// * Size of Profile Pic / Avatar
const avatarSizeBytes = 10485760; // Currently 10MB
const avatarSizeMb = (avatarSizeBytes / ( 1024 * 1024 )).toFixed(2) + 'Mb'

const SHADOW_DELAY_BLOCKED = 10 * 1000 //* Blocked IP for 10 seconds, might also reduce response time
const SHADOW_DELAY_FAILED = 0.01 * 1000 //* short 1000ms or 1 second for normal failed attempt

// ! Argon Options
const argonOptions = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 4,
    parallelism: 2,
}
// Argon Rehash Options
const argonOptionsStrong = {
    type: argon2.argon2id,
    memoryCost: 2 ** 17,
    timeCost: 6,
    parallelism: 4,
    version: 0x13
}

// ? needsrehash Helper
const needsRehash = async (hash) => {
    return await argon2.needsRehash(hash, argonOptionsStrong)
}

// ? Monthly Rehash Password Helper
const needsMonthlyRehash = (lastRehashDate) => {
    if (!lastRehashDate) return true;
    const rehashPeriod = 30 * 24 * 60 * 60 * 1000; // Rehash Period
    return Date.now() - lastRehashDate.getTime() >= rehashPeriod;
}

// ? Prehash Password Helper
const prehashPassword = (password) => {
    return crypto
        .createHash('sha256')
        .update(password)
        .digest('hex');
    }
    
const CURRENT_PEPPER = process.env.PEPPER || '';
const OLD_PEPPERS = (process.env.PEPPER_OLD || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const PEPPERS = [CURRENT_PEPPER, ...OLD_PEPPERS].filter(Boolean);

const pepperVersions = {
    CURRENT: 0,
    OLD: 1
};

// * Store peppers in environment variables
// * .env file:
// * PEPPER=current_pepper_value
// * PEPPER_OLD=old_pepper_value1,old_pepper_value2

/**
 * * Try verifying a stored argon2 hash against the provided prehashed password
 * * using the current pepper and any previous peppers. Returns the pepper that
 * * matched or null if none matched.
 */
// * Modified verify function
async function verifyPasswordWithPeppers(storedHash, prehashedPassword, pepperVersion) {
    // Try matching pepper version first if available
    if (pepperVersion === pepperVersions.CURRENT) {
        if (await argon2.verify(storedHash, CURRENT_PEPPER + prehashedPassword)) {
            return CURRENT_PEPPER;
        }
    } else if (pepperVersion === pepperVersions.OLD) {
        // Try old peppers in order
        for (const oldPepper of OLD_PEPPERS) {
            if (await argon2.verify(storedHash, oldPepper + prehashedPassword)) {
                return oldPepper;
            }
        }
    }

    // Fallback: try all peppers if version doesn't match
    for (const pepper of PEPPERS) {
        if (await argon2.verify(storedHash, pepper + prehashedPassword)) {
            return pepper;
        }
    }
    return null;
}

// ? Hash helper that always uses the current pepper
async function hashWithCurrentPepper(prehashedPassword, options = argonOptions) {
  return await argon2.hash(CURRENT_PEPPER + prehashedPassword, options);
}

// * ==================== REGISTER NEW USER
// * POST: api/users/registerzs
// * UNPROTECTED
const registerUser = async (req, res, next) => {
    // Not necessary anymore, use to test if routes work
    // res.json("Register User")
    const ipAddress = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim();

    
    try {
        const {name, email, password, password2} = req.body;
        if(!name || !email || !password) {
            return next(new HttpError('Fill in all fields', 422))
        }

        // Chages email to lowercase for convenience
        const newEmail = email.toLowerCase();

        // * Ip Blocking Implemented Here
        try {
            await limiterSlowBruteByIP.consume(ipAddress);
        } catch (ipBlocked) {
            console.warn('Shadow Ban: IP Blocked', { IP: ipAddress, info: ipBlocked });
            await sleep(SHADOW_DELAY_BLOCKED);
            return next(new HttpError('Too many requests, try again later', 429));
        }


        // Check if Email Exists within Database
        const emailExists = await User.findOne({email: newEmail})
        if(emailExists) {
            try {
                await limiterSlowBruteByIP.consume(ipAddress);
            } catch (ipBlocked) {
                console.warn('Shadow Ban: IP Blocked', { IP: ipAddress, info: ipBlocked });
                await sleep(SHADOW_DELAY_BLOCKED);
                return next(new HttpError('Too many requests, try again later', 429));
            }
    
            return next(new HttpError('Email Already Exists!', 422))
        }

        // Checking Password Length
        if((password.trim()).length < 8) {
            return next(new HttpError('Password should at least be 8 characters!', 422))
        }

        if(password != password2) {
            return next(new HttpError('Passwords do not match!', 422))
        }
        
        // * Password Hashing occurs here
        const prehashedPassword = prehashPassword(password);
        const hashedPass = await hashWithCurrentPepper(prehashedPassword, argonOptions)

        // Assign a default avatar so users who don't upload one don't show 'undefined'
        const DEFAULT_AVATAR = 'thumbnail-default.png'
        const newUser = await User.create({
            name,
            email: newEmail,
            password: hashedPass,
            avatar: DEFAULT_AVATAR,
            pepperVersion: pepperVersions.CURRENT,
            ipAddress: [{ ip: ipAddress, lastSeen: Date.now() }]
        });
        await sendEmail(
            newUser.email,
            'New User Notification',
            `<h4>Mern Blog Welcomes You!</h4>
             <p>Welcome to Mern Blog!</p>
             <p>We are so happy to have you here!</p>`
        );
    // Do not leak password hash in response — return a safe user object
    const safeUser = { ...newUser._doc }
    delete safeUser.password

    return res.status(201).json({ message: `New User ${newUser.name} registered successfully!`, user: safeUser })

    } catch (error) {
        console.log('Registration Error:', error)
        return next(new HttpError('User registration failed!', 422))
    }

}













// * ==================== LOGIN REGISTERED USER
// * POST: api/users/login
// * UNPROTECTED
const loginUser = async (req, res, next) => {
    const currentIP = (req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || '127.0.0.1').trim();
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return next(new HttpError('Fill in all fields', 422));
        }

        const emailKey = email.toLowerCase();
        
        // Only apply rate limiting for non-whitelisted IPs
        if (!isIpWhitelisted(currentIP)) {
            try {
                await consumeIfNotWhitelisted(currentIP);
            } catch (ipBlocked) {
                console.warn('Shadow Ban: IP Blocked', { IP: currentIP, info: ipBlocked });
                await sleep(SHADOW_DELAY_BLOCKED);
                return next(new HttpError('Too many requests, try again later', 429));
            }
        }

        const user = await User.findOne({ email: emailKey });
        if (!user) {
            await sleep(SHADOW_DELAY_FAILED);
            return next(new HttpError('Invalid Credentials!', 422));
        }

        // Password check
        const prehashedPassword = prehashPassword(password);
        const matchedPepper = await verifyPasswordWithPeppers(user.password, prehashedPassword, user.pepperVersion);
        
        if (matchedPepper) {
            // If logged in with old pepper, update to current
            if (matchedPepper !== CURRENT_PEPPER) {
                const newHash = await hashWithCurrentPepper(prehashedPassword, argonOptionsStrong);
                user.password = newHash;
                user.pepperVersion = pepperVersions.CURRENT;
                user.lastPasswordRehash = new Date();
                await user.save();
            }
        } else {
            user.failedLogins = (user.failedLogins || 0) + 1;
            await user.save();

            // ! Only send security emails for non-whitelisted IPs
            if (!isIpWhitelisted(currentIP) && user.failedLogins >= failedLogin) {
                try {
                    await sendEmail(
                        user.email,
                        'Suspicious Login Attempt Detected!',
                        `<div style="font-family: Arial, sans-serif; background: #f8f8f8; padding: 20px; border-radius: 10px; color: #333;">
                            <div style="margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); padding: 20px; ">
                            <h2 style="color: #d32f2f; text-align: center;">Suspicious Login Attempt Detected</h2>
                            <p>Hello <strong>${user.name}</strong>,</p>
                            <p>Someone tried to log in to your account multiple times from IP: 
                                <span style="font-weight:bold; color:#1565c0;">${currentIP}</span>.
                            </p>
                            <p>If this wasn't you, we recommend you change your password immediately.</p>
                            <hr style="border:none; margin:20px 0;">
                            <a href="${siteLink}/forgotPassword" style="color:#fff; text-decoration:none; background: #000; font-weight:bold; padding: 1rem;">Change your password here.</a>
                            <hr style="border:none; margin:50px 0;">
                            <p style="font-size: 12px; color: #888; text-align: center;">
                                This is an automated security alert from <strong>MERnBlog Security</strong>. Please do not reply.
                            </p>
                            </div>
                        </div>`
                    );
                    user.failedLogins = 0;
                    await user.save();
                } catch (err) {
                    console.error('Failed to send alert email:', err);
                }
            }

            await sleep(SHADOW_DELAY_FAILED);
            return next(new HttpError(`Invalid Credentials!`, 401));
        }

        // * Successful login
        user.failedLogins = 0;

        //* Check if password needs rehash
        try {
            //* Rehash if:
            //* 1) password was verified with an old pepper, or
            //* 2) argon2 reports needsRehash, or
            //* 3) monthly rotation period reached
            const pepperMismatch = (matchedPepper !== CURRENT_PEPPER);
            const argonNeeds = await needsRehash(user.password);
            const monthlyNeeds = needsMonthlyRehash(user.lastPasswordRehash);

            if (pepperMismatch || argonNeeds || monthlyNeeds) {
                console.log('Updating password hash (pepper/params rotation).', { pepperMismatch, argonNeeds, monthlyNeeds });
                const newHash = await hashWithCurrentPepper(prehashedPassword, argonOptionsStrong);
                user.password = newHash;
                user.lastPasswordRehash = new Date();
            }
        } catch (rehashError) {
            console.error('Password rehash failed', rehashError);
        }

        // Update IP addresses
        const existingIP = user.ipAddress.find(entry => entry.ip === currentIP);
        if (!existingIP) {
            user.ipAddress.push({ ip: currentIP, lastSeen: new Date() });
        } else {
            existingIP.lastSeen = new Date();
        }

        await user.save();

        // Clear rate limiter for successful login
        if (!isIpWhitelisted(currentIP)) {
            await limiterSlowBruteByIP.delete(currentIP);
        }

        // Issue JWT token
        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: '6h' });

        const posts = user.posts
        res.status(200).json({ token, id, name, posts });
    } catch (error) {
        console.error('Login error:', error);
        return next(new HttpError('Account could not be found!', 422));
    }
};











//  * ==================== USER PROFILE
//  * POST: api/users/:id
//  * PROTECTED
const getUser = async (req, res, next) => {
    // res.json("User Profile")
    try {
        const {id} = req.params;
        const user = await User.findById(id).select('-password')
        if(!user) {
            return next(new HttpError("User not found", 404))
        } 
        res.status(200).json(user)
    } catch (error) {
        return next(new HttpError(error))
    }
}













// * ==================== CHANGE AVATAR
// * POST: api/users/change-avatar
// * PROTECTED
const changeAvatar = async (req, res, next) => {
    // res.json("Change User Avatar")
    try {
        // res.json(req.files)
        // console.log(req.files)

        if(!req.files.avatar) {
            return next(new HttpError('No Image was uploaded!', 422))
        }

        // * Find User From Database
        const user = await User.findById(req.user.id)
        // * delete old avatar is it exists 
        if(user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if(err) {
                    return next(new HttpError(err))
                }
            })
        }

        const {avatar} = req.files;
        // * Check file size
        if(avatar.size > avatarSizeBytes) {
            // ? High file size may increase the time it takes an image to load
            return next(new HttpError(`File size exceeds ${avatarSizeMb}`, 422))
        }   
        
        let fileName
        fileName = avatar.name
        let splittedFilename = fileName.split('.') 
        let newFileName = 'avatar-' + uuid() + '.' + splittedFilename[splittedFilename.length - 1]
        avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if(err) {
                return next(new HttpError(err))
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, {avatar: newFileName}, {new: true})
            if(!updatedAvatar) {
                return next(new HttpError('Avatar could not be changed', 422))
            }
            res.status(200).json(updatedAvatar)
        })

    } catch (error) {
        return next(new HttpError(error))
    }
}












// * ==================== EDIT USER DETAILS (From Profile)
// * POST: api/users/edit-user
// * PROTECTED
const editUser = async (req, res, next) => {
    try {
        const {name, email, about, currentPassword, newPassword, confirmNewPassword} = req.body;
        if (!currentPassword) {
            return next(new HttpError('Current Password Required for Account Update', 422))
        }

        // fetch user from database
        const user = await User.findById(req.user.id)
        if(!user) return next(new HttpError('User not found', 403))

        const updatedName = name.trim() || user.name
        const updatedEmail = email.trim() || user.email
        const updatedAbout = about.trim() || user.about

        // compare current password to password stored in db
        const prehashedCurrentPassword = prehashPassword(currentPassword);
        const matchedPepperForCurrent = await verifyPasswordWithPeppers(user.password, prehashedCurrentPassword);
        if (!matchedPepperForCurrent) {
            return next(new HttpError('Current Password is Invalid.', 422))
        }

        // hash password
        let hashedPassword = user.password;
        let passwordWasUpdated = false;
        if (newPassword) {
            if (newPassword !== confirmNewPassword) {
                return next(new HttpError('New passwords do not match.', 422));
            }
            const prehashedNewPassword = prehashPassword(newPassword);
            if (await verifyPasswordWithPeppers(user.password, prehashedNewPassword)) {
                return next(new HttpError('Cannot reuse current password.', 422));
            }
            hashedPassword = await hashWithCurrentPepper(prehashedNewPassword, argonOptions);
            passwordWasUpdated = true;
        }

        const updateObj = { name: updatedName, email: updatedEmail, about: updatedAbout };
        if (passwordWasUpdated) {
            updateObj.password = hashedPassword;
            updateObj.lastPasswordRehash = new Date(); // keep monthly rehash tracking accurate
        }
        const newInfo = await User.findByIdAndUpdate(req.user.id, updateObj, { new: true });
        res.status(200).json(`User ${newInfo.id} successfully updated!`)
    } catch (error) {
       return next(new HttpError(error)) 
    }  
}










// * ==================== Get Authors
// * POST: api/users/authors
// * UNPROTECTED
const getAuthors = async (req, res, next) => {
    // res.json("Get All User/Author Profiles")
    try {
        const authors = await User.find().select('-password')
        res.json(authors)
    } catch (error) {
        return next(new HttpError(error))
    }
}












export {registerUser, loginUser, getUser, changeAvatar, editUser, getAuthors}



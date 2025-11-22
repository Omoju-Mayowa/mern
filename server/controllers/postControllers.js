import Post from '../models/postModel.js'
import User from '../models/userModel.js'

import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'

import { HttpError } from '../models/errorModel.js'
import __dirname from '../utils/directory.js'

// Thumbnail Size Variables
const thumbnailSizeBytes = 1073741824; // Currently 1GB
const thumbnailSizeMb = (thumbnailSizeBytes / ( 1024 * 1024 )).toFixed(2) + 'MB'


// * ==================== CREATE POST
// * POST: api/posts
// * PROTECTED
const createPost = async (req, res, next) => {
    try {
        // To Prevent Empty inputs
        const {title, category, description} = req.body
        if(!title || !category || !description || !req.files) {
            return next(new HttpError("Fill in all Fields and choose thumbnail", 422))
        }

        const {thumbnail} = req.files
        // check thumbnail size
        if (thumbnail.size > thumbnailSizeBytes) {
            return next(new HttpError(`Thumbnail too big. File should be less than ${thumbnailSizeMb}`), 413)
        }

        let fileName = thumbnail.name
        let splittedFilename = fileName.split('.')
        let newFileName = 'thumbnail-' + uuid() + '.' + splittedFilename[splittedFilename.length - 1]
        
        const moveFile = (file, destination) => {
            return new Promise((resolve, reject) => {
                file.mv(destination, (err) => {
                    if (err) reject(err)
                    else resolve()
                })
            })

        }

        await moveFile(thumbnail, path.join(__dirname, '..', 'uploads', newFileName))

        const newPost = await Post.create({title, category, description, thumbnail: newFileName, creator: req.user.id})

        if(!newPost) {
            return next(new HttpError("Post couldn't be created"), 422)
        }

        const currentUser = await User.findById(req.user.id)

        const userPostCount = currentUser.posts + 1

        await User.findByIdAndUpdate(req.user.id, {posts: userPostCount})

        res.status(200).json(newPost)        

    } catch (error) {
        return next(new HttpError(error))
    }
}

// * ==================== GET ALL POSTS
// * GET: api/posts
// * UNPROTECTED
const getPosts = async (req, res, next) => {
    try {
        const posts = await Post.find().sort({updatedAt: -1})
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}

// * ==================== GET SINGLE POST
// * GET: api/posts/:id
// * UNPROTECTED
const getPost = async (req, res, next) => {
    try {
        const postId = req.params.id
        const post = await Post.findById(postId)
        if(!post) {
            return next(new HttpError('Post not found'), 404)
        }
        res.status(200).json(post)
    } catch (err) {
        return next(new HttpError(err))
    }
}

// * ==================== GET POSTS BY category
// * GET: api/posts
// * UNPROTECTED
const getcategoryPosts = async (req, res, next) => {
    try {
        const {category} = req.params
        const catPosts = await Post.find( {category} ).sort( {createdAt: -1} )
        res.status(200).json(catPosts)
    } catch (error) {
        return next(new HttpError(error))
    }
}

// * ==================== GET AUTHOR POSTS
// * GET: api/posts/users/:id
// * UNPROTECTED
const getUserPosts = async (req, res, next) => {
    try {
        const {id} = req.params
        const posts = await Post.find( {creator: id} ).sort( {createdAt: -1} )
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError(error))
    }
}

// * ==================== EDIT POST
// * PATCH: api/posts/:id
// * PROTECTED
const editPost = async (req, res, next) => {
    try {
        let fileName
        let newFileName
        let updatedPost
        const postId = req.params.id
        let {title, category, description} = req.body
        
        // by default react quill has paragraph openong and closing tag with a break tag in between, so it has 11 characters by default
        if(!title || !category || !description < 0) {
            return next(new HttpError("Fill in all Fields", 422))
        }
        if(!req.files) {
            updatedPost = await Post.findByIdAndUpdate(postId, {title, category, description}, {new: true})
        }   
        else {
            // grab old post from db
            const oldPost = await Post.findById(postId)
            // delete old thumbnail and post new one
            if(req.user.id.toString() === post.creator.toString()) {
                fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
                    if(err) {
                        return next(new HttpError('Something went wrong, please try again', 500))
                    }
                })
                // upload new thumbnail
                const {thumbnail} = req.files
                if(thumbnail > thumbnailSizeBytes) {
                    return next(new HttpError(`Thumbnail too big. File should be less than ${thumbnailSizeMb}`), 413)
                }

                fileName = thumbnail.name
                let splittedFilename = fileName.split('.')
                newFileName = 'thumbnail-' + uuid() + '.' + splittedFilename[splittedFilename.length - 1]
                const moveFile = (file, destination) => {
                    return new Promise((resolve, reject) => {
                        file.mv(destination, (err) => {
                            if (err) reject(err)
                            else resolve()
                        })
                    })

                }
                await moveFile(thumbnail, path.join(__dirname, '..', 'uploads', newFileName))
                updatedPost = await Post.findByIdAndUpdate(postId, {title, category, description, thumbnail: newFileName, creator: req.user.id}, {new: true})
            }   else {
                return next(new HttpError('You are not authorized to update this post', 403))
            }
        }    
        if(!updatedPost) {
            return next(new HttpError("Post couldn't be updated"), 422)
        }

        res.status(200).json(updatedPost)
    } catch (error) {
        return next(new HttpError(error))
    }
}

// * ==================== DELETE POST
// * DELETE: api/posts/:id
// * PROTECTED
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id
        if(!postId) {
            return next(new HttpError('Post Unavailable.', 400))
        }
        const post = await Post.findById(postId)
        
        // Add this check
        if(!post) {
            return next(new HttpError('Post not found.', 404))
        }
        
        const fileName = post.thumbnail
        if(req.user.id.toString() === post.creator.toString()) {
            // delete thumbnails from uploads folder
            fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
                if(err) {
                    return next(new HttpError('Something went wrong, please try again', 500))
                }
                else {
                    await Post.findByIdAndDelete(postId)
                    // Reduce User Post Count by 1
                    const currentUser = await User.findById(req.user.id)
                    const userPostCount = currentUser?.posts - 1
                    await User.findByIdAndUpdate(req.user.id, {posts: userPostCount})
                }
            })

            res.status(200).json(`Post ${postId} deleted successfully`)
        }   else {
            return next(new HttpError("You are not authorized to delete this post", 403))
        }
    } catch (error) {
        return next(new HttpError(error))
    }
}

export { createPost, getPosts, getPost, getcategoryPosts, getUserPosts, editPost, deletePost }
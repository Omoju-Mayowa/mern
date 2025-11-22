import React, { useState, useEffect, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Avatar from './images/avatar15.jpg'
import { FaEdit } from 'react-icons/fa'
import { FaCheck } from 'react-icons/fa'
import { UserContext } from './components/context/userContext'


const scrollTop = () => {
  window.scrollTo(0, 0);
}

const UserProfile = () => {
  const [avatar, setAvatar] = useState(Avatar)
  const[name, setName] = useState('')
  const[email, setEmail] = useState('')
  const[about, setAbout] = useState('')
  const[currentpassword, setCurrentpassword] = useState('')
  const[newpassword, setNewpassword] = useState('')
  const[confirmNewpassword, setConfirmNewpassword] = useState('')


  const navigate = useNavigate()
    
  const {currentUser} = useContext(UserContext)
  const token = currentUser?.token
    
  //redirect to login page for users who haven't logged in
  useEffect(() => {
    if(!token) {
      navigate('/login')
    }
  }, [])


  return (
    <section className="profile">
      <div className="container profile__container">
        <Link to={`/myposts/sdfsdf`} onClick={scrollTop} className="btn">My posts</Link>

        <div className="profile__details">
          <div className="avatar__wrapper">
            <div className="profile__avatar">
              <img src={ Avatar } alt="User Avatar" />
            </div>
            <form className="avatar__form">
              <input type="file" name="avatar" id="avatar" accept='png, jpg, jpeg, webp' onChange={e => setAvatar(e.target.files[0])} />
              <label htmlFor="avatar"><FaEdit /></label>
            </form>
            <button className='profile__avatar-btn'><FaCheck /></button>
          </div>

          <h1>Omoju Oluwamayowa</h1>


          <form className="form profile__form">
            <p className="form__error-message">This is an error message</p>
            <input type="text" placeholder='Full Name' value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder='Email' value={email} onChange={e => setEmail(e.target.value)} />
            <input type="text" placeholder='About You' value={about} onChange={e => setAbout(e.target.value)} />
            <input type="password" placeholder='Current Password' value={currentpassword} onChange={e => setCurrentpassword(e.target.value)} />
            <input type="password" placeholder='New Password' value={newpassword} onChange={e => setNewpassword(e.target.value)} />
            <input type="password" placeholder='Confirm New Password' value={confirmNewpassword} onChange={e => setConfirmNewpassword(e.target.value)} />
            <button type="submit" className='btn primary'>Update Details</button>
          </form>
        </div>
      </div>
    </section>
  )
}

export default UserProfile
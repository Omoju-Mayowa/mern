import React, { useContext, useEffect, useState } from 'react'
import {Link, useNavigate, useParams} from 'react-router-dom'
import PostAuthor  from './components/PostAuthor'
import { UserContext } from './components/context/userContext'
import Loader from './components/Loader'
import DeletePost from './DeletePost'
import User from '../../../server/models/userModel'
import axios from 'axios'

const scrollTop = () => {
  window.scrollTo(0, 0);
}

const PostDetail = () => {
  const {id} = useParams()
  const [post, setPost] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const {currentUser} = useContext(UserContext)



  useEffect(() => {
    const getPost = async () => {
      setIsLoading(true)
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/${id}`)
        setPost(response?.data)
      } catch (err) {
        setError(  err.response?.data?.message || err.message || 'An error occurred.' )
      }
      setIsLoading(false)
    }

    getPost()
  }, [])


  if(isLoading == true) {
    return <Loader />
  }

  const thumbnailURL = `${import.meta.env.VITE_ASSETS_URL}/uploads/${post?.thumbnail}`

  return (
    <section className="post-detail">
      {error && <p className='error'>{error}</p>}
      {post && 
        <div className="container post-detail__container">
          <div className="post-detail__header">
            <PostAuthor authorID={post?.creator} createdAt={post?.createdAt} />
            {currentUser?.id === post?.creator && 
              <div className="post-detail__buttons">
                <Link to={ `/posts/${post?._id}/edit`} onClick={scrollTop} className='btn sm primary'>Edit</Link>
                <DeletePost postId={id} />
              </div>
            }
          </div>
          <h1>{post?.title}</h1>
          <div className="post-detail__thumbnail">
            <img src={thumbnailURL} />
          </div>
          <p dangerouslySetInnerHTML={{__html: post?.description}}></p>
        </div>
      }
    </section>
  )
}

export default PostDetail
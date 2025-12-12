import React, { useEffect, useState } from 'react'
import { DUMMY_POSTS } from './data'
import PostItem from './components/PostItem'
import axios from 'axios'
import Loader from './components/Loader'
import { useParams } from 'react-router-dom'

const AuthorPosts = () => {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const {id} = useParams()

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts/users/${id}`)
        setPosts(response?.data)
      } catch (err) {
        console.log(err)
      }

      setIsLoading(false)
    }

    fetchPosts()
  }, [id])


  if(isLoading) {
    return <Loader />
  }

  return (
    <section className="posts">
        {posts.length > 0 ? <div className="container posts__container">
        {
            posts.map((post) => (
              <PostItem
                key={post._id || post.id}
                postID={post._id || post.id}
                thumbnail={post.thumbnail}
                category={post.category}
                title={post.title}
                description={post.description}
                authorID={post.creator || post.authorID}
                createdAt={post.createdAt}
              />
            ))
        }
        </div> : <h2 className='center'>No posts found</h2>}
    </section>
  )
}

export default AuthorPosts
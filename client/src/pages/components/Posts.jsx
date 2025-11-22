import React, { useEffect, useState } from 'react'

import PostItem from './PostItem'
import Loader from './Loader'
import axios from 'axios'

const Posts = () => {
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true)
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/posts`)
        setPosts(response?.data)
      } catch (err) {
        console.log(err)
      }

      setIsLoading(false)
    }

    fetchPosts()
  }, [])

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

export default Posts
import React, { useState } from 'react'
import { DUMMY_POSTS } from './data'
import PostItem from './components/PostItem'

const CategoryPosts = () => {
  const [posts, setPosts] = useState(DUMMY_POSTS)

  return (
    <section className="posts category__posts">
      {posts.length > 0 ? (
        <div className="container posts__container category-posts__container">
          {posts.map(({ id, thumbnail, category, title, desc, authorID }) => (
            <PostItem
              key={id}
              postID={id}
              thumbnail={thumbnail}
              category={category}
              title={title}
              description={desc}
              authorID={authorID}
            />
          ))}
        </div>
      ) : (
        <h2 className="center">No posts found</h2>
      )}
    </section>
  )
}

export default CategoryPosts

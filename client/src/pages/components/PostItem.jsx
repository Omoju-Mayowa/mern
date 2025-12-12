import React from 'react'
import { Link } from 'react-router-dom'
import PostAuthor  from './PostAuthor'

const scrollTop = () => {
  window.scrollTo(0, 0);
}

const PostItem = ({postID, category, title, description, authorID, thumbnail, createdAt}) => {
  // ? Shorter Description of post in order to prevent too much use of screen space
  const shortDescription = description.length > 145 ? description.substr(0, 145) + '...' : description;
  // ? Shorter Post Title
  const postTitle = title.length > 60 ? title.substr(0, 60) + '...' : title;
  // ? ImageUrl for thumbnail for easy editing
  const imageUrl = `${import.meta.env.VITE_ASSETS_URL}/uploads/${thumbnail}`;
  
  // console.log('Image URL:', imageUrl, 'Thumbnail:', thumbnail);
  
  // *
  return (
    <article className="post">
      <div className="post__thumbnail">
        <img src={imageUrl} alt={title} />
      </div>
      <div className="post__content">
      <Link to={`/posts/${postID}`} onClick={scrollTop}>
        <h3>{postTitle}</h3>
        <p>{shortDescription}</p>
      </Link>
      <div className="post__footer">
        <PostAuthor authorID={authorID} createdAt={createdAt} />
        <Link className='btn category' onClick={scrollTop} to={`/posts/categories/${category}`}>{category}</Link>
      </div>
      </div>
    </article>
  )
}

export default PostItem

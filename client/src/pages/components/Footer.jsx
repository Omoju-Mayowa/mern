import React from 'react'
import { Link } from 'react-router-dom'

const scrollTop = () => {
  window.scrollTo(0, 0);
}

const Footer = () => {
  return (
    <footer>
      <ul className="footer__categories">
        <li><Link onClick={scrollTop} to="/posts/categories/Agriculture">Agriculture</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Business">Business</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Education">Education</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Entertainment">Entertainment</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Art">Art</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Investment">Investment</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Uncategorized">Uncategorized</Link></li>
        <li><Link onClick={scrollTop} to="/posts/categories/Weather">Weather</Link></li>
      </ul>

      <div className="footer__copyright">
        <small>All Rights Reserved &copy; Copyright, BlogBook Studio.</small>
      </div>
    </footer>
  )
}

export default Footer
import {Router} from 'express'

import { createPost, getPosts, getPost, getcategoryPosts, getUserPosts, editPost, deletePost } from '../controllers/postControllers.js'
import verifyToken from '../middleware/authMiddleware.js'


const router = Router()

router.post('/', verifyToken, createPost)   
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getcategoryPosts)
router.get('/users/:id', getUserPosts)
router.patch('/:id', verifyToken, editPost)
router.delete('/:id', verifyToken, deletePost)

export default router
// 📁 routes/postsRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getPosts,
  addPost,
  getPostsByTopicId,
  deletePost
} = require('../controllers/postsController');

// 📌 Get all posts
router.get('/', getPosts);

// 🔐 Protected route to add a post
router.post('/add', authenticate, addPost);

// 📌 Get posts by topicId
router.get('/:topicId', getPostsByTopicId);

// 🗑️ Protected route to delete a post (auteur ou admin/modérateur)
router.delete('/:id', authenticate, deletePost);

module.exports = router;

// File: routes/topicsRoutes.js
const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getTopics,
  addTopic,
  getTopicById,
  deleteTopic
} = require('../controllers/topicsController');

// 📌 Get all topics
router.get('/', getTopics);

// 🔐 Protected route to add a topic
router.post('/', authenticate, addTopic);

// 📌 Get a topic
router.get('/:id', getTopicById);

// 🗑️ Protected route to delete a topic (auteur ou admin/modérateur)
router.delete('/:id', authenticate, deleteTopic);

module.exports = router;

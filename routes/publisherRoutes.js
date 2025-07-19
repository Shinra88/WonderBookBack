const express = require('express');
const router = express.Router();
const { getAllPublishers } = require('../controllers/publisherController');

// 📘 Public route
router.get('/', getAllPublishers);

module.exports = router;

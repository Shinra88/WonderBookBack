const express = require('express');
const router = express.Router();
const { getAllPublishers } = require('../controllers/publisherController');

// 📘 Route publique
router.get('/', getAllPublishers);

module.exports = router;

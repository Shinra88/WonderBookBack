// File: routes/uploadS3.js
const express = require('express');
const multer = require('multer');
const resizeAndConvert = require('../middleware/resizeAndConvert');
const authenticate = require('../middleware/authenticate');
const { updateAvatar, uploadCover, uploadEbook } = require('../controllers/uploadController');

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Route to update a user avatar
router.put('/update-avatar', upload.single('file'), resizeAndConvert, updateAvatar);

// ✅ Route to upload a book cover
router.post('/cover', upload.single('file'), resizeAndConvert, uploadCover);

// ✅ Route to upload an ebook
router.put('/ebook', authenticate, upload.single('file'), uploadEbook);

module.exports = router;

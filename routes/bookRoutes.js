// Book routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');
const resizeAndConvert = require('../middleware/resizeAndConvert');
const bookController = require('../controllers/bookController');

const {
  getAllBooks,
  getBestRatedBooks,
  getLastAddedBooks,
  addBook,
  getBookByTitle,
  getMinYear,
  updateBook
} = require('../controllers/bookController');

// 📘 Routes public
router.get('/', getAllBooks);
router.get('/bestrating', getBestRatedBooks);
router.get('/lastadded', getLastAddedBooks);
router.get('/title/:title', getBookByTitle);
router.get('/minyear', getMinYear);

// 🔐 Protected route to add a book
router.post('/', authenticate, addBook);

// 🔐 Protected route to update a book (admin only)
router.put(
  '/:id/cover',
  authenticate,
  authorizeRoles('admin'),
  upload.single('cover'),
  resizeAndConvert,
  bookController.updateBookCover
);

// 🔐 Protected route to update book info (admin / moderator only)
router.put('/:id', authenticate, authorizeRoles('admin', 'moderator'), updateBook);

module.exports = router;

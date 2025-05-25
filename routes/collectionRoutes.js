// routes/collectionRoutes.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const {
  addToCollection,
  getCollection,
  removeFromCollection,
  updateReadStatus,
  getReadingProgress, 
  saveReadingProgress,
} = require("../controllers/collectionController");

// 🔒 Routes sécurisées
router.post("/add", authenticate, addToCollection);
router.get("/", authenticate, getCollection);
router.delete("/:bookId", authenticate, removeFromCollection);
router.patch('/:bookId', authenticate, updateReadStatus);
router.get('/progress/:bookId', authenticate, getReadingProgress);
router.post('/progress/:bookId', authenticate, saveReadingProgress);

module.exports = router;

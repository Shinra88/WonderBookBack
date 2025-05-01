// routes/collectionRoutes.js
const express = require("express");
const router = express.Router();

const authenticate = require("../middleware/authenticate");
const {
  addToCollection,
  getCollection,
  removeFromCollection,
  updateReadStatus,
} = require("../controllers/collectionController");

// 🔒 Routes sécurisées
router.post("/add", authenticate, addToCollection);
router.get("/", authenticate, getCollection);
router.delete("/:bookId", authenticate, removeFromCollection);
router.patch('/:bookId', authenticate, updateReadStatus);

module.exports = router;

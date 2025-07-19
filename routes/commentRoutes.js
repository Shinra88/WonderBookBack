// 📁 routes/commentRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorizeRoles = require("../middleware/authorizeRoles");
const {
  getCommentsByBook,
  addOrUpdateComment,
  deleteComment,
} = require("../controllers/commentController");

// 📚 Retrieve all comments for a book (Public)
router.get("/:bookId", getCommentsByBook);

// ✏️ Add or update a comment (Authenticated)
router.post("/:bookId", authenticate, addOrUpdateComment);

// ❌ Delete your own comment (Connected)
router.delete("/:bookId", authenticate, deleteComment);

// ❌ Delete a comment (Admin or Moderator)
router.delete("/admin/:bookId", authenticate, authorizeRoles('admin', 'moderator'), deleteComment);

module.exports = router;

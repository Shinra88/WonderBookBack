// 📁 routes/commentRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const {
  getCommentsByBook,
  addOrUpdateComment,
  deleteComment,
} = require("../controllers/commentController");

// 📚 Récupérer tous les commentaires d'un livre (Public)
router.get("/:bookId", getCommentsByBook);

// ✏️ Ajouter ou modifier un commentaire (Connecté)
router.post("/:bookId", authenticate, addOrUpdateComment);

// ❌ Supprimer son propre commentaire (Connecté)
router.delete("/:bookId", authenticate, deleteComment);

module.exports = router;

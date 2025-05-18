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

// 📚 Récupérer tous les commentaires d'un livre (Public)
router.get("/:bookId", getCommentsByBook);

// ✏️ Ajouter ou modifier un commentaire (Connecté)
router.post("/:bookId", authenticate, addOrUpdateComment);

// ❌ Supprimer son propre commentaire (Connecté)
router.delete("/:bookId", authenticate, deleteComment);

// ❌ Supprimer un commentaire (Admin ou Modérateur)
router.delete("/admin/:bookId", authenticate, authorizeRoles('admin', 'moderator'), deleteComment);

module.exports = router;

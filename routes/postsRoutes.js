// 📁 routes/postsRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorizeRoles = require("../middleware/authorizeRoles");
const { getPosts, addPost, getPostsByTopicId, deletePostById } = require("../controllers/postsController");

// 📌 Obtenir tous les posts
router.get("/", getPosts);

// 🔐 Route protégée pour Ajouter un post
router.post("/add", authenticate, addPost);

// 📌 Obtenir les posts par topicId
router.get("/:topicId", getPostsByTopicId);

// 🔐 Route protégée pour supprimer un post
router.delete("/:id", authenticate, authorizeRoles("admin", "moderator"), deletePostById);

module.exports = router;

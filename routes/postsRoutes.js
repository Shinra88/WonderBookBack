// 📁 routes/postsRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { getPosts, addPost, getPostsByTopicId  } = require("../controllers/postsController");

// 📌 Obtenir tous les posts
router.get("/", getPosts);

// 🔐 Route protégée pour Ajouter un post
router.post("/add", authenticate, addPost);

// 📌 Obtenir les posts par topicId
router.get("/:topicId", getPostsByTopicId);

module.exports = router;

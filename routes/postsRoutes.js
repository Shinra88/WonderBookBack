const express = require("express");
const router = express.Router();
const { getPosts, addPost } = require("../controllers/postsController");

// 📌 Obtenir tous les posts
router.get("/", getPosts);

// 📌 Ajouter un post
router.post("/add", addPost);

module.exports = router;

// File: routes/topicsRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const { getTopics, addTopic, getTopicById } = require("../controllers/topicsController");
// 📌 Obtenir tous les topics
router.get("/", getTopics);

// 🔐 Route protégée pour ajouter un topic
router.post("/", authenticate, addTopic);

// 📌 Obtenir un topic 
router.get("/:id", getTopicById);

module.exports = router;

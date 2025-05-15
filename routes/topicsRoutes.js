// File: routes/topicsRoutes.js
const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/authenticate");
const authorizeRoles = require("../middleware/authorizeRoles");
const { getTopics, addTopic, getTopicById, toggleTopicNotice, deleteTopic, toggleLockTopic } = require("../controllers/topicsController");
// 📌 Obtenir tous les topics
router.get("/", getTopics);

// 🔐 Route protégée pour ajouter un topic
router.post("/", authenticate, addTopic);

// 📌 Obtenir un topic 
router.get("/:id", getTopicById);

// 🔐 Route protégée pour épingler ou désépingler un topic
router.patch("/:id/pin", authenticate, authorizeRoles("admin", "moderator"), toggleTopicNotice);

// 🔐 Route protégée pour supprimer un topic
router.delete("/:id", authenticate, authorizeRoles("admin", "moderator"), deleteTopic);

// 🔐 Route (dé)bloqué un topic
router.patch("/:id/lock", authenticate, authorizeRoles("admin", "moderator"), toggleLockTopic);


module.exports = router;

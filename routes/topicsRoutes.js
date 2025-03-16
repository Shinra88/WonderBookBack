const express = require("express");
const router = express.Router();
const { getTopics } = require("../controllers/topicsController");

// 📌 Obtenir tous les topics
router.get("/", async (req, res) => {
    try {
        const db = req.app.locals.mongoDB; // 🔥 Récupère la base Mongo
        const topics = await db.collection("topics").find().toArray(); // 🔥 Récupère les topics
        res.json(topics);
    } catch (error) {
        console.error("❌ Erreur MongoDB :", error);
        res.status(500).json({ error: "Erreur interne" });
    }
});

// 📌 Ajouter un topic
router.post("/add", async (req, res) => {
    const { title, author, content } = req.body;

    if (!title || !author || !content) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
        const db = req.app.locals.mongoDB;
        const result = await db.collection("topics").insertOne({
            title,
            author,
            content,
            created_at: new Date()
        });

        res.status(201).json({ message: "Topic ajouté", id: result.insertedId });
    } catch (error) {
        console.error("❌ Erreur MongoDB :", error);
        res.status(500).json({ error: "Erreur interne" });
    }
});

module.exports = router;

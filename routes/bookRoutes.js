const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// 📌 Route pour récupérer tous les livres
router.get("/", async (req, res) => {
    try {
        const books = await prisma.books.findMany();
        res.json(books);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des livres." });
    }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// 📌 Route pour récupérer les commentaires d'un livre
router.get("/:bookId", async (req, res) => {
    try {
        const { bookId } = req.params;
        const comments = await prisma.comments.findMany({
            where: { bookId: parseInt(bookId) }
        });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la récupération des commentaires." });
    }
});

module.exports = router;

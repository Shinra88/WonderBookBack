const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// 📌 Route pour récupérer tous les livres
router.get("/", async (req, res) => {
    try {
        const books = await prisma.books.findMany({
            select: {
                bookId: true,
                title: true,
                author: true,
                date: true,
                editor: true,
                cover_url: true,
                ratings: {
                    select: {
                        userId: true,
                        score: true
                    }
                }
            }
        });

        console.log("📌 Livres récupérés avant transformation :", books);

        const formattedBooks = books.map(book => ({
            bookId: book.bookId,
            title: book.title || "Titre inconnu",
            author: book.author || "Auteur inconnu",
            date: book.date || null,
            editor: book.editor || "Éditeur inconnu",
            cover_url: book.cover_url || "",
            averageRating: book.ratings.length
                ? book.ratings.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / book.ratings.length
                : 0,
            ratings: book.ratings.map(rating => ({
                userId: Number(rating.userId),
                score: Number(rating.score),
            })),
        }));

        console.log("📌 Livres formatés :", formattedBooks);
        res.json(formattedBooks);
    } catch (error) {
        console.error("🚨 Erreur dans GET /books :", error);
        res.status(500).json({ error: "Erreur lors de la récupération des livres." });
    }
});

// 📌 Route pour récupérer les livres les mieux notés
router.get("/bestrating", async (req, res) => {
    try {
        const books = await prisma.books.findMany({
            select: {
                bookId: true,
                title: true,
                author: true,
                date: true,
                editor: true,
                cover_url: true,
                ratings: {
                    select: {
                        userId: true,
                        score: true
                    }
                }
            }
        });

        console.log("📌 Livres récupérés pour /bestrating :", books);

        const sortedBooks = books.map(book => ({
            bookId: book.bookId,
            title: book.title || "Titre inconnu",
            author: book.author || "Auteur inconnu",
            date: book.date || null,         
            editor: book.editor || "Éditeur inconnu",
            cover_url: book.cover_url || "",
            averageRating: book.ratings.length
                ? book.ratings.reduce((acc, r) => acc + (Number(r.score) || 0), 0) / book.ratings.length
                : 0,
            ratings: book.ratings.map(rating => ({
                userId: Number(rating.userId),
                score: Number(rating.score),
            })),
        }))
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5);

        console.log("📌 Livres triés pour /bestrating :", sortedBooks);
        res.json(sortedBooks);
    } catch (error) {
        console.error("🚨 Erreur dans /bestrating :", error);
        res.status(500).json({ error: "Erreur lors de la récupération des livres les mieux notés." });
    }
});

module.exports = router;

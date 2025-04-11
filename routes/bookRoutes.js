// 📌 bookRoutes.js
const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
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
        rating: true,
      }
    });

    const formattedBooks = books.map(book => ({
      bookId: book.bookId,
      title: book.title || "Titre inconnu",
      author: book.author || "Auteur inconnu",
      date: book.date || null,
      editor: book.editor || "Éditeur inconnu",
      cover_url: book.cover_url || "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp",
      averageRating: book.rating || 0,
    }));

    res.json(formattedBooks);
  } catch (error) {
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
        rating: true
      }
    });

    const sortedBooks = books.map(book => ({
      bookId: book.bookId,
      title: book.title || "Titre inconnu",
      author: book.author || "Auteur inconnu",
      date: book.date || null,         
      editor: book.editor || "Éditeur inconnu",
      cover_url: book.cover_url || "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp",
      averageRating: book.rating || 0,
    }))
    .sort((a, b) => b.averageRating - a.averageRating)
    .slice(0, 5);

    res.json(sortedBooks);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des livres les mieux notés." });
  }
});

// 📌 Route pour récupérer les derniers livres ajoutés
router.get("/lastadded", async (req, res) => {
  try {
    const books = await prisma.books.findMany({
      select: {
        bookId: true,
        title: true,
        author: true,
        date: true,
        editor: true,
        cover_url: true,
        rating: true,
      },
      orderBy: {
        created_at: 'desc'
      },
      take: 5
    });

    const formattedBooks = books.map(book => ({
      bookId: book.bookId,
      title: book.title || "Titre inconnu",
      author: book.author || "Auteur inconnu",
      date: book.date || null,
      editor: book.editor || "Éditeur inconnu",
      cover_url: book.cover_url || "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp",  // Image par défaut
      averageRating: book.rating || 0,
    }));

    res.json(formattedBooks);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la récupération des derniers livres ajoutés." });
  }
});

/// 📌 Ajout d’un nouveau livre
router.post("/", async (req, res) => {
  const { title, author, editor, year, genres, summary, recaptchaToken, cover_url } = req.body;

  console.log("📦 Body reçu :", req.body);

  if (!title || !author || !editor || !year || !recaptchaToken) {
    return res.status(400).json({ error: "Champs requis manquants ou invalides." });
  }

  // 📌 Vérification CAPTCHA
  try {
    const captchaRes = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET,
          response: recaptchaToken,
        },
      }
    );

    if (!captchaRes.data.success) {
      return res.status(400).json({ error: "Échec de vérification reCAPTCHA." });
    }
  } catch (err) {
    console.error("❌ Erreur reCAPTCHA :", err);
    return res.status(500).json({ error: "Erreur serveur lors de la vérification reCAPTCHA." });
  }

  try {
    // 📌 Vérifie l'unicité du titre
    const existing = await prisma.books.findFirst({ where: { title } });
    if (existing) {
      return res.status(409).json({ error: "Ce titre existe déjà dans la base." });
    }

    // 📘 Création du livre
    const newBook = await prisma.books.create({
      data: {
        title,
        author: author.toUpperCase(),
        editor: editor.toUpperCase(),
        date: new Date(`${year}-01-01`),
        rating: 0,
        summary: summary || "",
        cover_url: cover_url || "", // ✅ Ajout du champ cover
      },
    });

    // 📚 Ajout des catégories
    const genresArray = Array.isArray(genres) ? genres : ['Général'];
    for (const genreName of genresArray) {
      const category = await prisma.categories.upsert({
        where: { name: genreName },
        update: {},
        create: { name: genreName },
      });

      await prisma.book_categories.create({
        data: {
          bookId: newBook.bookId,
          categoryId: category.categoryId,
        },
      });
    }

    res.status(201).json({ message: "Livre ajouté avec succès", bookId: newBook.bookId });
  } catch (error) {
    console.error("❌ Erreur lors de l’ajout du livre :", error);
    res.status(500).json({ error: "Erreur serveur lors de l’ajout du livre." });
  }
});



module.exports = router;

// 📁 controllers/bookController.js
const { PrismaClient } = require("@prisma/client");
const axios = require("axios");
const prisma = new PrismaClient();

const DEFAULT_COVER = "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp";

// ✅ Récupérer tous les livres (avec filtres)
const getAllBooks = async (req, res) => {
  const { year, start, end, categories = [], type = 'ou' } = req.query;
  console.log("📥 Requête reçue - getAllBooks :", { year, start, end, categories, type });

  const where = {};

  if (year && year.length === 4 && /^\d{4}$/.test(year)) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
    };
  }

  if (start && end && /^\d{4}$/.test(start) && /^\d{4}$/.test(end)) {
    where.date = {
      gte: new Date(`${start}-01-01`),
      lt: new Date(`${parseInt(end, 10) + 1}-01-01`),
    };
  }

  if (categories.length > 0) {
    const cats = Array.isArray(categories) ? categories : [categories];
    console.log("📚 Catégories filtrées :", cats);

    if (type === 'et') {
      where.AND = cats.map((cat) => ({
        book_categories: {
          some: {
            categories: {
              name: cat,
            },
          },
        },
      }));
    } else {
      where.book_categories = {
        some: {
          categories: {
            name: { in: cats },
          },
        },
      };
    }
  }

  console.log("🔍 Condition WHERE utilisée :", JSON.stringify(where, null, 2));

  try {
    const books = await prisma.books.findMany({
      where,
      include: {
        ratings: true,
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
      },
    });

    console.log("📚 Livres trouvés :", books.length);

    const formattedBooks = books.map((book) => ({
      bookId: book.bookId,
      title: book.title || "Titre inconnu",
      author: book.author || "Auteur inconnu",
      date: book.date || null,
      summary: book.summary || "Aucun résumé disponible.",
      categories: book.book_categories.map(bc => bc.categories.name) || [],
      editors: book.book_publishers.map(bp => bp.publishers.name) || [],
      cover_url: book.cover_url || DEFAULT_COVER,
      averageRating: Array.isArray(book.ratings) && book.ratings.length > 0
        ? book.ratings.filter(r => typeof r.score === 'number').reduce((sum, r) => sum + r.score, 0) / book.ratings.filter(r => typeof r.score === 'number').length
        : 0,
      ratings: (book.ratings || []).filter(r => typeof r.score === 'number'),
    }));

    res.json(formattedBooks);
  } catch (error) {
    console.error("❌ Erreur dans getAllBooks :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des livres." });
  }
};

// ✅ Récupérer les livres les mieux notés (avec filtres)
const getBestRatedBooks = async (req, res) => {
  const { year, start, end, categories = [], type = 'ou' } = req.query;
  console.log("📥 Requête reçue - getBestRatedBooks :", { year, start, end, categories, type });

  const where = {};

  if (year && year.length === 4 && /^\d{4}$/.test(year)) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
    };
  }

  if (start && end && /^\d{4}$/.test(start) && /^\d{4}$/.test(end)) {
    where.date = {
      gte: new Date(`${start}-01-01`),
      lt: new Date(`${parseInt(end, 10) + 1}-01-01`),
    };
  }

  const cats = Array.isArray(categories) ? categories : [categories];
  console.log("📚 Catégories utilisées :", cats);
  console.log("🔍 Condition WHERE :", JSON.stringify(where, null, 2));

  try {
    const books = await prisma.books.findMany({
      where,
      include: {
        ratings: true,
        book_categories: { include: { categories: true } },
        book_publishers: { include: { publishers: true } },
      },
    });

    console.log("📊 Nombre de livres trouvés :", books.length);

    const filteredBooks = cats.length > 0
      ? books.filter((book) => {
        const bookCategoryNames = book.book_categories.map(bc => bc.categories.name);
        return type === 'et'
          ? cats.every(cat => bookCategoryNames.includes(cat))
          : cats.some(cat => bookCategoryNames.includes(cat));
      })
      : books;

    console.log("✅ Livres filtrés après catégories :", filteredBooks.length);

    const sortedBooks = filteredBooks
      .map((book) => ({
        bookId: book.bookId,
        title: book.title || "Titre inconnu",
        author: book.author || "Auteur inconnu",
        date: book.date || null,
        editors: book.book_publishers.map(bp => bp.publishers.name) || [],
        cover_url: book.cover_url || DEFAULT_COVER,
        averageRating: Array.isArray(book.ratings) && book.ratings.length > 0
          ? book.ratings.filter(r => typeof r.score === 'number').reduce((sum, r) => sum + r.score, 0) / book.ratings.filter(r => typeof r.score === 'number').length
          : 0,
        ratings: (book.ratings || []).filter(r => typeof r.score === 'number'),
      }))
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);

    console.log("🏆 Top 5 livres :", sortedBooks.map(b => b.title));

    res.json(sortedBooks);
  } catch (error) {
    console.error("❌ Erreur lors du filtrage des livres :", error);
    res.status(500).json({ error: "Erreur lors du filtrage des livres les mieux notés." });
  }
};

// ✅ Récupérer les derniers livres ajoutés (avec filtres)
const getLastAddedBooks = async (req, res) => {
  const { year, start, end, categories = [], type = 'ou' } = req.query;
  console.log("📥 Requête reçue - getLastAddedBooks :", { year, start, end, categories, type });

  const where = {};

  if (year && year.length === 4 && /^\d{4}$/.test(year)) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
    };
  }

  if (start && end && /^\d{4}$/.test(start) && /^\d{4}$/.test(end)) {
    where.date = {
      gte: new Date(`${start}-01-01`),
      lt: new Date(`${parseInt(end, 10) + 1}-01-01`),
    };
  }

  if (categories.length > 0) {
    const cats = Array.isArray(categories) ? categories : [categories];
    console.log("📚 Catégories filtrées :", cats);

    if (type === 'et') {
      where.AND = cats.map((cat) => ({
        book_categories: {
          some: {
            categories: {
              name: cat,
            },
          },
        },
      }));
    } else {
      where.book_categories = {
        some: {
          categories: {
            name: { in: cats },
          },
        },
      };
    }
  }

  console.log("🔍 Condition WHERE utilisée :", JSON.stringify(where, null, 2));

  try {
    const books = await prisma.books.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 5,
      include: {
        ratings: true,
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
      },
    });

    console.log("🆕 Derniers livres ajoutés :", books.length);

    const formattedBooks = books.map((book) => ({
      bookId: book.bookId,
      title: book.title || "Titre inconnu",
      author: book.author || "Auteur inconnu",
      date: book.date || null,
      summary: book.summary || "Aucun résumé disponible.",
      categories: book.book_categories.map(bc => bc.categories.name) || [],
      editors: book.book_publishers.map(bp => bp.publishers.name) || [],
      cover_url: book.cover_url || DEFAULT_COVER,
      averageRating: Array.isArray(book.ratings) && book.ratings.length > 0
        ? book.ratings.filter(r => typeof r.score === 'number').reduce((sum, r) => sum + r.score, 0) / book.ratings.filter(r => typeof r.score === 'number').length
        : 0,
      ratings: (book.ratings || []).filter(r => typeof r.score === 'number'),
    }));

    res.json(formattedBooks);
  } catch (error) {
    console.error("❌ Erreur dans getLastAddedBooks :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des derniers livres ajoutés." });
  }
};

const getMinYear = async (req, res) => {
  try {
    console.log("📅 Requête reçue - getMinYear");

    const result = await prisma.books.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    console.log("🕐 Date la plus ancienne trouvée :", result?.date);

    if (!result || !result.date) {
      return res.status(404).json({ error: 'Aucun livre trouvé' });
    }

    const minYear = new Date(result.date).getFullYear();
    console.log("📆 Année minimale :", minYear);
    res.json({ minYear });
  } catch (error) {
    console.error("❌ Erreur dans getMinYear :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// ✅ addBook – version attendue avec categories [IDs] et editor [ID]
const addBook = async (req, res) => {
  console.log("📥 Requête reçue - addBook");

  const {
    title,
    author,
    year, // ex: "2005-02-03"
    summary,
    cover_url,
    categories,
    editor,
    recaptchaToken,
  } = req.body;

  // Sécurité minimale
  if (!title || !author || !year || !categories?.length || !editor?.length) {
    return res.status(400).json({ error: "Champs obligatoires manquants ou invalides." });
  }

  const parsedDate = new Date(year);
  if (isNaN(parsedDate)) {
    return res.status(400).json({ error: "Date de publication invalide." });
  }

  try {
    const newBook = await prisma.books.create({
      data: {
        title,
        author,
        date: parsedDate, // ✅ maintenant c'est une Date valide
        summary,
        cover_url,
        rating: 0,
        status: "pending",
        validated_by: null,
        book_categories: {
          create: categories.map((catId) => ({
            categoryId: catId,
          })),
        },
        book_publishers: {
          create: editor.map((pubId) => ({
            publisherId: pubId,
          })),
        },
      },
      include: {
        book_categories: { include: { categories: true } },
        book_publishers: { include: { publishers: true } },
        ratings: true,
      },
    });

    return res.status(201).json(newBook);
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du livre :", error);
    return res.status(500).json({ error: "Erreur interne lors de la création du livre." });
  }
};

const getBookByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    const decodedTitle = decodeURIComponent(title);
    console.log("🔎 Requête reçue - getBookByTitle :", decodedTitle);

    const book = await prisma.books.findFirst({
      where: { title: decodeURIComponent(title) },
      include: {
        ratings: true,
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
      },
    });    

    if (!book) {
      console.log("⚠️ Livre non trouvé :", decodedTitle);
      return res.status(404).json({ error: "Livre non trouvé" });
    }

    const bookData = {
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      date: book.date,
      editors: book.book_publishers.map(bp => bp.publishers.name),
      categories: book.book_categories.map(bc => bc.categories.name),
      cover_url: book.cover_url,
      averageRating: book.ratings.length
        ? book.ratings.reduce((sum, r) => sum + r.score, 0) / book.ratings.length
        : 0,
      ratings: book.ratings,
    };

    console.log("📘 Livre trouvé :", bookData.title);
    res.json({
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      date: book.date,
      editors: book.book_publishers.map(bp => bp.publishers.name),
      categories: book.book_categories.map(bc => bc.categories.name),
      cover_url: book.cover_url,
      summary: book.summary, // ✅ AJOUT ICI
      averageRating: book.ratings.length
        ? book.ratings.reduce((sum, r) => sum + r.score, 0) / book.ratings.length
        : 0,
      ratings: book.ratings,
    });

  } catch (error) {
    console.error("❌ Erreur dans getBookByTitle :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

module.exports = {
  getAllBooks,
  getBestRatedBooks,
  getLastAddedBooks,
  addBook,
  getBookByTitle,
  getMinYear,
};

// 📁 controllers/collectionController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_COVER = "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp";

// ✅ Ajouter un livre à la collection
const addToCollection = async (req, res) => {
  const userId = req.user.userId;
  const { bookId } = req.body;

  if (!bookId) {
    return res.status(400).json({ error: 'ID du livre manquant.' });
  }

  try {
    const bookExists = await prisma.books.findUnique({ where: { bookId } });

    if (!bookExists) {
      return res.status(404).json({ error: 'Livre introuvable.' });
    }

    const alreadyInCollection = await prisma.collection.findFirst({ where: { userId, bookId } });

    if (alreadyInCollection) {
      return res.status(400).json({ error: 'Ce livre est déjà dans votre collection.' });
    }

    const added = await prisma.collection.create({
      data: { userId, bookId },
    });

    return res.status(201).json({ success: true, data: added });
  } catch (error) {
    console.error('Erreur ajout collection :', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// ✅ Récupérer la collection de l'utilisateur avec filtres
const getCollection = async (req, res) => {
  const userId = req.user.userId;
  const { year, start, end, categories = [], type = 'ou', is_read, noted, commented } = req.query;

  const filtersOnBooks = {};
  const filtersOnCollection = { userId };

  if (year && /^\d{4}$/.test(year)) {
    filtersOnBooks.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
    };
  } else if (start && end && /^\d{4}$/.test(start) && /^\d{4}$/.test(end)) {
    filtersOnBooks.date = {
      gte: new Date(`${start}-01-01`),
      lt: new Date(`${parseInt(end, 10) + 1}-01-01`),
    };
  }

  if (is_read === 'true') {
    filtersOnCollection.is_read = true;
  }

  const cats = Array.isArray(categories) ? categories : [categories];

  try {
    let collection = await prisma.collection.findMany({
      where: {
        ...filtersOnCollection,
        books: {
          ...filtersOnBooks,
          ...(cats.length > 0
            ? type === 'et'
              ? { AND: cats.map((cat) => ({
                  book_categories: { some: { categories: { name: cat } } }
                })) }
              : { book_categories: { some: { categories: { name: { in: cats } } } } }
            : {}),
        },
      },
      include: {
        books: {
          include: {
            book_categories: { include: { categories: true } },
            book_publishers: { include: { publishers: true } },
            comments: true,
          },
        },
      },
    });

    if (noted === 'true') {
      collection = collection.filter(c => c.books.averageRating && c.books.averageRating > 0);
    }

    if (commented === 'true') {
      collection = collection.filter(c => c.books.comments && c.books.comments.length > 0);
    }

    return res.status(200).json(collection);
  } catch (error) {
    console.error('Erreur récupération collection :', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// ✅ Supprimer un livre de la collection
const removeFromCollection = async (req, res) => {
  const userId = req.user.userId;
  const { bookId } = req.params;

  try {
    const deleted = await prisma.collection.deleteMany({
      where: {
        userId,
        bookId: parseInt(bookId, 10),
      },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Livre non trouvé dans votre collection.' });
    }

    return res.status(200).json({ success: true, message: 'Livre retiré de votre collection.' });
  } catch (error) {
    console.error('Erreur suppression collection :', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// ✅ Mettre à jour le statut "lu"
const updateReadStatus = async (req, res) => {
  const userId = req.user.userId;
  const { bookId } = req.params;
  const { is_read } = req.body;

  if (typeof is_read !== 'boolean') {
    return res.status(400).json({ error: 'Le champ is_read doit être un booléen.' });
  }

  try {
    const updated = await prisma.collection.updateMany({
      where: {
        userId,
        bookId: parseInt(bookId, 10),
      },
      data: { is_read },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Livre non trouvé dans votre collection.' });
    }

    return res.status(200).json({ success: true, message: 'Statut de lecture mis à jour.' });
  } catch (error) {
    console.error('Erreur mise à jour statut lu :', error);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// ✅ Récupérer la position de lecture (CFI)
const getReadingProgress = async (req, res) => {
  const userId = req.user.userId;
  const { bookId } = req.params;

  try {
    const entry = await prisma.collection.findUnique({
      where: {
        userId_bookId: {
          userId: parseInt(userId),
          bookId: parseInt(bookId)
        }
      },
      select: {
        last_cfi: true
      }
    });

    return res.status(200).json({ cfi: entry?.last_cfi || null });
  } catch (error) {
    console.error("Erreur récupération CFI :", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};

// ✅ Sauvegarder la position de lecture (CFI)
const saveReadingProgress = async (req, res) => {
  const userId = req.user.userId;
  const { bookId } = req.params;
  const { cfi } = req.body;

  if (!cfi) {
    return res.status(400).json({ error: "CFI manquant." });
  }

  try {
    const updated = await prisma.collection.updateMany({
      where: {
        userId,
        bookId: parseInt(bookId),
      },
      data: {
        last_cfi: cfi,
      },
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: "Livre non trouvé dans votre collection." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Erreur sauvegarde CFI :", error);
    return res.status(500).json({ error: "Erreur serveur." });
  }
};


module.exports = {
  addToCollection,
  getCollection,
  removeFromCollection,
  updateReadStatus,
  getReadingProgress,
  saveReadingProgress,
};


// 📁 controllers/bookController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { uploadImageToS3 } = require("./uploadController");
const DEFAULT_COVER = "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp";
const { normalize } = require("../utils/normalizeString");
const { formatBooks } = require("../utils/formatBooks"); 

// Utility function to dynamically construct the WHERE
  const buildWhereFilters = (req) => {
  const { year, start, end, categories = [], type = 'ou', search } = req.query;
  const where = {};

  if (year && /^\d{4}$/.test(year)) {
    where.date = {
      gte: new Date(`${year}-01-01`),
      lt: new Date(`${parseInt(year, 10) + 1}-01-01`),
    };
  } else if (start && end && /^\d{4}$/.test(start) && /^\d{4}$/.test(end)) {
    where.date = {
      gte: new Date(`${start}-01-01`),
      lt: new Date(`${parseInt(end, 10) + 1}-01-01`),
    };
  }

  if (search) {
    where.search_title = { contains: normalize(search.toLowerCase()) };
  }

  if (categories.length > 0) {
    const cats = Array.isArray(categories) ? categories : [categories];
    if (type === 'et') {
      where.AND = cats.map((cat) => ({
        book_categories: {
          some: { categories: { name: cat } },
        },
      }));
    } else {
      where.book_categories = {
        some: { categories: { name: { in: cats } } },
      };
    }
  }

  return where;
};

// ✅ Retrieve all books (with filters, pagination, search)
  const getAllBooks = async (req, res) => {
  const where = buildWhereFilters(req);
  const currentPage = parseInt(req.query.page, 10) || 1;
  const take = parseInt(req.query.limit, 10) || 10;
  const skip = (currentPage - 1) * take;

  const pendingFirst = req.query.pendingFirst === 'true';

  try {
    const books = await prisma.books.findMany({
      where,
      skip,
      take,
      orderBy: pendingFirst
        ? [
            { status: 'asc' },
            { created_at: 'desc' },
          ]
        : [{ created_at: 'desc' }],
      include: {
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
        user: { select: { name: true } },
      },
    });

    const formattedBooks = formatBooks(books);
    const total = await prisma.books.count({ where });

    res.json({ books: formattedBooks, total });
  } catch (error) {
    console.error("❌ Erreur dans getAllBooks :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des livres." });
  }
};
// ✅ Retrieve best-rated books (without search)
const getBestRatedBooks = async (req, res) => {
  const where = buildWhereFilters(req);
  delete where.search_title;

  try {
    const books = await prisma.books.findMany({
      where,
      include: {
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
        user: { select: { name: true } },
      },
    });

    const formattedBooks = formatBooks(books)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);

    res.json(formattedBooks);
  } catch (error) {
    console.error("❌ Erreur dans getBestRatedBooks :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des meilleurs livres." });
  }
};

// ✅ Retrieve last added books (without search)
const getLastAddedBooks = async (req, res) => {
  const where = buildWhereFilters(req);
  delete where.search_title;

  try {
    const books = await prisma.books.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 5,
      include: {
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
        user: { select: { name: true } },
      },
    });

    const formattedBooks = formatBooks(books);
    res.json(formattedBooks);
  } catch (error) {
    console.error("❌ Erreur dans getLastAddedBooks :", error);
    res.status(500).json({ error: "Erreur lors de la récupération des derniers livres." });
  }
};

// ✅ Add a book
const addBook = async (req, res) => {
  const { title, author, year, summary, cover_url, categories, editor } = req.body;

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
        search_title: normalize(`${title} ${author}`),
        author,
        date: parsedDate,
        summary,
        cover_url,
        averageRating: 0,
        status: "pending",
        validated_by: null,
        book_categories: {
          create: categories.map((catId) => ({ categoryId: catId })),
        },
        book_publishers: {
          create: editor.map((pubId) => ({ publisherId: pubId })),
        },
      },
    });

    res.status(201).json(newBook);
  } catch (error) {
    console.error("❌ Erreur dans addBook :", error);
    res.status(500).json({ error: "Erreur lors de la création du livre." });
  }
};

// ✅ Retrieve a book by its title
const getBookByTitle = async (req, res) => {
  try {
    const { title } = req.params;
    const decodedTitle = decodeURIComponent(title);
    if (!decodedTitle) return res.status(400).json({ error: "Titre invalide" });

    const book = await prisma.books.findFirst({
      where: { title: decodedTitle },
      include: {
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
        user: { select: { name: true } },
        comments: {
          include: { user: { select: { name: true, avatar: true } } },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!book) return res.status(404).json({ error: "Livre non trouvé" });

    const [formattedBook] = formatBooks([book]);

    formattedBook.comments = book.comments.map((comment) => ({
      commentId: comment.commentId,
      content: comment.content,
      rating: comment.rating,
      created_at: comment.created_at,
      user: {
        name: comment.user.name,
        avatar: comment.user.avatar,
      },
    }));

    res.json(formattedBook);
  } catch (error) {
    console.error("❌ Erreur dans getBookByTitle :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// ✅ Retrieve the oldest year
const getMinYear = async (req, res) => {
  try {
    const result = await prisma.books.findFirst({
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    if (!result || !result.date) {
      return res.status(404).json({ error: 'Aucun livre trouvé' });
    }

    const minYear = new Date(result.date).getFullYear();
    res.json({ minYear });
  } catch (error) {
    console.error("❌ Erreur dans getMinYear :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// ✅ Update a book's cover
const updateBookCover = async (req, res) => {
  try {
    const { id } = req.params;
    const book = await prisma.books.findUnique({ where: { bookId: Number(id) } });
    if (!book) return res.status(404).json({ error: "Livre non trouvé" });

    const safeTitle = book.title.replace(/[^a-z0-9_-]/gi, "").toLowerCase();
    const key = `covers/${safeTitle}.webp`;
    const coverUrl = await uploadImageToS3(req.file.buffer, key, req.file.mimetype);

    await prisma.books.update({
      where: { bookId: Number(id) },
      data: { cover_url: coverUrl },
    });

    res.status(200).json({ message: "Image mise à jour", cover_url: coverUrl });
  } catch (error) {
    console.error("❌ Erreur updateBookCover :", error);
    res.status(500).json({ error: "Erreur mise à jour image" });
  }
};

// ✅ Updates the main information of a book (admin/modo only)
const updateBook = async (req, res) => {
  const { id } = req.params;
  const { title, author, year, summary, status, categories = [], editors = [], cover_url } = req.body;

  try {
    const parsedDate = new Date(year);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ error: "Date invalide" });
    }
    
    await prisma.books.update({
      where: { bookId: Number(id) },
      data: {
        title,
        search_title: normalize(`${title} ${author}`),
        author,
        date: parsedDate,
        summary,
        status,
        cover_url,
        validated_by: req.user?.userId || null,
        book_categories: {
          deleteMany: {},
          create: categories.map((categoryId) => ({
            categoryId,
          })),
        },
        book_publishers: {
          deleteMany: {},
          create: editors.map((publisherId) => ({
            publisherId,
          })),
        },        
      },
    });

    const updatedBook = await prisma.books.findUnique({
      where: { bookId: Number(id) },
      include: {
        book_publishers: { include: { publishers: true } },
        book_categories: { include: { categories: true } },
        user: { select: { name: true } },
      },
    });

    const [formatted] = formatBooks([updatedBook]);
    res.status(200).json(formatted);
  } catch (err) {
    console.error("❌ Erreur updateBook :", err.message);
    if (err.meta) console.error("📛 Meta :", err.meta);
    if (err.cause) console.error("📛 Cause :", err.cause);
    res.status(500).json({ error: "Erreur serveur", message: err.message });
  }
  
};


module.exports = {
  getAllBooks,
  getBestRatedBooks,
  getLastAddedBooks,
  addBook,
  getBookByTitle,
  getMinYear,
  updateBookCover,
  updateBook,
};

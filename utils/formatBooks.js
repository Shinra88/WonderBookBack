// 📁 utils/formatBooks.js

const DEFAULT_COVER = "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp";

/** Formate un tableau de livres Prisma pour l'API */
function formatBooks(books) {
  return books.map((book) => ({
    bookId: book.bookId,
    title: book.title || "Titre inconnu",
    search_title: book.search_title || "",
    author: book.author || "Auteur inconnu",
    date: book.date || null,
    summary: book.summary || "Aucun résumé disponible.",
    status: book.status || "pending",
    validated_by: book.user?.name || null,
    categories: book.book_categories.map((bc) => bc.categories.name) || [],
    editors: book.book_publishers.map((bp) => bp.publishers.name) || [],
    cover_url: book.cover_url || DEFAULT_COVER,
    ebook_url: book.ebook_url || null,
    averageRating: book.averageRating ?? 0,
  }));
}

module.exports = { formatBooks };
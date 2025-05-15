// 📁 utils/formatBooks.js

const DEFAULT_COVER = "https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp";

/** Formate un tableau de livres Prisma pour l'API */
function formatBooks(books) {
  return books.map((book) => ({
    bookId: book.bookId,
    title: book.title || "Titre inconnu",
    search_title: book.search_title || "",
    author: book.author || "Auteur inconnu",
    date: book.date ? book.date.toISOString().split('T')[0] : null,
    summary: book.summary || "Aucun résumé disponible.",
    status: book.status || "pending",
    validated_by: book.user?.name || null,
    categories: Array.isArray(book.book_categories)
      ? book.book_categories.map((bc) => bc.categories?.name).filter(Boolean)
      : [],
    editors: Array.isArray(book.book_publishers)
      ? book.book_publishers.map((bp) => bp.publishers?.name).filter(Boolean)
      : [],
    cover_url: book.cover_url || DEFAULT_COVER,
    averageRating: typeof book.averageRating === 'number' ? book.averageRating : 0,
  }));
}

module.exports = { formatBooks };

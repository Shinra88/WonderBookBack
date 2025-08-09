// 📁 controllers/commentController.js
const { PrismaClient } = require('@prisma/client');
const { createLog, LOG_ACTIONS } = require('./logsController');
const prisma = new PrismaClient();

const updateAverageRating = async (bookId) => {
  const result = await prisma.comments.aggregate({
    where: { bookId: parseInt(bookId, 10) },
    _avg: { rating: true }
  });

  const newAverage = result._avg.rating ?? 0;

  await prisma.books.update({
    where: { bookId: parseInt(bookId, 10) },
    data: { averageRating: newAverage }
  });
};

// 🎯 GET - retrieve book reviews
const getCommentsByBook = async (req, res) => {
  const { bookId } = req.params;

  try {
    const comments = await prisma.comments.findMany({
      where: { bookId: parseInt(bookId, 10) },
      include: {
        user: { select: { name: true, avatar: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    res.status(200).json(comments);
  } catch (error) {
    console.error('Erreur récupération commentaires :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// 🎯 POST - add or update a comment
const addOrUpdateComment = async (req, res) => {
  const { bookId } = req.params;
  const { content, rating } = req.body;
  const userId = req.user.userId;

  if (!content || typeof rating !== 'number') {
    return res.status(400).json({ error: 'Contenu ou note manquant(s).' });
  }

  try {
    // Récupérer les infos du livre pour les logs
    const book = await prisma.books.findUnique({
      where: { bookId: parseInt(bookId, 10) },
      select: { title: true, author: true }
    });

    // Check if a comment already exists
    const existing = await prisma.comments.findFirst({
      where: { bookId: parseInt(bookId, 10), userId }
    });

    if (existing) {
      // ➔ Update
      const updated = await prisma.comments.update({
        where: { commentId: existing.commentId },
        data: { content, rating }
      });
      await updateAverageRating(bookId);

      // 📊 Log de la mise à jour
      try {
        await createLog(
          userId,
          `${LOG_ACTIONS.COMMENT_UPDATED} sur "${book?.title || 'Livre inconnu'}" (Note: ${rating}/5)`,
          updated.commentId,
          'comment'
        );
      } catch (logError) {
        console.error('⚠️ Erreur lors de la création du log:', logError);
      }

      return res
        .status(200)
        .json({ success: true, data: updated, message: 'Commentaire mis à jour.' });
    } else {
      // ➔ Add
      const newComment = await prisma.comments.create({
        data: { bookId: parseInt(bookId, 10), userId, content, rating }
      });
      await updateAverageRating(bookId);

      // 📊 Log de l'ajout
      try {
        await createLog(
          userId,
          `${LOG_ACTIONS.COMMENT_ADDED} sur "${book?.title || 'Livre inconnu'}" (Note: ${rating}/5)`,
          newComment.commentId,
          'comment'
        );
      } catch (logError) {
        console.error('⚠️ Erreur lors de la création du log:', logError);
      }

      return res
        .status(201)
        .json({ success: true, data: newComment, message: 'Commentaire ajouté.' });
    }
  } catch (error) {
    console.error('Erreur ajout/modification commentaire :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

// 🎯 DELETE - remove a comment
const deleteComment = async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.userId;

  try {
    // Récupérer les infos avant suppression pour les logs
    const existingComment = await prisma.comments.findFirst({
      where: { bookId: parseInt(bookId, 10), userId },
      include: {
        books: { select: { title: true, author: true } }
      }
    });

    const deleted = await prisma.comments.deleteMany({
      where: { bookId: parseInt(bookId, 10), userId }
    });

    await updateAverageRating(bookId);

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Commentaire non trouvé.' });
    }

    // 📊 Log de la suppression
    try {
      if (existingComment) {
        await createLog(
          userId,
          `${LOG_ACTIONS.COMMENT_DELETED} sur "${existingComment.books?.title || 'Livre inconnu'}"`,
          existingComment.commentId,
          'comment'
        );
      }
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    // 🔁 Check if there are any remaining comments from this user for this book
    const remaining = await prisma.comments.findMany({
      where: { bookId: parseInt(bookId, 10), userId }
    });

    if (remaining.length === 0) {
      await prisma.collection.updateMany({
        where: { bookId: parseInt(bookId, 10), userId },
        data: { commented: false }
      });
    }

    res.status(200).json({ success: true, message: 'Commentaire supprimé.' });
  } catch (error) {
    console.error('Erreur suppression commentaire :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

const deleteCommentById = async (req, res) => {
  const { commentId } = req.params;

  try {
    const existingComment = await prisma.comments.findUnique({
      where: { commentId: parseInt(commentId, 10) },
      include: {
        books: { select: { title: true, author: true } },
        user: { select: { name: true } }
      }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Commentaire introuvable.' });
    }

    await prisma.comments.delete({
      where: { commentId: parseInt(commentId, 10) }
    });

    await updateAverageRating(existingComment.bookId);

    // 📊 Log de la suppression par modérateur/admin
    try {
      if (req.user && req.user.userId) {
        await createLog(
          req.user.userId,
          `${LOG_ACTIONS.COMMENT_DELETED} (modération) : commentaire de ${existingComment.user?.name || 'Utilisateur inconnu'} sur "${existingComment.books?.title || 'Livre inconnu'}"`,
          parseInt(commentId, 10),
          'comment'
        );
      }
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    // 🔁 Check if there are any remaining comments from this user for this book
    const remaining = await prisma.comments.findMany({
      where: {
        bookId: existingComment.bookId,
        userId: existingComment.userId
      }
    });

    if (remaining.length === 0) {
      await prisma.collection.updateMany({
        where: {
          bookId: existingComment.bookId,
          userId: existingComment.userId
        },
        data: { commented: false }
      });
    }

    res.status(200).json({ success: true, message: 'Commentaire supprimé par un modérateur.' });
  } catch (error) {
    console.error('Erreur suppression admin :', error);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
};

module.exports = { getCommentsByBook, addOrUpdateComment, deleteComment, deleteCommentById };

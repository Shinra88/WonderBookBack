// 📁 controllers/commentController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// 🎯 GET - récupérer les commentaires d'un livre
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
    console.error("Erreur récupération commentaires :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// 🎯 POST - ajouter ou mettre à jour un commentaire
const addOrUpdateComment = async (req, res) => {
  const { bookId } = req.params;
  const { content, rating } = req.body;
  const userId = req.user.userId;

  if (!content || typeof rating !== 'number') {
    return res.status(400).json({ error: "Contenu ou note manquant(s)." });
  }

  try {
    // Vérifie s'il existe déjà un commentaire
    const existing = await prisma.comments.findFirst({
      where: { bookId: parseInt(bookId, 10), userId },
    });

    if (existing) {
      // ➔ Mise à jour
      const updated = await prisma.comments.update({
        where: { commentId: existing.commentId },
        data: { content, rating },
      });
      return res.status(200).json({ success: true, data: updated, message: "Commentaire mis à jour." });
    } else {
      // ➔ Ajout
      const newComment = await prisma.comments.create({
        data: { bookId: parseInt(bookId, 10), userId, content, rating },
      });
      return res.status(201).json({ success: true, data: newComment, message: "Commentaire ajouté." });
    }
  } catch (error) {
    console.error("Erreur ajout/modification commentaire :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

// 🎯 DELETE - supprimer un commentaire
const deleteComment = async (req, res) => {
  const { bookId } = req.params;
  const userId = req.user.userId;

  try {
    const deleted = await prisma.comments.deleteMany({
      where: { bookId: parseInt(bookId, 10), userId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: "Commentaire non trouvé." });
    }

    res.status(200).json({ success: true, message: "Commentaire supprimé." });
  } catch (error) {
    console.error("Erreur suppression commentaire :", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

module.exports = { getCommentsByBook, addOrUpdateComment, deleteComment };

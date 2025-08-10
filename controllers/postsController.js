// ========================================
// controllers/postsController.js - Modification minimale
const { ObjectId } = require('mongodb');
const { createLog, LOG_ACTIONS } = require('./logsController');

// ✅ SOLUTION SIMPLE : Même fonction utilitaire
const objectIdToInt = (objectId) => {
  const hex = objectId.toString().slice(-8);
  return parseInt(hex, 16) % 2147483647;
};

// 📌 Retrieve all posts
async function getPosts(req, res) {
  try {
    const db = req.app.locals.mongoDB;
    const posts = await db.collection('posts').find().toArray();
    res.json(posts);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des posts :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// 📌 Add a post
async function addPost(req, res) {
  const { topicId, content } = req.body;

  if (!topicId || !content) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  const { userId, name, avatar } = req.user;

  try {
    const db = req.app.locals.mongoDB;

    // Récupérer les infos du topic pour les logs
    const topic = await db.collection('topics').findOne({ _id: new ObjectId(topicId) });

    const result = await db.collection('posts').insertOne({
      topicId: new ObjectId(topicId),
      userId,
      userName: name,
      userAvatar: avatar,
      content,
      created_at: new Date()
    });

    // 📊 Log de l'ajout du post
    try {
      // ✅ FIX : Convertir ObjectId en entier pour Prisma
      const targetId = objectIdToInt(result.insertedId);

      await createLog(
        userId,
        `${LOG_ACTIONS.POST_ADDED} dans le sujet "${topic?.title || 'Sujet inconnu'}"`,
        targetId, // ✅ Maintenant c'est un Int
        'forum_post'
      );
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.status(201).json({
      message: 'Post ajouté avec succès',
      id: result.insertedId
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du post :", error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// 📌 Retrieve all posts from a topic
async function getPostsByTopicId(req, res) {
  const { topicId } = req.params;

  try {
    const db = req.app.locals.mongoDB;
    const posts = await db
      .collection('posts')
      .find({ topicId: new ObjectId(topicId) })
      .sort({ created_at: 1 })
      .toArray();

    res.json(posts);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des posts :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

// 📌 Delete a post
async function deletePost(req, res) {
  const { id } = req.params;
  const { userId, role } = req.user;

  try {
    const db = req.app.locals.mongoDB;

    // Récupérer les infos du post avant suppression
    const existingPost = await db.collection('posts').findOne({ _id: new ObjectId(id) });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post introuvable' });
    }

    // Vérifier les permissions
    if (existingPost.userId !== userId && !['admin', 'moderator'].includes(role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    // Récupérer les infos du topic pour les logs
    const topic = await db.collection('topics').findOne({ _id: existingPost.topicId });

    // Supprimer le post
    const result = await db.collection('posts').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Post introuvable' });
    }

    // 📊 Log de la suppression
    try {
      // ✅ FIX : Convertir ObjectId en entier pour Prisma
      const targetId = objectIdToInt(new ObjectId(id));

      const isModeration = existingPost.userId !== userId;
      const actionText = isModeration
        ? `${LOG_ACTIONS.POST_DELETED} (modération): post de ${existingPost.userName} dans "${topic?.title || 'Sujet inconnu'}"`
        : `${LOG_ACTIONS.POST_DELETED} dans le sujet "${topic?.title || 'Sujet inconnu'}"`;

      await createLog(
        userId,
        actionText,
        targetId, // ✅ Maintenant c'est un Int
        'forum_post'
      );
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.status(200).json({
      success: true,
      message: 'Post supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du post :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  getPosts,
  addPost,
  getPostsByTopicId,
  deletePost
};

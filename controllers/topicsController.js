// controllers/topicsController.js
const { ObjectId } = require('mongodb');
const { createLog, LOG_ACTIONS } = require('./logsController');

async function getTopics(req, res) {
  try {
    const db = req.app.locals.mongoDB;
    const topics = await db.collection('topics').find().toArray();
    res.json(topics);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des topics :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function addTopic(req, res) {
  const { title, content, notice = false } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Titre et contenu requis.' });
  }

  const { userId, name, avatar } = req.user;

  try {
    const db = req.app.locals.mongoDB;
    const result = await db.collection('topics').insertOne({
      title,
      content,
      notice,
      authorId: userId,
      authorName: name,
      authorAvatar: avatar,
      created_at: new Date()
    });

    // 📊 Log de la création du sujet
    try {
      await createLog(
        userId,
        `${LOG_ACTIONS.SUBJECT_CREATED}: "${title}"${notice ? ' (Notice)' : ''}`,
        result.insertedId.toString(), // MongoDB ObjectId converti en string
        'forum_topic'
      );
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.status(201).json({
      message: 'Topic ajouté avec succès',
      id: result.insertedId
    });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du topic :", error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function getTopicById(req, res) {
  const { id } = req.params;

  try {
    const db = req.app.locals.mongoDB;
    const topic = await db.collection('topics').findOne({ _id: new ObjectId(id) });

    if (!topic) {
      return res.status(404).json({ error: 'Topic introuvable' });
    }

    res.json(topic);
  } catch (error) {
    console.error('❌ Erreur lors de la récupération du topic :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

async function deleteTopic(req, res) {
  const { id } = req.params;
  const { userId, role } = req.user;

  try {
    const db = req.app.locals.mongoDB;

    // Récupérer les infos du topic avant suppression pour les logs
    const existingTopic = await db.collection('topics').findOne({ _id: new ObjectId(id) });

    if (!existingTopic) {
      return res.status(404).json({ error: 'Topic introuvable' });
    }

    // Vérifier les permissions (seul l'auteur ou admin/modérateur peut supprimer)
    if (existingTopic.authorId !== userId && !['admin', 'moderator'].includes(role)) {
      return res.status(403).json({ error: 'Permission refusée' });
    }

    // Supprimer aussi tous les posts associés
    await db.collection('posts').deleteMany({ topicId: new ObjectId(id) });

    // Supprimer le topic
    const result = await db.collection('topics').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Topic introuvable' });
    }

    // 📊 Log de la suppression
    try {
      const isModeration = existingTopic.authorId !== userId;
      const actionText = isModeration
        ? `${LOG_ACTIONS.SUBJECT_DELETED} (modération): "${existingTopic.title}" de ${existingTopic.authorName}`
        : `${LOG_ACTIONS.SUBJECT_DELETED}: "${existingTopic.title}"`;

      await createLog(userId, actionText, id, 'forum_topic');
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.status(200).json({
      success: true,
      message: 'Topic et posts associés supprimés avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur lors de la suppression du topic :', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
}

module.exports = {
  getTopics,
  addTopic,
  getTopicById,
  deleteTopic
};

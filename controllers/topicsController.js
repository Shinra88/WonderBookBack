// controllers/topicsController.js
const { ObjectId } = require("mongodb");

async function getTopics(req, res) {
  try {
    const db = req.app.locals.mongoDB;
    const topics = await db.collection("topics").find().toArray();
    res.json(topics);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des topics :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

async function addTopic(req, res) {
  const { title, content, notice = false } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: "Titre et contenu requis." });
  }

  const { userId, name, avatar, role } = req.user;

  // ✅ Seuls admin/modo peuvent épingler
  const isModOrAdmin = role === 'admin' || role === 'moderator';
  const safeNotice = isModOrAdmin && !!notice;

  try {
    const db = req.app.locals.mongoDB;
    const result = await db.collection("topics").insertOne({
      title,
      content,
      notice: safeNotice,
      locked: false,
      authorId: userId,
      authorName: name,
      authorAvatar: avatar,
      created_at: new Date(),
    });

    res.status(201).json({ message: "Topic ajouté avec succès", id: result.insertedId });
  } catch (error) {
    console.error("❌ Erreur lors de l'ajout du topic :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

async function getTopicById(req, res) {
  const { id } = req.params;

  try {
    const db = req.app.locals.mongoDB;
    const topic = await db
      .collection("topics")
      .findOne({ _id: new ObjectId(id) });

    if (!topic) {
      return res.status(404).json({ error: "Topic introuvable" });
    }

    res.json(topic);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération du topic :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// epingler ou désépingler un topic
async function toggleTopicNotice(req, res) {
  const { id } = req.params;
  const { role } = req.user;

  if (role !== "admin" && role !== "moderator") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const db = req.app.locals.mongoDB;
    const topic = await db.collection("topics").findOne({ _id: new ObjectId(id) });

    if (!topic) {
      return res.status(404).json({ error: "Topic introuvable" });
    }

    const updated = await db.collection("topics").updateOne(
      { _id: new ObjectId(id) },
      { $set: { notice: !topic.notice } }
    );

    res.json({ message: "État épinglé modifié", notice: !topic.notice });
  } catch (error) {
    console.error("❌ Erreur toggle notice :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

async function deleteTopic(req, res) {
  const { id } = req.params;

  try {
    const db = req.app.locals.mongoDB;

    const deleted = await db.collection("topics").deleteOne({ _id: new ObjectId(id) });

    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Topic introuvable" });
    }

    await db.collection("posts").deleteMany({ topicId: new ObjectId(id) });

    res.json({ message: "Topic supprimé avec succès" });
  } catch (error) {
    console.error("❌ Erreur suppression topic :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

async function toggleLockTopic(req, res) {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "ID invalide" });
  }

  try {
    const db = req.app.locals.mongoDB;
    const topic = await db.collection("topics").findOne({ _id: new ObjectId(id) });

    if (!topic) {
      return res.status(404).json({ error: "Sujet introuvable" });
    }

    const newLockedStatus = !topic.locked;

    await db.collection("topics").updateOne(
      { _id: new ObjectId(id) },
      { $set: { locked: newLockedStatus } }
    );

    res.json({ message: "Statut verrouillé mis à jour", locked: newLockedStatus });
  } catch (error) {
    console.error("❌ Erreur toggle lock :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

module.exports = { getTopics, addTopic, getTopicById, toggleTopicNotice, deleteTopic, toggleLockTopic };

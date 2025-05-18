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
  
    const { userId, name, avatar } = req.user;
  
    try {
      const db = req.app.locals.mongoDB;
      const result = await db.collection("topics").insertOne({
        title,
        content,
        notice,
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

module.exports = { getTopics, addTopic, getTopicById };

// controllers/postsController.js
const { ObjectId } = require("mongodb");

// 📌 Récupérer tous les posts
async function getPosts(req, res) {
  try {
    const db = req.app.locals.mongoDB;
    const posts = await db.collection("posts").find().toArray();
    res.json(posts);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des posts :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

// 📌 Ajouter un post
async function addPost(req, res) {
    const { topicId, content } = req.body;
  
    if (!topicId || !content) {
      return res.status(400).json({ error: "Tous les champs sont requis." });
    }
  
    const { userId, name, avatar } = req.user;
  
    try {
      const db = req.app.locals.mongoDB;
      const result = await db.collection("posts").insertOne({
        topicId: new ObjectId(topicId),
        userId,
        userName: name,
        userAvatar: avatar,
        content,
        created_at: new Date(),
      });
  
      res.status(201).json({
        message: "Post ajouté avec succès",
        id: result.insertedId,
      });
    } catch (error) {
      console.error("❌ Erreur lors de l'ajout du post :", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
  
// 📌 Récupérer tous les posts d’un topic
async function getPostsByTopicId(req, res) {
  const { topicId } = req.params;

  try {
    const db = req.app.locals.mongoDB;
    const posts = await db
      .collection("posts")
      .find({ topicId: new ObjectId(topicId) })
      .sort({ created_at: 1 })
      .toArray();

    res.json(posts);
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des posts :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

async function deletePostById(req, res) {
  const { id } = req.params;
  const { role } = req.user;

  if (role !== "admin" && role !== "moderator") {
    return res.status(403).json({ error: "Accès refusé" });
  }

  try {
    const db = req.app.locals.mongoDB;
    const deleted = await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

    if (deleted.deletedCount === 0) {
      return res.status(404).json({ error: "Post introuvable" });
    }

    res.json({ message: "Post supprimé" });
  } catch (error) {
    console.error("❌ Erreur suppression post :", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
}

module.exports = { getPosts, addPost, getPostsByTopicId, deletePostById };

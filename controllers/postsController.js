const { ObjectId } = require("mongodb");

// 📌 Récupérer tous les posts
async function getPosts(req, res) {
    try {
        const db = req.app.locals.mongoDB; // Récupérer la connexion MongoDB
        const posts = await db.collection("posts").find().toArray();
        res.json(posts);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des posts :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
}

// 📌 Ajouter un post
async function addPost(req, res) {
    const { topicId, userId, content } = req.body;

    if (!topicId || !userId || !content) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
        const db = req.app.locals.mongoDB;
        const result = await db.collection("posts").insertOne({
            topicId: new ObjectId(topicId),
            userId,
            content,
            created_at: new Date(),
        });

        res.status(201).json({ message: "Post ajouté avec succès", id: result.insertedId });
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout du post :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
}

module.exports = { getPosts, addPost };

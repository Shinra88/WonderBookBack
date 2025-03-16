const { MongoClient, ObjectId } = require("mongodb");

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

async function getTopics(req, res) {
    try {
        await client.connect();
        const db = client.db("WonderNoSql");
        const topics = await db.collection("topics").find().toArray();
        res.json(topics);
    } catch (error) {
        console.error("❌ Erreur lors de la récupération des topics :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
}

async function addTopic(req, res) {
    const { title, author, content } = req.body;

    if (!title || !author || !content) {
        return res.status(400).json({ error: "Tous les champs sont requis." });
    }

    try {
        await client.connect();
        const db = client.db("WonderNoSql");

        const result = await db.collection("topics").insertOne({
            title,
            author,
            content,
            created_at: new Date(),
        });

        res.status(201).json({ message: "Topic ajouté avec succès", id: result.insertedId });
    } catch (error) {
        console.error("❌ Erreur lors de l'ajout du topic :", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
}

module.exports = { getTopics, addTopic };

const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI || "mongodb://root:rootpwd@localhost:27017/admin"; // 🔥 Change ici si besoin
const client = new MongoClient(mongoUri);

async function connectMongo() {
    try {
        await client.connect();
        console.log("✅ Connexion réussie à MongoDB !");
        return client.db("WonderNoSql"); // 📌 Retourne la base de données MongoDB
    } catch (error) {
        console.error("❌ Erreur de connexion à MongoDB :", error);
        process.exit(1); // Quitte le processus si erreur
    }
}

module.exports = connectMongo;

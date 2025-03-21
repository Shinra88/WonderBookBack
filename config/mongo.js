const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI || "mongodb://root:rootpwd@mongodb:27017/admin";
const client = new MongoClient(mongoUri);

async function connectMongo() {
    try {
        await client.connect();
        console.log("✅ Connexion réussie à MongoDB !");
        return client.db("WonderNoSql");
    } catch (error) {
        console.error("❌ Erreur de connexion à MongoDB :", error);
        process.exit(1);
    }
}

module.exports = connectMongo;

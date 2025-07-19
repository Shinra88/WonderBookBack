const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error("🚨 Erreur : MONGO_URI non défini dans le fichier .env");
  process.exit(1);
}

const client = new MongoClient(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

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

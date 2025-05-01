require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const connectMongo = require("./config/mongo");
const mysql = require("mysql2/promise");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(express.json()); // obligatoire pour parser req.body
app.use(cors({
  origin: "http://localhost:3000",  // Assurez-vous que cette adresse correspond à celle de votre frontend
  methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true
}));

// ✅ Logger universel (affiche toutes les requêtes avec leur body)
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Body reçu :", req.body);
  }
  next();
});

// ✅ Routes principales
const bookRoutes = require("./routes/bookRoutes");
const commentRoutes = require("./routes/commentRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const postsRoutes = require("./routes/postsRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadS3");
const categoryRoutes = require("./routes/categoryRoutes");
const publisherRoutes = require('./routes/publisherRoutes');
const collectionRoutes = require ('./routes/collectionRoutes');
const postRoutesId = require("./routes/postsRoutes");

// ✅ Authentification + gestion de profil (register, login, profile, change-password)
app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/topics", topicsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/posts", postRoutesId);

app.use("/api/upload", uploadRoutes);
app.use("/api/categories", categoryRoutes);
app.use('/api/publishers', publisherRoutes);
app.use('/api/collection', collectionRoutes);

// 🔥 Fonction pour attendre MariaDB avant de démarrer Prisma
async function waitForMariaDB() {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_ROOT_PASSWORD, MYSQL_DATABASE } = process.env;

  for (let i = 0; i < 10; i++) {
    try {
      console.log(`⏳ Vérification de MariaDB... Tentative ${i + 1}`);
      const connection = await mysql.createConnection({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_ROOT_PASSWORD,
        database: MYSQL_DATABASE
      });
      await connection.end();
      console.log("✅ MariaDB est prêt !");
      return;
    } catch (error) {
      console.log("❌ MariaDB non prêt, nouvelle tentative...");
      await new Promise((res) => setTimeout(res, 5000));
    }
  }
  throw new Error("🚨 MariaDB n'est pas accessible après plusieurs tentatives.");
}

// 🚀 Lancement du serveur
async function startServer() {
  try {
    console.log("🔄 Attente de MariaDB...");
    await waitForMariaDB();  // Attend que MariaDB soit disponible

    console.log("🔄 Connexion à MariaDB avec Prisma...");
    await prisma.$connect();  // Connexion avec Prisma pour la gestion des données MariaDB
    console.log("✅ Connexion à MariaDB réussie !");

    console.log("🔄 Connexion à MongoDB...");
    const mongoDB = await connectMongo();  // Connexion à MongoDB
    app.locals.mongoDB = mongoDB;
    console.log("✅ Connexion à MongoDB réussie !");

    // Démarre le serveur Express
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Erreur critique :", error);
    process.exit(1);  // Arrêt du serveur en cas d'erreur critique
  }
}

startServer();  // Lance la fonction pour démarrer le serveur

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const { PrismaClient } = require("@prisma/client");
const connectMongo = require("./config/mongo");
const mysql = require("mysql2/promise");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;

// ✅ Middleware
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.FRONTEND_URL.split(",");
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS non autorisé pour cette origine"));
    }
  },
  methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
  allowedHeaders: "Content-Type, Authorization",
  credentials: true
}));

// ✅ Logger universal
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Body reçu :", req.body);
  }
  next();
});

// ✅ Routes main

const bookRoutes = require("./routes/bookRoutes");
const commentRoutes = require("./routes/commentRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const postsRoutes = require("./routes/postsRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadS3");
const categoryRoutes = require("./routes/categoryRoutes");
const publisherRoutes = require("./routes/publisherRoutes");
const collectionRoutes = require ("./routes/collectionRoutes");
const postRoutesId = require("./routes/postsRoutes");
const adminRoutes = require("./routes/adminRoutes");

// ✅ Authentication + profile management (register, login, profile, change-password)
app.get("/", (req, res) => {
  res.status(200).send("OK - Serveur en ligne");
});
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.use("/api/auth", authRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/topics", topicsRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/posts", postRoutesId);

app.use("/api/upload", uploadRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/publishers", publisherRoutes);
app.use("/api/collection", collectionRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 🔥 Function to wait for MariaDB before starting Prisma
async function waitForMariaDB() {
  const { MYSQL_HOST, MYSQL_USER, MYSQL_ROOT_PASSWORD, MYSQL_DATABASE } = process.env;

for (let i = 0; i < 10; i++) {
  try {
    console.log(`⏳ Vérification de MariaDB... Tentative ${i + 1}`);
    
    console.log("🔍 Paramètres de connexion MariaDB :");
    console.log({
      host: MYSQL_HOST,
      user: MYSQL_USER,
      password: MYSQL_ROOT_PASSWORD ? '✅ présent' : '❌ manquant',
      database: MYSQL_DATABASE
    });

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

// 🚀 Start server
async function startServer() {
  try {
    console.log("🔄 Attente de MariaDB...");
    await waitForMariaDB();  // Wait for MariaDB to be available

    console.log("🔄 Connexion à MariaDB avec Prisma...");
    await prisma.$connect();  // Connect with Prisma for MariaDB data management
    console.log("✅ Connexion à MariaDB réussie !");

    console.log("🔄 Connexion à MongoDB...");
    const mongoDB = await connectMongo();  // Connect to MongoDB
    app.locals.mongoDB = mongoDB;
    console.log("✅ Connexion à MongoDB réussie !");

    // Start Express server
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Erreur critique :", error);
    process.exit(1);  // Stop server on critical error
  }
}

startServer();  // Start server function

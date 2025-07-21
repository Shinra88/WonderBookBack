// app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const bookRoutes = require("./routes/bookRoutes");
const commentRoutes = require("./routes/commentRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const postsRoutes = require("./routes/postsRoutes");
const authRoutes = require("./routes/authRoutes");
const uploadRoutes = require("./routes/uploadS3");
const categoryRoutes = require("./routes/categoryRoutes");
const publisherRoutes = require("./routes/publisherRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const postRoutesId = require("./routes/postsRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// ✅ Middleware
app.use(express.json());
app.use(
  cors({
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
    credentials: true,
  })
);

// ✅ Logger universal
app.use((req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  if (req.method !== "GET" && req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Body reçu :", req.body);
  }
  next();
});

// ✅ Routes
app.get("/", (req, res) => res.status(200).send("OK - Serveur en ligne"));

app.get("/health", (req, res) =>
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.NODE_ENV,
  })
);

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

module.exports = app;

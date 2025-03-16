// const express = require("express");
// const cors = require("cors");

// const userRoutes = require("./routes/userRoutes");
// const bookRoutes = require("./routes/bookRoutes");
// const commentRoutes = require("./routes/commentRoutes");

// const app = express();
// app.use(express.json());
// app.use(cors());

// const PORT = process.env.PORT || 5000; // 🔥 Change le port ici

// // 📌 Utilisation des routes
// app.use("/users", userRoutes);
// app.use("/books", bookRoutes);
// app.use("/comments", commentRoutes);

// // 📌 Démarrer le serveur
// app.listen(PORT, () => console.log(🚀 Serveur back-end lancé sur http://localhost:${PORT}));

const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client"); // Ajout Prisma
const connectMongo = require("./config/mongo"); // Connexion MongoDB

const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/bookRoutes");
const commentRoutes = require("./routes/commentRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const postsRoutes = require("./routes/postsRoutes");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// 📌 Initialiser Prisma pour MariaDB
const prisma = new PrismaClient();

async function startServer() {
    try {
        // Vérifier la connexion à MariaDB
        await prisma.$connect();
        console.log("✅ Connexion à MariaDB réussie !");

        // 📌 Initialiser MongoDB après Prisma
        const mongoDB = await connectMongo();
        app.locals.mongoDB = mongoDB; // Stocker MongoDB

        // 📌 Utilisation des routes
        app.use("/users", userRoutes);
        app.use("/books", bookRoutes);
        app.use("/comments", commentRoutes);
        app.use("/topics", topicsRoutes);
        app.use("/posts", postsRoutes);

        // 📌 Démarrer le serveur après connexion aux bases
        app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
    } catch (error) {
        console.error("❌ Erreur lors du démarrage du serveur :", error);
        process.exit(1);
    }
}

startServer(); // Démarrer le serveur avec Prisma et MongoDB

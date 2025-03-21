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
const { PrismaClient } = require("@prisma/client"); // Prisma pour MariaDB
const connectMongo = require("./config/mongo"); // Connexion MongoDB
const mysql = require("mysql2/promise");

const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/bookRoutes");
const commentRoutes = require("./routes/commentRoutes");
const topicsRoutes = require("./routes/topicsRoutes");
const postsRoutes = require("./routes/postsRoutes");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// 🔥 Fonction pour attendre MariaDB
async function waitForMariaDB() {
    const { MYSQL_HOST, MYSQL_USER, MYSQL_ROOT_PASSWORD, MYSQL_DATABASE } = process.env;
    
    for (let i = 0; i < 10; i++) { // Essaye 10 fois
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
            await new Promise((res) => setTimeout(res, 5000)); // Attendre 5s avant de réessayer
        }
    }
    throw new Error("🚨 MariaDB n'est pas accessible après plusieurs tentatives.");
}

async function startServer() {
    try {
        console.log("🔄 Attente de MariaDB...");
        await waitForMariaDB(); // Attente active pour MariaDB

        console.log("🔄 Connexion à MariaDB avec Prisma...");
        await prisma.$connect();
        console.log("✅ Connexion à MariaDB réussie !");

        console.log("🔄 Connexion à MongoDB...");
        const mongoDB = await connectMongo();
        app.locals.mongoDB = mongoDB;
        console.log("✅ Connexion à MongoDB réussie !");

        // Définition des routes
        app.use("/users", userRoutes);
        app.use("/books", bookRoutes);
        app.use("/comments", commentRoutes);
        app.use("/topics", topicsRoutes);
        app.use("/posts", postsRoutes);

        // Lancer le serveur
        app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
    } catch (error) {
        console.error("❌ Erreur critique :", error);
        process.exit(1);
    }
}

startServer();

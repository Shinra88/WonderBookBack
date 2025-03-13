const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes");
const bookRoutes = require("./routes/bookRoutes");
const commentRoutes = require("./routes/commentRoutes");

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000; // 🔥 Change le port ici

// 📌 Utilisation des routes
app.use("/users", userRoutes);
app.use("/books", bookRoutes);
app.use("/comments", commentRoutes);

// 📌 Démarrer le serveur
app.listen(PORT, () => console.log(`🚀 Serveur back-end lancé sur http://localhost:${PORT}`));
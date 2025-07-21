// server.js

const express = require('express');
const app = express();
const mysql = require('mysql2/promise');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

let server; // pour stocker l'instance du serveur

async function connectMariaDBWithRetry(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`⏳ Vérification de MariaDB... Tentative ${i + 1}`);
      const connection = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_ROOT_PASSWORD,
        database: process.env.MYSQL_DATABASE
      });
      await connection.ping();
      await connection.end();
      console.log('✅ MariaDB est accessible');
      return;
    } catch (err) {
      console.log('❌ MariaDB non prêt, nouvelle tentative...');
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("🚨 MariaDB n'est pas accessible après plusieurs tentatives.");
}

async function startServer() {
  try {
    await connectMariaDBWithRetry();
    server = app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ Erreur critique :', error);
    process.exit(1);
  }
}

// Fonction pour fermer le serveur (utile pour les tests)
function closeServer() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

// Lance le serveur uniquement si ce fichier est exécuté directement
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, closeServer };

// server.js

const app = require('./app'); // <-- importer l'app existante, pas en recréer une nouvelle
const mysql = require('mysql2/promise');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

let server;

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

function closeServer() {
  return new Promise((resolve, reject) => {
    if (!server) return resolve();
    server.close((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, closeServer };

const app = require('./app');
const { PrismaClient } = require('@prisma/client');
const connectMongo = require('./config/mongo');
const mysql = require('mysql2/promise');

const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// 🔥 MariaDB wait helper
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
      console.log('✅ MariaDB est prêt !');
      return;
    } catch {
      console.log('❌ MariaDB non prêt, nouvelle tentative...');
      await new Promise((res) => setTimeout(res, 5000));
    }
  }

  throw new Error("🚨 MariaDB n'est pas accessible après plusieurs tentatives.");
}

// 🚀 Démarrer le serveur
async function startServer() {
  try {
    console.log('🔄 Attente de MariaDB...');
    await waitForMariaDB();

    console.log('🔄 Connexion à Prisma...');
    await prisma.$connect();

    console.log('🔄 Connexion à MongoDB...');
    const mongoDB = await connectMongo();
    app.locals.mongoDB = mongoDB;

    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
  } catch (error) {
    console.error('❌ Erreur critique :', error);
    process.exit(1);
  }
}

startServer();

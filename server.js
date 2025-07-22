// server.js
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
    } catch (error) {
      console.log(`❌ MariaDB non prêt (${error.code}), nouvelle tentative...`);
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
    console.log('✅ Connexion à MariaDB réussie !');

    console.log('🔄 Connexion à MongoDB...');
    const mongoDB = await connectMongo();
    app.locals.mongoDB = mongoDB;
    console.log('✅ Connexion à MongoDB réussie !');

    // Démarrer le serveur Express
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
      console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });

    // Gestion propre de l'arrêt
    process.on('SIGTERM', async () => {
      console.log('📴 Signal SIGTERM reçu, arrêt propre...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('📴 Signal SIGINT reçu, arrêt propre...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('❌ Erreur critique lors du démarrage :', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

startServer();

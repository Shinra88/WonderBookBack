// tests/setup.js
console.log('🧪 Configuration de test chargée');

// Variables d'environnement pour les tests
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.MYSQL_HOST = 'localhost';
process.env.MYSQL_USER = 'test';
process.env.MYSQL_ROOT_PASSWORD = 'test';
process.env.MYSQL_DATABASE = 'test';
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';

// Configuration des timeouts
jest.setTimeout(10000);

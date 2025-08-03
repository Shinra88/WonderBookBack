require('dotenv').config({ path: '.env.test' }); // Charger les variables d'environnement depuis .env.test

console.log('🧪 Configuration de test chargée');

// Configuration des timeouts
jest.setTimeout(10000);

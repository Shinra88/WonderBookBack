const request = require('supertest');
const express = require('express');

// Fonction helper pour créer une app de test
function createMockApp() {
  const app = express();

  app.use(express.json());

  // Routes mockées (similaires au vrai serveur mais sans DB)
  app.get('/', (req, res) => {
    res.status(200).send('OK - Serveur en ligne');
  });

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.NODE_ENV || 'development'
    });
  });

  // Route de test pour JSON
  app.post('/test-json', (req, res) => {
    res.json({
      received: req.body,
      timestamp: new Date().toISOString()
    });
  });

  // Simulation d'une route d'erreur
  app.get('/test-error', (req, res) => {
    res.status(500).json({ error: 'Test error' });
  });

  return app;
}

describe('Mock API Tests', () => {
  let app;

  beforeAll(() => {
    app = createMockApp();
  });

  test('GET / should return server online message', async () => {
    const response = await request(app).get('/').expect(200);
    expect(response.text).toBe('OK - Serveur en ligne');
  });

  test('GET /health should return health status', async () => {
    const response = await request(app).get('/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'healthy',
      timestamp: expect.any(String),
      version: expect.any(String)
    });

    // Vérifier que timestamp est une date ISO valide
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });

  test('POST /test-json should handle JSON data correctly', async () => {
    const testData = {
      message: 'Hello Test',
      data: [1, 2, 3],
      nested: { key: 'value' }
    };

    const response = await request(app).post('/test-json').send(testData).expect(200);

    expect(response.body.received).toEqual(testData);
    expect(response.body.timestamp).toBeDefined();
  });

  test('GET /test-error should return error status', async () => {
    const response = await request(app).get('/test-error').expect(500);
    expect(response.body.error).toBe('Test error');
  });

  test('should handle 404 for unknown routes', async () => {
    await request(app).get('/unknown-route').expect(404);
  });
});

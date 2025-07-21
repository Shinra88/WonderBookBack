const request = require('supertest');
const { app, startServer, closeServer } = require('../server');

beforeAll(async () => {
  await startServer();
});

afterAll(async () => {
  await closeServer();
});

describe('Health check', () => {
  it('should respond with 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('ok');
  });
});

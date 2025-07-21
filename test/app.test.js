const request = require('supertest');
const app = require('../server'); // adapte selon ton fichier principal

describe('Health check', () => {
  it('should respond with 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body.status).toBe('ok');
  });
});

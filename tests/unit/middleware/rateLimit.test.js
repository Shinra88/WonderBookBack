// tests/unit/middleware/rateLimit.test.js
const loginLimiter = require('../../../middleware/rateLimit');

describe('loginLimiter middleware', () => {
  test('should export a function', () => {
    expect(typeof loginLimiter).toBe('function');
  });

  test('should be defined', () => {
    expect(loginLimiter).toBeDefined();
  });

  test('should have length property (middleware signature)', () => {
    // Les middlewares Express ont généralement 3 paramètres (req, res, next)
    expect(loginLimiter.length).toBeGreaterThanOrEqual(3);
  });
});

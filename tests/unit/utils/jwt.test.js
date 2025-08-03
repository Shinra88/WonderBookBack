// tests/unit/utils/jwt.test.js
const { generateToken, verifyToken } = require('../../../utils/jwt');

describe('JWT Utils', () => {
  beforeAll(() => {
    // S'assurer que JWT_SECRET est défini pour les tests
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('generateToken', () => {
    test('should generate a valid token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = generateToken(payload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    // Supprimez ce test car votre fonction a une valeur par défaut
    // test('should throw error when SECRET is not defined', () => {
    //   ...
    // });
  });

  describe('verifyToken', () => {
    test('should verify a valid token', () => {
      const payload = { userId: 1, email: 'test@example.com' };
      const token = generateToken(payload);

      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid-token');
      }).toThrow();
    });

    test('should throw error for malformed token', () => {
      expect(() => {
        verifyToken('not.a.valid.jwt.token');
      }).toThrow();
    });
  });
});

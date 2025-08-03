// tests/unit/middleware/authenticate.test.js
const jwt = require('jsonwebtoken');

// Mock JWT
jest.mock('jsonwebtoken');

// Mock Prisma au niveau du module
const mockFindUnique = jest.fn();
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: mockFindUnique
    }
  }))
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('authenticate middleware', () => {
  let req, res, next, authenticate;

  beforeEach(() => {
    // Importer après les mocks
    authenticate = require('../../../middleware/authenticate');

    req = {
      headers: {}
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should return 401 when no token provided', async () => {
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when authorization header is malformed', async () => {
    req.headers.authorization = 'InvalidFormat';

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token manquant' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 403 when token is invalid', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when user not found', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ userId: 1 });
    mockFindUnique.mockResolvedValue(null);

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Utilisateur introuvable.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should authenticate successfully and call next', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ userId: 1 });

    const mockUser = {
      userId: 1,
      name: 'Test User',
      avatar: 'avatar.jpg',
      role: 'user'
    };

    mockFindUnique.mockResolvedValue(mockUser);

    await authenticate(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-key-for-testing-only');
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { userId: 1 },
      select: {
        userId: true,
        name: true,
        avatar: true,
        role: true
      }
    });
    expect(req.user).toEqual(mockUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should handle database errors', async () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ userId: 1 });
    mockFindUnique.mockRejectedValue(new Error('Database error'));

    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Token invalide ou expiré' });
    expect(next).not.toHaveBeenCalled();
  });
});

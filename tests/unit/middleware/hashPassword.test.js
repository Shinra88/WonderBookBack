// tests/unit/middleware/hashPassword.test.js
const hashPassword = require('../../../middleware/hashPassword');
const bcrypt = require('bcryptjs');

// Mock bcrypt
jest.mock('bcryptjs');

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('hashPassword middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {}
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should return 400 when password is missing', async () => {
    await hashPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe requis.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 400 when password is empty string', async () => {
    req.body.password = '';

    await hashPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe requis.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should hash password and call next when successful', async () => {
    req.body.password = 'plainTextPassword';
    const hashedPassword = 'hashedPassword123';

    bcrypt.hash.mockResolvedValue(hashedPassword);

    await hashPassword(req, res, next);

    expect(bcrypt.hash).toHaveBeenCalledWith('plainTextPassword', 10);
    expect(req.body.password).toBe(hashedPassword);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 500 when bcrypt.hash throws error', async () => {
    req.body.password = 'password123';

    bcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

    await hashPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Erreur lors du hash du mot de passe.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should preserve other body properties', async () => {
    req.body = {
      email: 'test@example.com',
      name: 'Test User',
      password: 'password123'
    };

    bcrypt.hash.mockResolvedValue('hashedPassword');

    await hashPassword(req, res, next);

    expect(req.body.email).toBe('test@example.com');
    expect(req.body.name).toBe('Test User');
    expect(req.body.password).toBe('hashedPassword');
    expect(next).toHaveBeenCalled();
  });

  test('should handle null password', async () => {
    req.body.password = null;

    await hashPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe requis.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle undefined password explicitly', async () => {
    req.body.password = undefined;

    await hashPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe requis.' });
    expect(next).not.toHaveBeenCalled();
  });
});

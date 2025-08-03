// tests/unit/middleware/authorizeRoles.test.js
const authorizeRoles = require('../../../middleware/authorizeRoles');

describe('authorizeRoles middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    next = jest.fn();

    jest.clearAllMocks();
  });

  test('should return 403 when req.user is not set', () => {
    const middleware = authorizeRoles('admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès interdit.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 403 when user role is not allowed', () => {
    req.user = { role: 'user' };
    const middleware = authorizeRoles('admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès interdit.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should call next when user has allowed role', () => {
    req.user = { role: 'admin' };
    const middleware = authorizeRoles('admin');

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  test('should work with multiple allowed roles', () => {
    req.user = { role: 'moderator' };
    const middleware = authorizeRoles('admin', 'moderator', 'editor');

    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 403 when user role not in multiple allowed roles', () => {
    req.user = { role: 'user' };
    const middleware = authorizeRoles('admin', 'moderator', 'editor');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès interdit.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 403 when user role is undefined', () => {
    req.user = { name: 'Test User' }; // pas de role défini
    const middleware = authorizeRoles('admin');

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès interdit.' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should be case sensitive for roles', () => {
    req.user = { role: 'Admin' }; // Majuscule
    const middleware = authorizeRoles('admin'); // minuscule

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Accès interdit.' });
    expect(next).not.toHaveBeenCalled();
  });
});

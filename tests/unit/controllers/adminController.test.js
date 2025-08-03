// tests/unit/controllers/adminController.test.js

// Mock Prisma en premier
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: mockFindMany,
      count: mockCount,
      update: mockUpdate,
      delete: mockDelete
    }
  }))
}));

// Importer APRÈS les mocks
const adminController = require('../../../controllers/adminController');

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AdminController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {}
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    test('should get all users with default pagination', async () => {
      const mockUsers = [
        { userId: 1, name: 'User 1', mail: 'user1@test.com', role: 'user' },
        { userId: 2, name: 'User 2', mail: 'user2@test.com', role: 'admin' }
      ];

      mockFindMany.mockResolvedValue(mockUsers);
      mockCount.mockResolvedValue(2);

      await adminController.getAllUsers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { name: { contains: '' } },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
        select: {
          userId: true,
          name: true,
          mail: true,
          role: true,
          created_at: true,
          avatar: true,
          aboutMe: true,
          status: true
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        users: mockUsers,
        total: 2
      });
    });

    test('should handle pagination parameters', async () => {
      req.query = { page: '2', limit: '5' };

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await adminController.getAllUsers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { name: { contains: '' } },
        skip: 5,
        take: 5,
        orderBy: { created_at: 'desc' },
        select: expect.any(Object)
      });
    });

    test('should handle database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      await adminController.getAllUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  describe('updateUser', () => {
    test('should update user successfully', async () => {
      req.params = { id: '1' };
      req.body = { role: 'admin', name: 'Updated Name', mail: 'updated@test.com' };

      const mockUpdatedUser = { userId: 1, role: 'admin', name: 'Updated Name' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      await adminController.updateUser(req, res);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { role: 'admin', name: 'Updated Name', mail: 'updated@test.com' }
      });

      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur mis à jour',
        user: mockUpdatedUser
      });
    });
  });

  describe('deleteUser', () => {
    test('should delete user successfully', async () => {
      req.params = { id: '1' };

      mockDelete.mockResolvedValue({ userId: 1 });

      await adminController.deleteUser(req, res);

      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId: 1 }
      });

      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur supprimé'
      });
    });
  });

  describe('updateUserStatus', () => {
    test('should update user status successfully', async () => {
      req.params = { id: '1' };
      req.body = { status: 'suspended' };

      const mockUpdatedUser = { userId: 1, status: 'suspended' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      await adminController.updateUserStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Statut mis à jour',
        user: mockUpdatedUser
      });
    });

    test('should return 400 for invalid status', async () => {
      req.params = { id: '1' };
      req.body = { status: 'invalid-status' };

      await adminController.updateUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Statut invalide.' });
    });
  });
});

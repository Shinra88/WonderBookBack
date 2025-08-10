// tests/unit/controllers/adminController.test.js

// Mock Prisma en premier
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
      update: mockUpdate,
      delete: mockDelete
    }
  }))
}));

// Mock du module logsController
jest.mock('../../../controllers/logsController', () => ({
  createLog: jest.fn(),
  LOG_ACTIONS: {
    USER_ROLE_CHANGED: 'Rôle utilisateur modifié',
    USER_PROFILE_UPDATED: 'Profil utilisateur modifié',
    USER_SUSPENDED: 'Utilisateur suspendu',
    USER_ACTIVATED: 'Utilisateur activé',
    USER_BANNED: 'Utilisateur banni'
  }
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer APRÈS les mocks
const adminController = require('../../../controllers/adminController');
const { createLog } = require('../../../controllers/logsController');

describe('AdminController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { userId: 99 } // mock user for logging purposes
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getAllUsers', () => {
    const mockUsers = [
      { userId: 1, name: 'User 1', mail: 'user1@test.com', role: 'user', status: 'active' },
      { userId: 2, name: 'User 2', mail: 'user2@test.com', role: 'admin', status: 'active' }
    ];

    test('should get all users with default pagination', async () => {
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
        skip: 5, // (2-1) * 5
        take: 5,
        orderBy: { created_at: 'desc' },
        select: expect.any(Object)
      });
    });

    test('should handle search parameter', async () => {
      req.query = { search: 'John' };

      mockFindMany.mockResolvedValue([mockUsers[0]]);
      mockCount.mockResolvedValue(1);

      await adminController.getAllUsers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { name: { contains: 'john' } }, // toLowerCase applied
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
        select: expect.any(Object)
      });
    });

    test('should handle status filter', async () => {
      req.query = { status: 'suspended' };

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await adminController.getAllUsers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          name: { contains: '' },
          status: 'suspended'
        },
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
        select: expect.any(Object)
      });
    });

    test('should handle status "all" filter', async () => {
      req.query = { status: 'all' };

      mockFindMany.mockResolvedValue(mockUsers);
      mockCount.mockResolvedValue(2);

      await adminController.getAllUsers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { name: { contains: '' } }, // no status filter when "all"
        skip: 0,
        take: 10,
        orderBy: { created_at: 'desc' },
        select: expect.any(Object)
      });
    });

    test('should handle combined search and status filters', async () => {
      req.query = { search: 'Admin', status: 'active' };

      mockFindMany.mockResolvedValue([mockUsers[1]]);
      mockCount.mockResolvedValue(1);

      await adminController.getAllUsers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          name: { contains: 'admin' },
          status: 'active'
        },
        skip: 0,
        take: 10,
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
    test('should update user successfully with role change', async () => {
      req.params = { id: '1' };
      req.body = { role: 'admin', name: 'Updated Name', mail: 'updated@test.com' };

      // Mock findUnique before update
      mockFindUnique.mockResolvedValue({
        role: 'user',
        name: 'Old Name',
        mail: 'old@test.com'
      });

      const mockUpdatedUser = {
        userId: 1,
        role: 'admin',
        name: 'Updated Name',
        mail: 'updated@test.com'
      };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUser(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: { role: true, name: true, mail: true }
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { role: 'admin', name: 'Updated Name', mail: 'updated@test.com' }
      });

      // Vérifier les logs créés
      expect(createLog).toHaveBeenCalledWith(
        99,
        'Rôle utilisateur modifié : user → admin',
        1,
        'user'
      );

      expect(createLog).toHaveBeenCalledWith(99, 'Profil utilisateur modifié', 1, 'user');

      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur mis à jour',
        user: mockUpdatedUser
      });
    });

    test('should update user without role change but with profile change', async () => {
      req.params = { id: '1' };
      req.body = { role: 'user', name: 'New Name', mail: 'new@test.com' };

      // Mock findUnique - même rôle mais nom/email différents
      mockFindUnique.mockResolvedValue({
        role: 'user',
        name: 'Old Name',
        mail: 'old@test.com'
      });

      const mockUpdatedUser = {
        userId: 1,
        role: 'user',
        name: 'New Name',
        mail: 'new@test.com'
      };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUser(req, res);

      // Pas de log de changement de rôle
      expect(createLog).not.toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining('Rôle utilisateur modifié'),
        expect.any(Number),
        expect.any(String)
      );

      // Mais log de mise à jour de profil
      expect(createLog).toHaveBeenCalledWith(99, 'Profil utilisateur modifié', 1, 'user');
    });

    test('should update user without any changes', async () => {
      req.params = { id: '1' };
      req.body = { role: 'user', name: 'Same Name', mail: 'same@test.com' };

      // Mock findUnique - valeurs identiques
      mockFindUnique.mockResolvedValue({
        role: 'user',
        name: 'Same Name',
        mail: 'same@test.com'
      });

      const mockUpdatedUser = {
        userId: 1,
        role: 'user',
        name: 'Same Name',
        mail: 'same@test.com'
      };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUser(req, res);

      // Aucun log ne devrait être créé
      expect(createLog).not.toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur mis à jour',
        user: mockUpdatedUser
      });
    });

    test('should handle log creation errors gracefully', async () => {
      req.params = { id: '1' };
      req.body = { role: 'admin', name: 'Updated Name', mail: 'updated@test.com' };

      mockFindUnique.mockResolvedValue({
        role: 'user',
        name: 'Old Name',
        mail: 'old@test.com'
      });

      const mockUpdatedUser = { userId: 1, role: 'admin' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);

      // Simuler une erreur lors de la création du log
      createLog.mockRejectedValue(new Error('Log creation failed'));

      await adminController.updateUser(req, res);

      // L'erreur de log ne doit pas empêcher la réponse
      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur mis à jour',
        user: mockUpdatedUser
      });

      expect(console.error).toHaveBeenCalledWith(
        '⚠️ Erreur lors de la création du log:',
        expect.any(Error)
      );
    });

    test('should handle database errors', async () => {
      req.params = { id: '1' };
      req.body = { role: 'admin' };

      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await adminController.updateUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  describe('deleteUser', () => {
    test('should delete user successfully', async () => {
      req.params = { id: '1' };

      // Mock findUnique before delete
      mockFindUnique.mockResolvedValue({ name: 'User To Delete' });
      mockDelete.mockResolvedValue({ userId: 1 });
      createLog.mockResolvedValue();

      await adminController.deleteUser(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: { name: true }
      });

      expect(mockDelete).toHaveBeenCalledWith({
        where: { userId: 1 }
      });

      expect(createLog).toHaveBeenCalledWith(
        99,
        'Utilisateur supprimé : User To Delete',
        1,
        'user'
      );

      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur supprimé'
      });
    });

    test('should delete user with unknown name', async () => {
      req.params = { id: '1' };

      // Mock findUnique returning null
      mockFindUnique.mockResolvedValue(null);
      mockDelete.mockResolvedValue({ userId: 1 });
      createLog.mockResolvedValue();

      await adminController.deleteUser(req, res);

      expect(createLog).toHaveBeenCalledWith(99, 'Utilisateur supprimé : Inconnu', 1, 'user');
    });

    test('should handle log creation errors gracefully', async () => {
      req.params = { id: '1' };

      mockFindUnique.mockResolvedValue({ name: 'User To Delete' });
      mockDelete.mockResolvedValue({ userId: 1 });
      createLog.mockRejectedValue(new Error('Log creation failed'));

      await adminController.deleteUser(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Utilisateur supprimé'
      });

      expect(console.error).toHaveBeenCalledWith(
        '⚠️ Erreur lors de la création du log:',
        expect.any(Error)
      );
    });

    test('should handle database errors', async () => {
      req.params = { id: '1' };

      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await adminController.deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  describe('updateUserStatus', () => {
    test('should update user status to suspended', async () => {
      req.params = { id: '1' };
      req.body = { status: 'suspended' };

      mockFindUnique.mockResolvedValue({ status: 'active', name: 'User Status' });
      const mockUpdatedUser = { userId: 1, status: 'suspended' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUserStatus(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
        select: { status: true, name: true }
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { status: 'suspended' }
      });

      expect(createLog).toHaveBeenCalledWith(99, 'Utilisateur suspendu : User Status', 1, 'user');

      expect(res.json).toHaveBeenCalledWith({
        message: 'Statut mis à jour',
        user: mockUpdatedUser
      });
    });

    test('should update user status to active', async () => {
      req.params = { id: '1' };
      req.body = { status: 'active' };

      mockFindUnique.mockResolvedValue({ status: 'suspended', name: 'User Status' });
      const mockUpdatedUser = { userId: 1, status: 'active' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUserStatus(req, res);

      expect(createLog).toHaveBeenCalledWith(99, 'Utilisateur activé : User Status', 1, 'user');
    });

    test('should update user status to banned', async () => {
      req.params = { id: '1' };
      req.body = { status: 'banned' };

      mockFindUnique.mockResolvedValue({ status: 'active', name: 'User Status' });
      const mockUpdatedUser = { userId: 1, status: 'banned' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUserStatus(req, res);

      expect(createLog).toHaveBeenCalledWith(99, 'Utilisateur banni : User Status', 1, 'user');
    });

    test('should handle user with unknown name', async () => {
      req.params = { id: '1' };
      req.body = { status: 'suspended' };

      mockFindUnique.mockResolvedValue({ status: 'active', name: null });
      const mockUpdatedUser = { userId: 1, status: 'suspended' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockResolvedValue();

      await adminController.updateUserStatus(req, res);

      expect(createLog).toHaveBeenCalledWith(
        99,
        'Utilisateur suspendu : Utilisateur inconnu',
        1,
        'user'
      );
    });

    test('should return 400 for invalid status', async () => {
      req.params = { id: '1' };
      req.body = { status: 'invalid-status' };

      await adminController.updateUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Statut invalide.' });

      // Aucune opération de base de données ne devrait être effectuée
      expect(mockFindUnique).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    test('should handle log creation errors gracefully', async () => {
      req.params = { id: '1' };
      req.body = { status: 'suspended' };

      mockFindUnique.mockResolvedValue({ status: 'active', name: 'User Status' });
      const mockUpdatedUser = { userId: 1, status: 'suspended' };
      mockUpdate.mockResolvedValue(mockUpdatedUser);
      createLog.mockRejectedValue(new Error('Log creation failed'));

      await adminController.updateUserStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Statut mis à jour',
        user: mockUpdatedUser
      });

      expect(console.error).toHaveBeenCalledWith(
        '⚠️ Erreur lors de la création du log:',
        expect.any(Error)
      );
    });

    test('should handle database errors', async () => {
      req.params = { id: '1' };
      req.body = { status: 'suspended' };

      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await adminController.updateUserStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });
});

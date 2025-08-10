// tests/unit/controllers/logsController.test.js

// Mock Prisma
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockGroupBy = jest.fn();
const mockCreate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    logs: {
      findMany: mockFindMany,
      count: mockCount,
      groupBy: mockGroupBy,
      create: mockCreate
    },
    user: {
      findMany: mockFindMany
    }
  }))
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const logsController = require('../../../controllers/logsController');

describe('LogsController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      query: {},
      body: {},
      user: { userId: 1 }
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getAllLogs', () => {
    const mockLogs = [
      {
        logId: 1,
        userId: 1,
        action: 'Livre ajouté',
        targetId: 1,
        targetType: 'book',
        created_at: new Date('2024-01-01'),
        user: {
          userId: 1,
          name: 'John Doe',
          role: 'admin'
        }
      },
      {
        logId: 2,
        userId: 2,
        action: 'Commentaire ajouté',
        targetId: 2,
        targetType: 'comment',
        created_at: new Date('2024-01-02'),
        user: {
          userId: 2,
          name: 'Jane Smith',
          role: 'user'
        }
      },
      // ✅ NOUVEAU : Logs forum pour les tests
      {
        logId: 3,
        userId: 1,
        action: 'Sujet créé: "Discussion test"',
        targetId: 'topic123',
        targetType: 'forum_topic',
        created_at: new Date('2024-01-03'),
        user: {
          userId: 1,
          name: 'John Doe',
          role: 'admin'
        }
      },
      {
        logId: 4,
        userId: 2,
        action: 'Post ajouté dans le sujet "Discussion test"',
        targetId: 'post456',
        targetType: 'forum_post',
        created_at: new Date('2024-01-04'),
        user: {
          userId: 2,
          name: 'Jane Smith',
          role: 'user'
        }
      }
    ];

    test('should get all logs with default pagination', async () => {
      mockFindMany.mockResolvedValue(mockLogs);
      mockCount.mockResolvedValue(4);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });

      expect(mockCount).toHaveBeenCalledWith({ where: {} });

      expect(res.json).toHaveBeenCalledWith({
        logs: mockLogs,
        total: 4,
        pagination: {
          page: 1,
          limit: 50,
          totalPages: 1
        }
      });
    });

    test('should get logs with custom pagination', async () => {
      req.query = { page: '2', limit: '10' };

      mockFindMany.mockResolvedValue(mockLogs);
      mockCount.mockResolvedValue(25);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 10, // (2-1) * 10
        take: 10
      });

      expect(res.json).toHaveBeenCalledWith({
        logs: mockLogs,
        total: 25,
        pagination: {
          page: 2,
          limit: 10,
          totalPages: 3
        }
      });
    });

    test('should filter logs by userId', async () => {
      req.query = { userId: '1' };

      mockFindMany.mockResolvedValue([mockLogs[0]]);
      mockCount.mockResolvedValue(1);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    // ✅ NOUVEAU : Test pour filtrer par targetType forum
    test('should filter logs by forum targetType', async () => {
      req.query = { targetType: 'forum_topic' };

      mockFindMany.mockResolvedValue([mockLogs[2]]);
      mockCount.mockResolvedValue(1);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { targetType: 'forum_topic' },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    test('should filter logs by action', async () => {
      req.query = { action: 'ajouté' };

      mockFindMany.mockResolvedValue(mockLogs);
      mockCount.mockResolvedValue(4);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { action: { contains: 'ajouté' } },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    test('should filter logs by date range', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      mockFindMany.mockResolvedValue(mockLogs);
      mockCount.mockResolvedValue(4);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          created_at: {
            gte: new Date('2024-01-01'),
            lte: new Date('2024-01-31')
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    test('should filter logs by startDate only', async () => {
      req.query = { startDate: '2024-01-01' };

      mockFindMany.mockResolvedValue(mockLogs);
      mockCount.mockResolvedValue(4);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          created_at: {
            gte: new Date('2024-01-01')
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    test('should filter logs by endDate only', async () => {
      req.query = { endDate: '2024-01-31' };

      mockFindMany.mockResolvedValue(mockLogs);
      mockCount.mockResolvedValue(4);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          created_at: {
            lte: new Date('2024-01-31')
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    test('should handle multiple filters', async () => {
      req.query = {
        userId: '1',
        targetType: 'book',
        action: 'ajouté',
        startDate: '2024-01-01'
      };

      mockFindMany.mockResolvedValue([mockLogs[0]]);
      mockCount.mockResolvedValue(1);

      await logsController.getAllLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          targetType: 'book',
          action: { contains: 'ajouté' },
          created_at: {
            gte: new Date('2024-01-01')
          }
        },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 50
      });
    });

    test('should handle database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      await logsController.getAllLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur serveur lors de la récupération des logs'
      });
    });
  });

  describe('getUserLogs', () => {
    const mockUserLogs = [
      {
        logId: 1,
        userId: 1,
        action: 'Livre ajouté',
        targetId: 1,
        targetType: 'book',
        created_at: new Date('2024-01-01'),
        user: {
          userId: 1,
          name: 'John Doe',
          role: 'admin'
        }
      }
    ];

    test('should get user logs with default pagination', async () => {
      req.params = { userId: '1' };

      mockFindMany.mockResolvedValue(mockUserLogs);
      mockCount.mockResolvedValue(1);

      await logsController.getUserLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 0,
        take: 20
      });

      expect(mockCount).toHaveBeenCalledWith({ where: { userId: 1 } });

      expect(res.json).toHaveBeenCalledWith({
        logs: mockUserLogs,
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 1
        }
      });
    });

    test('should get user logs with custom pagination', async () => {
      req.params = { userId: '2' };
      req.query = { page: '2', limit: '5' };

      mockFindMany.mockResolvedValue(mockUserLogs);
      mockCount.mockResolvedValue(10);

      await logsController.getUserLogs(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 2 },
        include: {
          user: {
            select: {
              userId: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: {
          created_at: 'desc'
        },
        skip: 5, // (2-1) * 5
        take: 5
      });

      expect(res.json).toHaveBeenCalledWith({
        logs: mockUserLogs,
        total: 10,
        pagination: {
          page: 2,
          limit: 5,
          totalPages: 2
        }
      });
    });

    test('should handle database errors', async () => {
      req.params = { userId: '1' };
      mockFindMany.mockRejectedValue(new Error('Database error'));

      await logsController.getUserLogs(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur serveur lors de la récupération des logs utilisateur'
      });
    });
  });

  describe('getLogsStats', () => {
    const mockActionStats = [
      { targetType: 'book', _count: { logId: 10 } },
      { targetType: 'comment', _count: { logId: 5 } },
      // ✅ NOUVEAU : Stats forum
      { targetType: 'forum_topic', _count: { logId: 3 } },
      { targetType: 'forum_post', _count: { logId: 7 } }
    ];

    const mockUserStats = [
      { userId: 1, _count: { logId: 8 } },
      { userId: 2, _count: { logId: 3 } }
    ];

    const mockUsers = [
      { userId: 1, name: 'John Doe', role: 'admin' },
      { userId: 2, name: 'Jane Smith', role: 'user' }
    ];

    test('should get logs statistics without date filter', async () => {
      mockGroupBy
        .mockResolvedValueOnce(mockActionStats) // Premier appel pour actionStats
        .mockResolvedValueOnce(mockUserStats); // Deuxième appel pour userStats

      mockFindMany.mockResolvedValue(mockUsers);

      await logsController.getLogsStats(req, res);

      // Vérifier les appels groupBy
      expect(mockGroupBy).toHaveBeenCalledWith({
        by: ['targetType'],
        where: {},
        _count: {
          logId: true
        }
      });

      expect(mockGroupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: {},
        _count: {
          logId: true
        },
        orderBy: {
          _count: {
            logId: 'desc'
          }
        },
        take: 10
      });

      // Vérifier l'appel pour récupérer les infos utilisateurs
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: {
            in: [1, 2]
          }
        },
        select: {
          userId: true,
          name: true,
          role: true
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        actionStats: mockActionStats,
        userStats: [
          {
            userId: 1,
            _count: { logId: 8 },
            user: { userId: 1, name: 'John Doe', role: 'admin' }
          },
          {
            userId: 2,
            _count: { logId: 3 },
            user: { userId: 2, name: 'Jane Smith', role: 'user' }
          }
        ]
      });
    });

    test('should get logs statistics with date filter', async () => {
      req.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      };

      const expectedWhere = {
        created_at: {
          gte: new Date('2024-01-01'),
          lte: new Date('2024-01-31')
        }
      };

      mockGroupBy.mockResolvedValueOnce(mockActionStats).mockResolvedValueOnce(mockUserStats);

      mockFindMany.mockResolvedValue(mockUsers);

      await logsController.getLogsStats(req, res);

      expect(mockGroupBy).toHaveBeenCalledWith({
        by: ['targetType'],
        where: expectedWhere,
        _count: {
          logId: true
        }
      });

      expect(mockGroupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: expectedWhere,
        _count: {
          logId: true
        },
        orderBy: {
          _count: {
            logId: 'desc'
          }
        },
        take: 10
      });
    });

    test('should get logs statistics with startDate only', async () => {
      req.query = { startDate: '2024-01-01' };

      const expectedWhere = {
        created_at: {
          gte: new Date('2024-01-01')
        }
      };

      mockGroupBy.mockResolvedValueOnce(mockActionStats).mockResolvedValueOnce(mockUserStats);

      mockFindMany.mockResolvedValue(mockUsers);

      await logsController.getLogsStats(req, res);

      expect(mockGroupBy).toHaveBeenCalledWith({
        by: ['targetType'],
        where: expectedWhere,
        _count: {
          logId: true
        }
      });
    });

    test('should get logs statistics with endDate only', async () => {
      req.query = { endDate: '2024-01-31' };

      const expectedWhere = {
        created_at: {
          lte: new Date('2024-01-31')
        }
      };

      mockGroupBy.mockResolvedValueOnce(mockActionStats).mockResolvedValueOnce(mockUserStats);

      mockFindMany.mockResolvedValue(mockUsers);

      await logsController.getLogsStats(req, res);

      expect(mockGroupBy).toHaveBeenCalledWith({
        by: ['targetType'],
        where: expectedWhere,
        _count: {
          logId: true
        }
      });
    });

    test('should handle empty user stats', async () => {
      mockGroupBy.mockResolvedValueOnce(mockActionStats).mockResolvedValueOnce([]); // Pas d'utilisateurs

      mockFindMany.mockResolvedValue([]);

      await logsController.getLogsStats(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: {
            in: []
          }
        },
        select: {
          userId: true,
          name: true,
          role: true
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        actionStats: mockActionStats,
        userStats: []
      });
    });

    test('should handle database errors', async () => {
      mockGroupBy.mockRejectedValue(new Error('Database error'));

      await logsController.getLogsStats(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur serveur lors de la récupération des statistiques'
      });
    });
  });

  describe('createLog', () => {
    test('should create a log successfully', async () => {
      const mockLog = {
        logId: 1,
        userId: 1,
        action: 'Livre ajouté',
        targetId: 1,
        targetType: 'book',
        created_at: new Date()
      };

      mockCreate.mockResolvedValue(mockLog);

      const result = await logsController.createLog(1, 'Livre ajouté', 1, 'book');

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          action: 'Livre ajouté',
          targetId: 1,
          targetType: 'book'
        }
      });

      expect(result).toEqual(mockLog);
    });

    // ✅ NOUVEAU : Test pour créer un log forum
    test('should create a forum log successfully', async () => {
      const mockLog = {
        logId: 2,
        userId: 1,
        action: 'Sujet créé: "Discussion test"',
        targetId: 'topic123',
        targetType: 'forum_topic',
        created_at: new Date()
      };

      mockCreate.mockResolvedValue(mockLog);

      const result = await logsController.createLog(
        1,
        'Sujet créé: "Discussion test"',
        'topic123',
        'forum_topic'
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 1,
          action: 'Sujet créé: "Discussion test"',
          targetId: 'topic123',
          targetType: 'forum_topic'
        }
      });

      expect(result).toEqual(mockLog);
    });

    test('should create a log with null targetId and targetType', async () => {
      const mockLog = {
        logId: 3,
        userId: 2,
        action: 'Connexion',
        targetId: null,
        targetType: null,
        created_at: new Date()
      };

      mockCreate.mockResolvedValue(mockLog);

      const result = await logsController.createLog(2, 'Connexion');

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 2,
          action: 'Connexion',
          targetId: null,
          targetType: null
        }
      });

      expect(result).toEqual(mockLog);
    });

    test('should handle database errors', async () => {
      mockCreate.mockRejectedValue(new Error('Database error'));

      await expect(logsController.createLog(1, 'Test action')).rejects.toThrow('Database error');

      expect(console.error).toHaveBeenCalledWith('❌ Erreur createLog:', expect.any(Error));
    });
  });

  describe('LOG_ACTIONS', () => {
    test('should have all predefined log actions', () => {
      expect(logsController.LOG_ACTIONS).toEqual({
        // Actions sur les livres
        BOOK_ADDED: 'Livre ajouté',
        BOOK_VALIDATED: 'Livre validé',
        BOOK_DENIED: 'Livre refusé',
        BOOK_UPDATED: 'Livre modifié',
        BOOK_DELETED: 'Livre supprimé',

        // Actions sur les utilisateurs
        USER_SUSPENDED: 'Utilisateur suspendu',
        USER_ACTIVATED: 'Utilisateur activé',
        USER_BANNED: 'Utilisateur banni',
        USER_ROLE_CHANGED: 'Rôle utilisateur modifié',
        USER_PROFILE_UPDATED: 'Profil utilisateur modifié',

        // Actions sur les commentaires
        COMMENT_ADDED: 'Commentaire ajouté',
        COMMENT_UPDATED: 'Commentaire modifié',
        COMMENT_DELETED: 'Commentaire supprimé',

        // ✅ CORRIGÉ : Actions sur le forum - Sujets
        SUBJECT_CREATED: 'Sujet créé',
        SUBJECT_UPDATED: 'Sujet modifié',
        SUBJECT_DELETED: 'Sujet supprimé',

        // ✅ NOUVEAU : Actions sur le forum - Posts
        POST_ADDED: 'Post ajouté',
        POST_UPDATED: 'Post modifié',
        POST_DELETED: 'Post supprimé'
      });
    });

    test('should have correct number of log actions', () => {
      const actions = Object.keys(logsController.LOG_ACTIONS);
      expect(actions).toHaveLength(19); // ✅ CORRIGÉ : 16 + 3 nouvelles actions = 19
    });

    // ✅ NOUVEAU : Tests spécifiques pour les actions forum
    test('should have forum post actions', () => {
      expect(logsController.LOG_ACTIONS.POST_ADDED).toBe('Post ajouté');
      expect(logsController.LOG_ACTIONS.POST_UPDATED).toBe('Post modifié');
      expect(logsController.LOG_ACTIONS.POST_DELETED).toBe('Post supprimé');
    });

    test('should have forum subject actions', () => {
      expect(logsController.LOG_ACTIONS.SUBJECT_CREATED).toBe('Sujet créé');
      expect(logsController.LOG_ACTIONS.SUBJECT_UPDATED).toBe('Sujet modifié');
      expect(logsController.LOG_ACTIONS.SUBJECT_DELETED).toBe('Sujet supprimé');
    });
  });
});

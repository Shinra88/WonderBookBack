// tests/unit/controllers/publisherController.test.js

// Mock Prisma
const mockFindMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    publishers: {
      findMany: mockFindMany
    }
  }))
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const publisherController = require('../../../controllers/publisherController');

describe('PublisherController', () => {
  let req, res;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getAllPublishers', () => {
    test('should get all publishers successfully', async () => {
      const mockPublishers = [
        { publisherId: 1, name: 'Éditions Gallimard' },
        { publisherId: 2, name: 'Hachette Livre' },
        { publisherId: 3, name: 'Éditions du Seuil' }
      ];

      mockFindMany.mockResolvedValue(mockPublishers);

      await publisherController.getAllPublishers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' }
      });

      expect(res.json).toHaveBeenCalledWith(mockPublishers);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      await publisherController.getAllPublishers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la récupération des éditeurs.'
      });
    });

    test('should return empty array when no publishers found', async () => {
      mockFindMany.mockResolvedValue([]);

      await publisherController.getAllPublishers(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return null response from database', async () => {
      mockFindMany.mockResolvedValue(null);

      await publisherController.getAllPublishers(req, res);

      expect(res.json).toHaveBeenCalledWith(null);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle Prisma specific errors', async () => {
      const prismaError = new Error('Prisma error');
      prismaError.code = 'P2021'; // Exemple de code d'erreur Prisma

      mockFindMany.mockRejectedValue(prismaError);

      await publisherController.getAllPublishers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la récupération des éditeurs.'
      });
    });

    test('should verify correct ordering', async () => {
      const mockPublishers = [
        { publisherId: 3, name: 'A Publisher' },
        { publisherId: 1, name: 'B Publisher' },
        { publisherId: 2, name: 'Z Publisher' }
      ];

      mockFindMany.mockResolvedValue(mockPublishers);

      await publisherController.getAllPublishers(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' }
      });

      // Vérifier que les éditeurs sont retournés dans l'ordre attendu
      expect(res.json).toHaveBeenCalledWith(mockPublishers);
    });
  });
});

// tests/unit/controllers/categoryController.test.js

// Mock Prisma
const mockFindMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    categories: {
      findMany: mockFindMany
    }
  }))
}));

// Importer après les mocks
const categoryController = require('../../../controllers/categoryController');

describe('CategoryController', () => {
  let req, res;

  beforeEach(() => {
    req = {};

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    test('should get all categories successfully', async () => {
      const mockCategories = [
        { categoryId: 1, name: 'Fiction' },
        { categoryId: 2, name: 'Non-fiction' },
        { categoryId: 3, name: 'Science-Fiction' }
      ];

      mockFindMany.mockResolvedValue(mockCategories);

      await categoryController.getAllCategories(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        select: {
          categoryId: true,
          name: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      expect(res.json).toHaveBeenCalledWith(mockCategories);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'));

      await categoryController.getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la récupération des catégories.'
      });
    });

    test('should return empty array when no categories found', async () => {
      mockFindMany.mockResolvedValue([]);

      await categoryController.getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle null response from database', async () => {
      mockFindMany.mockResolvedValue(null);

      await categoryController.getAllCategories(req, res);

      expect(res.json).toHaveBeenCalledWith(null);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});

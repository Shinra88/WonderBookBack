// tests/unit/controllers/collectionController.test.js

// Mock Prisma
const mockFindUnique = jest.fn();
const mockFindFirst = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdateMany = jest.fn();
const mockDeleteMany = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    books: {
      findUnique: mockFindUnique
    },
    collection: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      findUnique: mockFindUnique,
      create: mockCreate,
      updateMany: mockUpdateMany,
      deleteMany: mockDeleteMany
    }
  }))
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const collectionController = require('../../../controllers/collectionController');

describe('CollectionController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { userId: 1 },
      body: {},
      params: {},
      query: {}
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('addToCollection', () => {
    test('should add book to collection successfully', async () => {
      req.body = { bookId: 1 };

      mockFindUnique.mockResolvedValue({ bookId: 1, title: 'Test Book' });
      mockFindFirst.mockResolvedValue(null); // Pas déjà dans la collection
      mockCreate.mockResolvedValue({ userId: 1, bookId: 1 });

      await collectionController.addToCollection(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { bookId: 1 } });
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { userId: 1, bookId: 1 } });
      expect(mockCreate).toHaveBeenCalledWith({ data: { userId: 1, bookId: 1 } });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { userId: 1, bookId: 1 }
      });
    });

    test('should return 400 when bookId is missing', async () => {
      req.body = {};

      await collectionController.addToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'ID du livre manquant.' });
    });

    test('should return 404 when book does not exist', async () => {
      req.body = { bookId: 999 };

      mockFindUnique.mockResolvedValue(null);

      await collectionController.addToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Livre introuvable.' });
    });

    test('should return 400 when book already in collection', async () => {
      req.body = { bookId: 1 };

      mockFindUnique.mockResolvedValue({ bookId: 1 });
      mockFindFirst.mockResolvedValue({ userId: 1, bookId: 1 }); // Déjà dans la collection

      await collectionController.addToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Ce livre est déjà dans votre collection.' });
    });

    test('should handle database errors', async () => {
      req.body = { bookId: 1 };

      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await collectionController.addToCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
    });
  });

  describe('getCollection', () => {
    test('should get user collection successfully', async () => {
      const mockCollection = [
        {
          userId: 1,
          bookId: 1,
          is_read: false,
          books: {
            bookId: 1,
            title: 'Test Book',
            book_categories: [],
            book_publishers: [],
            comments: []
          }
        }
      ];

      mockFindMany.mockResolvedValue(mockCollection);

      await collectionController.getCollection(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          books: {}
        },
        include: {
          books: {
            include: {
              book_categories: { include: { categories: true } },
              book_publishers: { include: { publishers: true } },
              comments: true
            }
          }
        }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockCollection);
    });

    test('should filter by year', async () => {
      req.query = { year: '2020' };

      mockFindMany.mockResolvedValue([]);

      await collectionController.getCollection(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          books: {
            date: {
              gte: new Date('2020-01-01'),
              lt: new Date('2021-01-01')
            }
          }
        },
        include: expect.any(Object)
      });
    });

    test('should filter by read status', async () => {
      req.query = { is_read: 'true' };

      mockFindMany.mockResolvedValue([]);

      await collectionController.getCollection(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          is_read: true,
          books: {}
        },
        include: expect.any(Object)
      });
    });

    test('should filter by categories', async () => {
      req.query = { categories: ['Fiction', 'Drama'] };

      mockFindMany.mockResolvedValue([]);

      await collectionController.getCollection(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          books: {
            book_categories: {
              some: {
                categories: {
                  name: { in: ['Fiction', 'Drama'] }
                }
              }
            }
          }
        },
        include: expect.any(Object)
      });
    });

    test('should handle database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      await collectionController.getCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
    });
  });

  describe('removeFromCollection', () => {
    test('should remove book from collection successfully', async () => {
      req.params = { bookId: '1' };

      mockDeleteMany.mockResolvedValue({ count: 1 });

      await collectionController.removeFromCollection(req, res);

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          bookId: 1
        }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Livre retiré de votre collection.'
      });
    });

    test('should return 404 when book not found in collection', async () => {
      req.params = { bookId: '999' };

      mockDeleteMany.mockResolvedValue({ count: 0 });

      await collectionController.removeFromCollection(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Livre non trouvé dans votre collection.' });
    });
  });

  describe('updateReadStatus', () => {
    test('should update read status successfully', async () => {
      req.params = { bookId: '1' };
      req.body = { is_read: true };

      mockUpdateMany.mockResolvedValue({ count: 1 });

      await collectionController.updateReadStatus(req, res);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          bookId: 1
        },
        data: { is_read: true }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Statut de lecture mis à jour.'
      });
    });

    test('should return 400 when is_read is not boolean', async () => {
      req.params = { bookId: '1' };
      req.body = { is_read: 'invalid' };

      await collectionController.updateReadStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Le champ is_read doit être un booléen.' });
    });

    test('should return 404 when book not found in collection', async () => {
      req.params = { bookId: '999' };
      req.body = { is_read: true };

      mockUpdateMany.mockResolvedValue({ count: 0 });

      await collectionController.updateReadStatus(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Livre non trouvé dans votre collection.' });
    });
  });

  describe('saveReadingProgress', () => {
    test('should save reading progress successfully', async () => {
      req.params = { bookId: '1' };
      req.body = { cfi: 'epubcfi(/6/4[chapter01]!/4/2/2[para05]/3:10)' };

      mockUpdateMany.mockResolvedValue({ count: 1 });

      await collectionController.saveReadingProgress(req, res);

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: {
          userId: 1,
          bookId: 1
        },
        data: {
          last_cfi: 'epubcfi(/6/4[chapter01]!/4/2/2[para05]/3:10)'
        }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    test('should return 400 when CFI is missing', async () => {
      req.params = { bookId: '1' };
      req.body = {};

      await collectionController.saveReadingProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'CFI manquant.' });
    });

    test('should return 404 when book not found in collection', async () => {
      req.params = { bookId: '999' };
      req.body = { cfi: 'test-cfi' };

      mockUpdateMany.mockResolvedValue({ count: 0 });

      await collectionController.saveReadingProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Livre non trouvé dans votre collection.' });
    });
  });

  describe('getReadingProgress', () => {
    test('should get reading progress successfully', async () => {
      req.params = { bookId: '1' };

      mockFindUnique.mockResolvedValue({
        last_cfi: 'epubcfi(/6/4[chapter01]!/4/2/2[para05]/3:10)'
      });

      await collectionController.getReadingProgress(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: {
          userId_bookId: {
            userId: 1,
            bookId: 1
          }
        },
        select: {
          last_cfi: true
        }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        cfi: 'epubcfi(/6/4[chapter01]!/4/2/2[para05]/3:10)'
      });
    });

    test('should return null when no progress found', async () => {
      req.params = { bookId: '1' };

      mockFindUnique.mockResolvedValue(null);

      await collectionController.getReadingProgress(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ cfi: null });
    });
  });
});

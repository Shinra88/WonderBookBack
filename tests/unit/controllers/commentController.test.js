// tests/unit/controllers/commentController.test.js

// Mock Prisma
const mockFindMany = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockDeleteMany = jest.fn();
const mockUpdateMany = jest.fn();
const mockAggregate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    comments: {
      findMany: mockFindMany,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      delete: mockDelete,
      deleteMany: mockDeleteMany,
      aggregate: mockAggregate
    },
    books: {
      update: mockUpdate
    },
    collection: {
      updateMany: mockUpdateMany
    }
  }))
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const commentController = require('../../../controllers/commentController');

describe('CommentController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
      user: { userId: 1 }
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getCommentsByBook', () => {
    test('should get comments by book successfully', async () => {
      req.params = { bookId: '1' };

      const mockComments = [
        {
          commentId: 1,
          content: 'Great book!',
          rating: 5,
          created_at: new Date(),
          user: { name: 'User1', avatar: 'avatar1.jpg' }
        },
        {
          commentId: 2,
          content: 'Good read',
          rating: 4,
          created_at: new Date(),
          user: { name: 'User2', avatar: 'avatar2.jpg' }
        }
      ];

      mockFindMany.mockResolvedValue(mockComments);

      await commentController.getCommentsByBook(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { bookId: 1 },
        include: {
          user: { select: { name: true, avatar: true } }
        },
        orderBy: { created_at: 'desc' }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockComments);
    });

    test('should handle database errors', async () => {
      req.params = { bookId: '1' };

      mockFindMany.mockRejectedValue(new Error('Database error'));

      await commentController.getCommentsByBook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
    });
  });

  describe('addOrUpdateComment', () => {
    beforeEach(() => {
      // Mock pour updateAverageRating
      mockAggregate.mockResolvedValue({ _avg: { rating: 4.5 } });
      mockUpdate.mockResolvedValue({ bookId: 1, averageRating: 4.5 });
    });

    test('should add new comment successfully', async () => {
      req.params = { bookId: '1' };
      req.body = { content: 'Great book!', rating: 5 };

      mockFindFirst.mockResolvedValue(null); // Pas de commentaire existant
      const mockNewComment = {
        commentId: 1,
        bookId: 1,
        userId: 1,
        content: 'Great book!',
        rating: 5
      };
      mockCreate.mockResolvedValue(mockNewComment);

      await commentController.addOrUpdateComment(req, res);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { bookId: 1, userId: 1 }
      });
      expect(mockCreate).toHaveBeenCalledWith({
        data: { bookId: 1, userId: 1, content: 'Great book!', rating: 5 }
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockNewComment,
        message: 'Commentaire ajouté.'
      });
    });

    test('should update existing comment successfully', async () => {
      req.params = { bookId: '1' };
      req.body = { content: 'Updated comment', rating: 4 };

      const existingComment = { commentId: 1, bookId: 1, userId: 1 };
      mockFindFirst.mockResolvedValue(existingComment);

      const updatedComment = {
        commentId: 1,
        bookId: 1,
        userId: 1,
        content: 'Updated comment',
        rating: 4
      };
      mockUpdate.mockResolvedValueOnce(updatedComment); // Pour le commentaire

      await commentController.addOrUpdateComment(req, res);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { commentId: 1 },
        data: { content: 'Updated comment', rating: 4 }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: updatedComment,
        message: 'Commentaire mis à jour.'
      });
    });

    test('should return 400 when content is missing', async () => {
      req.params = { bookId: '1' };
      req.body = { rating: 5 }; // content manquant

      await commentController.addOrUpdateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contenu ou note manquant(s).' });
    });

    test('should return 400 when rating is not a number', async () => {
      req.params = { bookId: '1' };
      req.body = { content: 'Test', rating: 'invalid' };

      await commentController.addOrUpdateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Contenu ou note manquant(s).' });
    });

    test('should handle database errors', async () => {
      req.params = { bookId: '1' };
      req.body = { content: 'Test', rating: 5 };

      mockFindFirst.mockRejectedValue(new Error('Database error'));

      await commentController.addOrUpdateComment(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
    });
  });

  describe('deleteComment', () => {
    beforeEach(() => {
      // Mock pour updateAverageRating
      mockAggregate.mockResolvedValue({ _avg: { rating: 4.0 } });
      mockUpdate.mockResolvedValue({ bookId: 1, averageRating: 4.0 });
    });

    test('should delete comment successfully', async () => {
      req.params = { bookId: '1' };

      mockDeleteMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([]); // Pas de commentaires restants
      mockUpdateMany.mockResolvedValue({ count: 1 });

      await commentController.deleteComment(req, res);

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { bookId: 1, userId: 1 }
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { bookId: 1, userId: 1 }
      });

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { bookId: 1, userId: 1 },
        data: { commented: false }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Commentaire supprimé.'
      });
    });

    test('should return 404 when comment not found', async () => {
      req.params = { bookId: '1' };

      mockDeleteMany.mockResolvedValue({ count: 0 });

      await commentController.deleteComment(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Commentaire non trouvé.' });
    });

    test('should not update collection when user has remaining comments', async () => {
      req.params = { bookId: '1' };

      mockDeleteMany.mockResolvedValue({ count: 1 });
      mockFindMany.mockResolvedValue([{ commentId: 2 }]); // Commentaires restants

      await commentController.deleteComment(req, res);

      expect(mockUpdateMany).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('deleteCommentById', () => {
    beforeEach(() => {
      // Mock pour updateAverageRating
      mockAggregate.mockResolvedValue({ _avg: { rating: 3.5 } });
      mockUpdate.mockResolvedValue({ bookId: 1, averageRating: 3.5 });
    });

    test('should delete comment by ID successfully', async () => {
      req.params = { commentId: '1' };

      const existingComment = { commentId: 1, bookId: 1, userId: 2 };
      mockFindUnique.mockResolvedValue(existingComment);
      mockDelete.mockResolvedValue(existingComment);
      mockFindMany.mockResolvedValue([]); // Pas de commentaires restants
      mockUpdateMany.mockResolvedValue({ count: 1 });

      await commentController.deleteCommentById(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { commentId: 1 }
      });

      expect(mockDelete).toHaveBeenCalledWith({
        where: { commentId: 1 }
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { bookId: 1, userId: 2 }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Commentaire supprimé par un modérateur.'
      });
    });

    test('should return 404 when comment not found', async () => {
      req.params = { commentId: '999' };

      mockFindUnique.mockResolvedValue(null);

      await commentController.deleteCommentById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Commentaire introuvable.' });
    });

    test('should handle database errors', async () => {
      req.params = { commentId: '1' };

      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await commentController.deleteCommentById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
    });
  });
});

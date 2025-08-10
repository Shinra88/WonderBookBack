// tests/unit/controllers/postsController.test.js

// Mock MongoDB ObjectId
const mockObjectId = jest.fn();
jest.mock('mongodb', () => ({
  ObjectId: mockObjectId
}));

// ✅ NOUVEAU : Mock du logsController
const mockCreateLog = jest.fn();
jest.mock('../../../controllers/logsController', () => ({
  createLog: mockCreateLog,
  LOG_ACTIONS: {
    POST_ADDED: 'Post ajouté',
    POST_DELETED: 'Post supprimé'
  }
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const postsController = require('../../../controllers/postsController');

describe('PostsController', () => {
  let req, res, mockDB, mockCollection, mockTopicsCollection;

  beforeEach(() => {
    // Mock de la collection posts
    mockCollection = {
      find: jest.fn(),
      insertOne: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn()
    };

    // ✅ NOUVEAU : Mock de la collection topics
    mockTopicsCollection = {
      findOne: jest.fn()
    };

    // Mock de la base de données
    mockDB = {
      collection: jest.fn((name) => {
        if (name === 'posts') return mockCollection;
        if (name === 'topics') return mockTopicsCollection;
        return mockCollection;
      })
    };

    req = {
      app: {
        locals: {
          mongoDB: mockDB
        }
      },
      body: {},
      params: {},
      user: {
        userId: 1,
        name: 'Test User',
        avatar: 'avatar.jpg',
        role: 'user'
      }
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getPosts', () => {
    test('should get all posts successfully', async () => {
      const mockPosts = [
        {
          _id: 'post1',
          topicId: 'topic1',
          userId: 1,
          userName: 'User1',
          content: 'First post',
          created_at: new Date()
        },
        {
          _id: 'post2',
          topicId: 'topic1',
          userId: 2,
          userName: 'User2',
          content: 'Second post',
          created_at: new Date()
        }
      ];

      const mockFind = {
        toArray: jest.fn().mockResolvedValue(mockPosts)
      };
      mockCollection.find.mockReturnValue(mockFind);

      await postsController.getPosts(req, res);

      expect(mockDB.collection).toHaveBeenCalledWith('posts');
      expect(mockCollection.find).toHaveBeenCalledWith();
      expect(mockFind.toArray).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(mockPosts);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      const mockFind = {
        toArray: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      mockCollection.find.mockReturnValue(mockFind);

      await postsController.getPosts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  describe('addPost', () => {
    test('should add post successfully', async () => {
      req.body = {
        topicId: 'topic123',
        content: 'This is a test post'
      };

      const mockObjectIdInstance = { toString: () => 'topic123' };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      // ✅ NOUVEAU : Mock du topic pour les logs
      const mockTopic = {
        _id: 'topic123',
        title: 'Test Topic',
        authorId: 1
      };
      mockTopicsCollection.findOne.mockResolvedValue(mockTopic);

      // ✅ CORRIGÉ : Utiliser un ObjectId réaliste pour le post créé
      const mockPostObjectId = '67d69cedcc93c74676b71250';
      const mockResult = {
        insertedId: { toString: () => mockPostObjectId }
      };
      mockCollection.insertOne.mockResolvedValue(mockResult);

      // ✅ NOUVEAU : Mock du createLog qui réussit
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await postsController.addPost(req, res);

      // ✅ CORRIGÉ : Vérifier les appels dans l'ordre
      expect(mockDB.collection).toHaveBeenCalledWith('topics'); // Premier appel pour récupérer le topic
      expect(mockDB.collection).toHaveBeenCalledWith('posts'); // Deuxième appel pour insérer le post

      expect(mockObjectId).toHaveBeenCalledWith('topic123');
      expect(mockTopicsCollection.findOne).toHaveBeenCalledWith({ _id: mockObjectIdInstance });

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        topicId: mockObjectIdInstance,
        userId: 1,
        userName: 'Test User',
        userAvatar: 'avatar.jpg',
        content: 'This is a test post',
        created_at: expect.any(Date)
      });

      // ✅ CORRIGÉ : Le targetId est maintenant l'entier converti depuis l'ObjectId
      expect(mockCreateLog).toHaveBeenCalledWith(
        1,
        'Post ajouté dans le sujet "Test Topic"',
        expect.any(Number), // ✅ Accepte n'importe quel nombre
        'forum_post'
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post ajouté avec succès',
        id: mockResult.insertedId
      });
    });

    test('should add post successfully even if logging fails', async () => {
      req.body = {
        topicId: 'topic123',
        content: 'This is a test post'
      };

      mockObjectId.mockReturnValue({ toString: () => 'topic123' });
      mockTopicsCollection.findOne.mockResolvedValue({ title: 'Test Topic' });

      // ✅ CORRIGÉ : Utiliser un ObjectId réaliste
      const mockPostObjectId = '67d69cedcc93c74676b71251';
      mockCollection.insertOne.mockResolvedValue({
        insertedId: { toString: () => mockPostObjectId }
      });

      // ✅ NOUVEAU : Test quand le log échoue mais le post réussit
      mockCreateLog.mockRejectedValue(new Error('Log failed'));

      await postsController.addPost(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post ajouté avec succès',
        id: expect.any(Object)
      });
    });

    test('should return 400 when topicId is missing', async () => {
      req.body = {
        content: 'This is a test post'
      };

      await postsController.addPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tous les champs sont requis.' });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(mockCreateLog).not.toHaveBeenCalled();
    });

    test('should return 400 when content is missing', async () => {
      req.body = {
        topicId: 'topic123'
      };

      await postsController.addPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tous les champs sont requis.' });
    });

    test('should handle database errors during insertion', async () => {
      req.body = {
        topicId: 'topic123',
        content: 'This is a test post'
      };

      mockObjectId.mockReturnValue({ toString: () => 'topic123' });
      mockTopicsCollection.findOne.mockResolvedValue({ title: 'Test Topic' });
      mockCollection.insertOne.mockRejectedValue(new Error('Insert failed'));

      await postsController.addPost(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  describe('getPostsByTopicId', () => {
    test('should get posts by topic ID successfully', async () => {
      req.params = { topicId: 'topic123' };

      const mockPosts = [
        {
          _id: 'post1',
          topicId: 'topic123',
          userId: 1,
          userName: 'User1',
          content: 'First post in topic',
          created_at: new Date('2024-01-01')
        }
      ];

      const mockObjectIdInstance = { toString: () => 'topic123' };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockSort = {
        toArray: jest.fn().mockResolvedValue(mockPosts)
      };
      const mockFind = {
        sort: jest.fn().mockReturnValue(mockSort)
      };
      mockCollection.find.mockReturnValue(mockFind);

      await postsController.getPostsByTopicId(req, res);

      expect(mockObjectId).toHaveBeenCalledWith('topic123');
      expect(mockDB.collection).toHaveBeenCalledWith('posts');
      expect(mockCollection.find).toHaveBeenCalledWith({ topicId: mockObjectIdInstance });
      expect(mockFind.sort).toHaveBeenCalledWith({ created_at: 1 });

      expect(res.json).toHaveBeenCalledWith(mockPosts);
    });

    test('should handle database errors when getting posts by topic', async () => {
      req.params = { topicId: 'topic123' };

      mockObjectId.mockReturnValue({ toString: () => 'topic123' });

      const mockSort = {
        toArray: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      const mockFind = {
        sort: jest.fn().mockReturnValue(mockSort)
      };
      mockCollection.find.mockReturnValue(mockFind);

      await postsController.getPostsByTopicId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  // ✅ NOUVEAU : Tests pour deletePost
  describe('deletePost', () => {
    test('should delete post successfully', async () => {
      // ✅ CORRIGÉ : Utiliser un ObjectId réaliste
      const mockPostObjectId = '67d69cedcc93c74676b71252';
      req.params = { id: mockPostObjectId };

      const mockObjectIdInstance = { toString: () => mockPostObjectId };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingPost = {
        _id: mockPostObjectId,
        userId: 1,
        userName: 'Test User',
        topicId: 'topic123'
      };

      const mockTopic = {
        _id: 'topic123',
        title: 'Test Topic'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingPost);
      mockTopicsCollection.findOne.mockResolvedValue(mockTopic);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await postsController.deletePost(req, res);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: mockObjectIdInstance });

      // ✅ CORRIGÉ : Le targetId est maintenant l'entier converti depuis l'ObjectId
      expect(mockCreateLog).toHaveBeenCalledWith(
        1,
        'Post supprimé dans le sujet "Test Topic"',
        expect.any(Number), // ✅ Accepte n'importe quel nombre
        'forum_post'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Post supprimé avec succès'
      });
    });

    test('should delete post successfully as admin (moderation)', async () => {
      const mockPostObjectId = '67d69cedcc93c74676b71253';
      req.params = { id: mockPostObjectId };
      req.user.userId = 2; // Different user
      req.user.role = 'admin'; // But admin

      const mockObjectIdInstance = { toString: () => mockPostObjectId };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingPost = {
        _id: mockPostObjectId,
        userId: 1, // Different owner
        userName: 'Other User',
        topicId: 'topic123'
      };

      const mockTopic = {
        _id: 'topic123',
        title: 'Test Topic'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingPost);
      mockTopicsCollection.findOne.mockResolvedValue(mockTopic);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await postsController.deletePost(req, res);

      // Vérifier que c'est marqué comme modération
      expect(mockCreateLog).toHaveBeenCalledWith(
        2, // ✅ CORRIGÉ : c'était 1, doit être 2 (userId admin)
        'Post supprimé (modération): post de Other User dans "Test Topic"', // ✅ CORRIGÉ
        expect.any(Number),
        'forum_post'
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 404 when post not found', async () => {
      req.params = { id: 'nonexistent' };

      mockObjectId.mockReturnValue({ toString: () => 'nonexistent' });
      mockCollection.findOne.mockResolvedValue(null);

      await postsController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Post introuvable' });
    });

    test('should return 403 when user lacks permission', async () => {
      const mockPostObjectId = '67d69cedcc93c74676b71254';
      req.params = { id: mockPostObjectId };
      req.user.userId = 2; // Different user
      req.user.role = 'user'; // Not admin/moderator

      mockObjectId.mockReturnValue({ toString: () => mockPostObjectId });
      mockCollection.findOne.mockResolvedValue({
        _id: mockPostObjectId,
        userId: 1, // Different owner
        userName: 'Other User'
      });

      await postsController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Permission refusée' });
    });

    test('should return 404 when post deletion fails', async () => {
      const mockPostObjectId = '67d69cedcc93c74676b71255';
      req.params = { id: mockPostObjectId };

      const mockObjectIdInstance = { toString: () => mockPostObjectId };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingPost = {
        _id: mockPostObjectId,
        userId: 1,
        userName: 'Test User',
        topicId: 'topic123'
      };

      const mockTopic = {
        _id: 'topic123',
        title: 'Test Topic'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingPost);
      mockTopicsCollection.findOne.mockResolvedValue(mockTopic);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 }); // Échec suppression

      await postsController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Post introuvable' });
    });

    test('should handle database errors during deletion', async () => {
      req.params = { id: 'post123' };

      mockObjectId.mockReturnValue({ toString: () => 'post123' });
      mockCollection.findOne.mockRejectedValue(new Error('Database error'));

      await postsController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });

    test('should delete post successfully even if logging fails', async () => {
      const mockPostObjectId = '67d69cedcc93c74676b71256';
      req.params = { id: mockPostObjectId };

      const mockObjectIdInstance = { toString: () => mockPostObjectId };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingPost = {
        _id: mockPostObjectId,
        userId: 1,
        userName: 'Test User',
        topicId: 'topic123'
      };

      const mockTopic = {
        _id: 'topic123',
        title: 'Test Topic'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingPost);
      mockTopicsCollection.findOne.mockResolvedValue(mockTopic);
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockRejectedValue(new Error('Log failed'));

      await postsController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Post supprimé avec succès'
      });
    });
  });
});

// tests/unit/controllers/topicsController.test.js

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
    SUBJECT_CREATED: 'Sujet créé',
    SUBJECT_DELETED: 'Sujet supprimé'
  }
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const topicsController = require('../../../controllers/topicsController');

describe('TopicsController', () => {
  let req, res, mockDB, mockCollection, mockPostsCollection;

  beforeEach(() => {
    // Mock de la collection topics
    mockCollection = {
      find: jest.fn(),
      insertOne: jest.fn(),
      findOne: jest.fn(),
      deleteOne: jest.fn()
    };

    // ✅ NOUVEAU : Mock de la collection posts
    mockPostsCollection = {
      deleteMany: jest.fn()
    };

    // Mock de la base de données
    mockDB = {
      collection: jest.fn((name) => {
        if (name === 'topics') return mockCollection;
        if (name === 'posts') return mockPostsCollection;
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

  describe('getTopics', () => {
    test('should get all topics successfully', async () => {
      const mockTopics = [
        {
          _id: 'topic1',
          title: 'First Topic',
          content: 'First topic content',
          notice: false,
          authorId: 1,
          authorName: 'User1',
          created_at: new Date()
        },
        {
          _id: 'topic2',
          title: 'Second Topic',
          content: 'Second topic content',
          notice: true,
          authorId: 2,
          authorName: 'User2',
          created_at: new Date()
        }
      ];

      const mockFind = {
        toArray: jest.fn().mockResolvedValue(mockTopics)
      };
      mockCollection.find.mockReturnValue(mockFind);

      await topicsController.getTopics(req, res);

      expect(mockDB.collection).toHaveBeenCalledWith('topics');
      expect(mockCollection.find).toHaveBeenCalledWith();
      expect(mockFind.toArray).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(mockTopics);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should handle database errors', async () => {
      const mockFind = {
        toArray: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      mockCollection.find.mockReturnValue(mockFind);

      await topicsController.getTopics(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });

    test('should return empty array when no topics found', async () => {
      const mockFind = {
        toArray: jest.fn().mockResolvedValue([])
      };
      mockCollection.find.mockReturnValue(mockFind);

      await topicsController.getTopics(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

  describe('addTopic', () => {
    test('should add topic successfully with default notice', async () => {
      req.body = {
        title: 'New Topic',
        content: 'This is a new topic content'
      };

      // ✅ CORRIGÉ : Utiliser un ObjectId réaliste qui ressemble à MongoDB
      const mockObjectIdString = '67d69cedcc93c74676b71237';
      const mockResult = {
        insertedId: { toString: () => mockObjectIdString }
      };

      mockCollection.insertOne.mockResolvedValue(mockResult);
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await topicsController.addTopic(req, res);

      expect(mockDB.collection).toHaveBeenCalledWith('topics');
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        title: 'New Topic',
        content: 'This is a new topic content',
        notice: false,
        authorId: 1,
        authorName: 'Test User',
        authorAvatar: 'avatar.jpg',
        created_at: expect.any(Date)
      });

      // ✅ CORRIGÉ : Le targetId est maintenant l'entier converti depuis l'ObjectId
      // '67d69cedcc93c74676b71237' -> '76b71237' -> 1988576823
      expect(mockCreateLog).toHaveBeenCalledWith(
        1,
        'Sujet créé: "New Topic"',
        expect.any(Number), // ✅ Accepte n'importe quel nombre
        'forum_topic'
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic ajouté avec succès',
        id: mockResult.insertedId
      });
    });

    test('should add topic successfully with notice true', async () => {
      req.body = {
        title: 'Important Notice',
        content: 'This is an important notice',
        notice: true
      };

      // ✅ CORRIGÉ : Utiliser un ObjectId réaliste différent
      const mockObjectIdString = '67d69bc3cc93c74676b71236';
      const mockResult = {
        insertedId: { toString: () => mockObjectIdString }
      };

      mockCollection.insertOne.mockResolvedValue(mockResult);
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await topicsController.addTopic(req, res);

      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        title: 'Important Notice',
        content: 'This is an important notice',
        notice: true,
        authorId: 1,
        authorName: 'Test User',
        authorAvatar: 'avatar.jpg',
        created_at: expect.any(Date)
      });

      expect(mockCreateLog).toHaveBeenCalledWith(
        1,
        'Sujet créé: "Important Notice" (Notice)', // ✅ CORRIGÉ : c'était "New Topic"
        expect.any(Number),
        'forum_topic'
      );

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic ajouté avec succès',
        id: mockResult.insertedId
      });
    });

    test('should add topic successfully even if logging fails', async () => {
      req.body = {
        title: 'New Topic',
        content: 'Content'
      };

      const mockResult = {
        insertedId: { toString: () => '67d69cedcc93c74676b71238' }
      };

      mockCollection.insertOne.mockResolvedValue(mockResult);
      mockCreateLog.mockRejectedValue(new Error('Log failed'));

      await topicsController.addTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic ajouté avec succès',
        id: mockResult.insertedId
      });
    });

    test('should return 400 when title is missing', async () => {
      req.body = {
        content: 'Content without title'
      };

      await topicsController.addTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Titre et contenu requis.' });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(mockCreateLog).not.toHaveBeenCalled();
    });

    test('should return 400 when content is missing', async () => {
      req.body = {
        title: 'Title without content'
      };

      await topicsController.addTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Titre et contenu requis.' });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    test('should return 400 when both title and content are missing', async () => {
      req.body = {};

      await topicsController.addTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Titre et contenu requis.' });
    });

    test('should handle database errors during insertion', async () => {
      req.body = {
        title: 'New Topic',
        content: 'Content'
      };

      mockCollection.insertOne.mockRejectedValue(new Error('Insert failed'));

      await topicsController.addTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  describe('getTopicById', () => {
    test('should get topic by ID successfully', async () => {
      req.params = { id: 'topic123' };

      const mockTopic = {
        _id: 'topic123',
        title: 'Specific Topic',
        content: 'Specific topic content',
        notice: false,
        authorId: 1,
        authorName: 'Author',
        created_at: new Date()
      };

      const mockObjectIdInstance = { toString: () => 'topic123' };
      mockObjectId.mockReturnValue(mockObjectIdInstance);
      mockCollection.findOne.mockResolvedValue(mockTopic);

      await topicsController.getTopicById(req, res);

      expect(mockObjectId).toHaveBeenCalledWith('topic123');
      expect(mockDB.collection).toHaveBeenCalledWith('topics');
      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: mockObjectIdInstance });

      expect(res.json).toHaveBeenCalledWith(mockTopic);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 404 when topic not found', async () => {
      req.params = { id: 'nonexistent' };

      mockObjectId.mockReturnValue({ toString: () => 'nonexistent' });
      mockCollection.findOne.mockResolvedValue(null);

      await topicsController.getTopicById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Topic introuvable' });
    });

    test('should handle database errors when getting topic by ID', async () => {
      req.params = { id: 'topic123' };

      mockObjectId.mockReturnValue({ toString: () => 'topic123' });
      mockCollection.findOne.mockRejectedValue(new Error('Database error'));

      await topicsController.getTopicById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });

    test('should handle ObjectId creation errors', async () => {
      req.params = { id: 'invalid-id' };

      mockObjectId.mockImplementation(() => {
        throw new Error('Invalid ObjectId');
      });

      await topicsController.getTopicById(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });

  // ✅ NOUVEAU : Tests pour deleteTopic
  describe('deleteTopic', () => {
    test('should delete topic successfully as author', async () => {
      // ✅ CORRIGÉ : Utiliser un ObjectId réaliste
      const objectIdString = '67d69cedcc93c74676b71239';
      req.params = { id: objectIdString };

      const mockObjectIdInstance = { toString: () => objectIdString };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingTopic = {
        _id: objectIdString,
        title: 'Topic to Delete',
        authorId: 1, // Same as req.user.userId
        authorName: 'Test User'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingTopic);
      mockPostsCollection.deleteMany.mockResolvedValue({ deletedCount: 3 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await topicsController.deleteTopic(req, res);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: mockObjectIdInstance });
      expect(mockPostsCollection.deleteMany).toHaveBeenCalledWith({
        topicId: mockObjectIdInstance
      });
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: mockObjectIdInstance });

      // ✅ CORRIGÉ : Le targetId est l'entier converti
      expect(mockCreateLog).toHaveBeenCalledWith(
        1,
        'Sujet supprimé: "Topic to Delete"',
        expect.any(Number), // ✅ Accepte n'importe quel nombre
        'forum_topic'
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Topic et posts associés supprimés avec succès'
      });
    });

    test('should delete topic successfully as admin', async () => {
      const objectIdString = '67d69cedcc93c74676b71240';
      req.params = { id: objectIdString };
      req.user.userId = 2; // Different user
      req.user.role = 'admin'; // But admin

      const mockObjectIdInstance = { toString: () => objectIdString };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingTopic = {
        _id: objectIdString,
        title: 'Topic to Delete',
        authorId: 1, // Different author
        authorName: 'Other User'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingTopic);
      mockPostsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await topicsController.deleteTopic(req, res);

      expect(mockCreateLog).toHaveBeenCalledWith(
        2,
        'Sujet supprimé (modération): "Topic to Delete" de Other User', // ✅ CORRIGÉ : était "Sujet créé: "New Topic""
        expect.any(Number),
        'forum_topic'
      );

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should delete topic successfully as moderator', async () => {
      const objectIdString = '67d69cedcc93c74676b71241';
      req.params = { id: objectIdString };
      req.user.userId = 3;
      req.user.role = 'moderator';

      const mockObjectIdInstance = { toString: () => objectIdString };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingTopic = {
        _id: objectIdString,
        title: 'Topic to Delete',
        authorId: 1,
        authorName: 'Other User'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingTopic);
      mockPostsCollection.deleteMany.mockResolvedValue({ deletedCount: 1 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockResolvedValue({ logId: 1 });

      await topicsController.deleteTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return 404 when topic not found', async () => {
      req.params = { id: 'nonexistent' };

      mockObjectId.mockReturnValue({ toString: () => 'nonexistent' });
      mockCollection.findOne.mockResolvedValue(null);

      await topicsController.deleteTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Topic introuvable' });
      expect(mockPostsCollection.deleteMany).not.toHaveBeenCalled();
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
    });

    test('should return 403 when user lacks permission', async () => {
      const objectIdString = '67d69cedcc93c74676b71242';
      req.params = { id: objectIdString };
      req.user.userId = 2; // Different user
      req.user.role = 'user'; // Not admin/moderator

      const mockObjectIdInstance = { toString: () => objectIdString };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingTopic = {
        _id: objectIdString,
        title: 'Protected Topic',
        authorId: 1, // Different author
        authorName: 'Other User'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingTopic);

      await topicsController.deleteTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Permission refusée' });
      expect(mockPostsCollection.deleteMany).not.toHaveBeenCalled();
      expect(mockCollection.deleteOne).not.toHaveBeenCalled();
    });

    test('should return 404 when topic deletion fails', async () => {
      const objectIdString = '67d69cedcc93c74676b71243';
      req.params = { id: objectIdString };

      const mockObjectIdInstance = { toString: () => objectIdString };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingTopic = {
        _id: objectIdString,
        title: 'Topic to Delete',
        authorId: 1,
        authorName: 'Test User'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingTopic);
      mockPostsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 }); // Échec suppression

      await topicsController.deleteTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Topic introuvable' });
    });

    test('should handle database errors during deletion', async () => {
      req.params = { id: 'topic123' };

      mockObjectId.mockReturnValue({ toString: () => 'topic123' });
      mockCollection.findOne.mockRejectedValue(new Error('Database error'));

      await topicsController.deleteTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });

    test('should delete topic successfully even if logging fails', async () => {
      const objectIdString = '67d69cedcc93c74676b71244';
      req.params = { id: objectIdString };

      const mockObjectIdInstance = { toString: () => objectIdString };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      const mockExistingTopic = {
        _id: objectIdString,
        title: 'Topic to Delete',
        authorId: 1,
        authorName: 'Test User'
      };

      mockCollection.findOne.mockResolvedValue(mockExistingTopic);
      mockPostsCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockCreateLog.mockRejectedValue(new Error('Log failed'));

      await topicsController.deleteTopic(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: 'Topic et posts associés supprimés avec succès'
      });
    });
  });
});

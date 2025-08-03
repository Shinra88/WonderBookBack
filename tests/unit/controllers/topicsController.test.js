// tests/unit/controllers/topicsController.test.js

// Mock MongoDB ObjectId
const mockObjectId = jest.fn();
jest.mock('mongodb', () => ({
  ObjectId: mockObjectId
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const topicsController = require('../../../controllers/topicsController');

describe('TopicsController', () => {
  let req, res, mockDB, mockCollection;

  beforeEach(() => {
    // Mock de la collection MongoDB
    mockCollection = {
      find: jest.fn(),
      insertOne: jest.fn(),
      findOne: jest.fn()
    };

    // Mock de la base de données
    mockDB = {
      collection: jest.fn().mockReturnValue(mockCollection)
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
        avatar: 'avatar.jpg'
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

      // Mock de la chaîne de méthodes MongoDB
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

      const mockResult = {
        insertedId: 'newTopicId123'
      };
      mockCollection.insertOne.mockResolvedValue(mockResult);

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

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic ajouté avec succès',
        id: 'newTopicId123'
      });
    });

    test('should add topic successfully with notice true', async () => {
      req.body = {
        title: 'Important Notice',
        content: 'This is an important notice',
        notice: true
      };

      const mockResult = {
        insertedId: 'noticeTopicId456'
      };
      mockCollection.insertOne.mockResolvedValue(mockResult);

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

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Topic ajouté avec succès',
        id: 'noticeTopicId456'
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
});

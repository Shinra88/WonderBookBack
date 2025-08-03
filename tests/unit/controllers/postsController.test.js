// tests/unit/controllers/postsController.test.js

// Mock MongoDB ObjectId
const mockObjectId = jest.fn();
jest.mock('mongodb', () => ({
  ObjectId: mockObjectId
}));

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer après les mocks
const postsController = require('../../../controllers/postsController');

describe('PostsController', () => {
  let req, res, mockDB, mockCollection;

  beforeEach(() => {
    // Mock de la collection MongoDB
    mockCollection = {
      find: jest.fn(),
      insertOne: jest.fn()
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

      // Mock de la chaîne de méthodes MongoDB
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

    test('should return empty array when no posts found', async () => {
      const mockFind = {
        toArray: jest.fn().mockResolvedValue([])
      };
      mockCollection.find.mockReturnValue(mockFind);

      await postsController.getPosts(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
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

      const mockResult = {
        insertedId: 'newPostId123'
      };
      mockCollection.insertOne.mockResolvedValue(mockResult);

      await postsController.addPost(req, res);

      expect(mockObjectId).toHaveBeenCalledWith('topic123');
      expect(mockDB.collection).toHaveBeenCalledWith('posts');
      expect(mockCollection.insertOne).toHaveBeenCalledWith({
        topicId: mockObjectIdInstance,
        userId: 1,
        userName: 'Test User',
        userAvatar: 'avatar.jpg',
        content: 'This is a test post',
        created_at: expect.any(Date)
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Post ajouté avec succès',
        id: 'newPostId123'
      });
    });

    test('should return 400 when topicId is missing', async () => {
      req.body = {
        content: 'This is a test post'
        // topicId manquant
      };

      await postsController.addPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tous les champs sont requis.' });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    test('should return 400 when content is missing', async () => {
      req.body = {
        topicId: 'topic123'
        // content manquant
      };

      await postsController.addPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Tous les champs sont requis.' });
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });

    test('should return 400 when both fields are missing', async () => {
      req.body = {};

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
        },
        {
          _id: 'post2',
          topicId: 'topic123',
          userId: 2,
          userName: 'User2',
          content: 'Second post in topic',
          created_at: new Date('2024-01-02')
        }
      ];

      const mockObjectIdInstance = { toString: () => 'topic123' };
      mockObjectId.mockReturnValue(mockObjectIdInstance);

      // Mock de la chaîne de méthodes MongoDB
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
      expect(mockSort.toArray).toHaveBeenCalled();

      expect(res.json).toHaveBeenCalledWith(mockPosts);
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return empty array when no posts found for topic', async () => {
      req.params = { topicId: 'nonexistent' };

      mockObjectId.mockReturnValue({ toString: () => 'nonexistent' });

      const mockSort = {
        toArray: jest.fn().mockResolvedValue([])
      };
      const mockFind = {
        sort: jest.fn().mockReturnValue(mockSort)
      };
      mockCollection.find.mockReturnValue(mockFind);

      await postsController.getPostsByTopicId(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
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

    test('should handle ObjectId creation errors', async () => {
      req.params = { topicId: 'invalid-id' };

      mockObjectId.mockImplementation(() => {
        throw new Error('Invalid ObjectId');
      });

      await postsController.getPostsByTopicId(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur' });
    });
  });
});

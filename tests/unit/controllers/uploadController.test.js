// tests/unit/controllers/uploadController.test.js

// Mock des variables d'environnement AVANT l'import
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.AWS_REGION = 'eu-north-1';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';

// Mock AWS SDK
const mockPutObject = jest.fn();
const mockDeleteObject = jest.fn();
const mockS3 = {
  putObject: mockPutObject,
  deleteObject: mockDeleteObject
};

jest.mock('aws-sdk', () => ({
  S3: jest.fn(() => mockS3),
  config: {
    update: jest.fn()
  }
}));

// Mock Prisma
const mockUpdate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      update: mockUpdate
    },
    books: {
      update: mockUpdate
    }
  }))
}));

// Mock console
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Importer APRÈS avoir défini les variables d'environnement
const uploadController = require('../../../controllers/uploadController');

describe('UploadController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      file: null,
      body: {}
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('uploadImageToS3', () => {
    test('should upload image to S3 successfully', async () => {
      const mockBuffer = Buffer.from('image-data');
      const key = 'test/image.webp';

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      const result = await uploadController.uploadImageToS3(mockBuffer, key);

      expect(mockPutObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
        Body: mockBuffer,
        ContentType: 'image/webp'
      });

      expect(result).toBe('https://test-bucket.s3.eu-north-1.amazonaws.com/test/image.webp');
    });

    test('should upload image with custom content type', async () => {
      const mockBuffer = Buffer.from('image-data');
      const key = 'test/image.jpg';

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      await uploadController.uploadImageToS3(mockBuffer, key, 'image/jpeg');

      expect(mockPutObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: key,
        Body: mockBuffer,
        ContentType: 'image/jpeg'
      });
    });
  });

  describe('updateAvatar', () => {
    test('should update avatar successfully', async () => {
      req.file = {
        buffer: Buffer.from('avatar-data'),
        mimetype: 'image/webp'
      };
      req.body = {
        userId: '1',
        name: 'Test User',
        oldUrl: ''
      };

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      mockUpdate.mockResolvedValue({
        userId: 1,
        avatar: 'https://test-bucket.s3.eu-north-1.amazonaws.com/avatars/1-testuser-avatar.webp'
      });

      await uploadController.updateAvatar(req, res);

      expect(mockPutObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'avatars/1-testuser-avatar.webp',
        Body: req.file.buffer,
        ContentType: 'image/webp'
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: {
          avatar: 'https://test-bucket.s3.eu-north-1.amazonaws.com/avatars/1-testuser-avatar.webp'
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        imageUrl: 'https://test-bucket.s3.eu-north-1.amazonaws.com/avatars/1-testuser-avatar.webp'
      });
    });

    test('should delete old avatar before uploading new one', async () => {
      req.file = {
        buffer: Buffer.from('avatar-data'),
        mimetype: 'image/webp'
      };
      req.body = {
        userId: '1',
        name: 'Test User',
        oldUrl: 'https://test-bucket.s3.eu-north-1.amazonaws.com/avatars/old-avatar.webp'
      };

      mockDeleteObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      mockUpdate.mockResolvedValue({});

      await uploadController.updateAvatar(req, res);

      expect(mockDeleteObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'avatars/old-avatar.webp'
      });
    });

    test('should return 400 when file is missing', async () => {
      req.body = {
        userId: '1',
        name: 'Test User'
      };

      await uploadController.updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fichier, userId ou nom manquant.' });
    });

    test('should return 400 when userId is missing', async () => {
      req.file = { buffer: Buffer.from('data'), mimetype: 'image/webp' };
      req.body = { name: 'Test User' };

      await uploadController.updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fichier, userId ou nom manquant.' });
    });

    test('should handle upload errors', async () => {
      req.file = { buffer: Buffer.from('data'), mimetype: 'image/webp' };
      req.body = { userId: '1', name: 'Test User' };

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 error'))
      });

      await uploadController.updateAvatar(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erreur lors de la mise à jour de l'avatar."
      });
    });
  });

  describe('uploadCover', () => {
    test('should upload cover successfully', async () => {
      req.file = {
        buffer: Buffer.from('cover-data'),
        mimetype: 'image/webp'
      };
      req.body = {
        title: 'Test Book Title!'
      };

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      await uploadController.uploadCover(req, res);

      expect(mockPutObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'covers/testbooktitle.webp',
        Body: req.file.buffer,
        ContentType: 'image/webp'
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        imageUrl: 'https://test-bucket.s3.eu-north-1.amazonaws.com/covers/testbooktitle.webp'
      });
    });

    test('should return 400 when file is missing', async () => {
      req.body = { title: 'Test Book' };

      await uploadController.uploadCover(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fichier ou titre manquant.' });
    });

    test('should return 400 when title is missing', async () => {
      req.file = { buffer: Buffer.from('data'), mimetype: 'image/webp' };

      await uploadController.uploadCover(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fichier ou titre manquant.' });
    });
  });

  describe('uploadEbook', () => {
    test('should upload ebook successfully', async () => {
      req.file = {
        buffer: Buffer.from('ebook-data'),
        mimetype: 'application/epub+zip',
        originalname: 'test-book.epub'
      };
      req.body = {
        bookId: '1'
      };

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      });

      mockUpdate.mockResolvedValue({
        bookId: 1,
        ebook_url: 'https://test-bucket.s3.eu-north-1.amazonaws.com/ebooks/1.epub'
      });

      await uploadController.uploadEbook(req, res);

      expect(mockPutObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'ebooks/1.epub',
        Body: req.file.buffer,
        ContentType: 'application/epub+zip'
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { bookId: 1 },
        data: { ebook_url: 'https://test-bucket.s3.eu-north-1.amazonaws.com/ebooks/1.epub' }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Ebook uploadé',
        ebook_url: 'https://test-bucket.s3.eu-north-1.amazonaws.com/ebooks/1.epub'
      });
    });

    test('should return 400 when file is missing', async () => {
      req.body = { bookId: '1' };

      await uploadController.uploadEbook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fichier ou bookId manquant.' });
    });

    test('should return 400 when bookId is missing', async () => {
      req.file = {
        buffer: Buffer.from('data'),
        originalname: 'test.epub'
      };

      await uploadController.uploadEbook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Fichier ou bookId manquant.' });
    });

    test('should return 400 when file is not epub', async () => {
      req.file = {
        buffer: Buffer.from('data'),
        originalname: 'test.pdf'
      };
      req.body = { bookId: '1' };

      await uploadController.uploadEbook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Seuls les fichiers .epub sont autorisés.' });
    });

    test('should handle upload errors', async () => {
      req.file = {
        buffer: Buffer.from('data'),
        originalname: 'test.epub',
        mimetype: 'application/epub+zip'
      };
      req.body = { bookId: '1' };

      mockPutObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 error'))
      });

      await uploadController.uploadEbook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur lors de la mise à jour du livre.' });
    });
  });
});

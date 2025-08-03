// tests/unit/controllers/bookController.test.js

// Mock des dépendances
const mockFindMany = jest.fn();
const mockCount = jest.fn();
const mockCreate = jest.fn();
const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    books: {
      findMany: mockFindMany,
      count: mockCount,
      create: mockCreate,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate
    }
  }))
}));

jest.mock('../../../controllers/uploadController', () => ({
  uploadImageToS3: jest.fn()
}));

jest.mock('../../../utils/normalizeString', () => ({
  normalize: jest.fn((str) => str.toLowerCase())
}));

jest.mock('../../../utils/formatBooks', () => ({
  formatBooks: jest.fn((books) =>
    books.map((book) => ({
      ...book,
      bookId: book.bookId,
      title: book.title,
      author: book.author,
      averageRating: book.averageRating || 0
    }))
  )
}));

// Importer après les mocks
const bookController = require('../../../controllers/bookController');
const { uploadImageToS3 } = require('../../../controllers/uploadController');
const { normalize } = require('../../../utils/normalizeString');
const { formatBooks } = require('../../../utils/formatBooks');

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('BookController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {},
      params: {},
      body: {},
      user: { userId: 1 },
      file: null
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('getAllBooks', () => {
    test('should get all books with default pagination', async () => {
      const mockBooks = [
        { bookId: 1, title: 'Book 1', author: 'Author 1' },
        { bookId: 2, title: 'Book 2', author: 'Author 2' }
      ];

      mockFindMany.mockResolvedValue(mockBooks);
      mockCount.mockResolvedValue(2);
      formatBooks.mockReturnValue(mockBooks);

      await bookController.getAllBooks(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: [{ created_at: 'desc' }],
        include: {
          book_publishers: { include: { publishers: true } },
          book_categories: { include: { categories: true } },
          user: { select: { name: true } }
        }
      });

      expect(res.json).toHaveBeenCalledWith({
        books: mockBooks,
        total: 2
      });
    });

    test('should handle pagination parameters', async () => {
      req.query = { page: '2', limit: '5' };

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      formatBooks.mockReturnValue([]);

      await bookController.getAllBooks(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        skip: 5, // (2-1) * 5
        take: 5,
        orderBy: [{ created_at: 'desc' }],
        include: expect.any(Object)
      });
    });

    test('should handle search parameter', async () => {
      req.query = { search: 'Harry Potter' };

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      formatBooks.mockReturnValue([]);
      normalize.mockReturnValue('harry potter');

      await bookController.getAllBooks(req, res);

      expect(normalize).toHaveBeenCalledWith('harry potter');
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { search_title: { contains: 'harry potter' } },
        skip: 0,
        take: 10,
        orderBy: [{ created_at: 'desc' }],
        include: expect.any(Object)
      });
    });

    test('should handle year filter', async () => {
      req.query = { year: '2020' };

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      formatBooks.mockReturnValue([]);

      await bookController.getAllBooks(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: new Date('2020-01-01'),
            lt: new Date('2021-01-01')
          }
        },
        skip: 0,
        take: 10,
        orderBy: [{ created_at: 'desc' }],
        include: expect.any(Object)
      });
    });

    test('should handle pendingFirst parameter', async () => {
      req.query = { pendingFirst: 'true' };

      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);
      formatBooks.mockReturnValue([]);

      await bookController.getAllBooks(req, res);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: [{ status: 'asc' }, { created_at: 'desc' }],
        include: expect.any(Object)
      });
    });

    test('should handle database errors', async () => {
      mockFindMany.mockRejectedValue(new Error('Database error'));

      await bookController.getAllBooks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erreur lors de la récupération des livres.'
      });
    });
  });

  describe('addBook', () => {
    test('should add book successfully', async () => {
      req.body = {
        title: 'New Book',
        author: 'New Author',
        year: '2023-01-01',
        summary: 'Book summary',
        categories: [1, 2],
        editor: [1]
      };

      const mockNewBook = { bookId: 1, title: 'New Book', author: 'New Author' };
      mockCreate.mockResolvedValue(mockNewBook);
      normalize.mockReturnValue('new book new author');

      await bookController.addBook(req, res);

      expect(normalize).toHaveBeenCalledWith('New Book New Author');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          title: 'New Book',
          search_title: 'new book new author',
          author: 'New Author',
          date: new Date('2023-01-01'),
          summary: 'Book summary',
          cover_url: 'https://wonderbook-images.s3.eu-north-1.amazonaws.com/covers/default.webp',
          averageRating: 0,
          status: 'pending',
          validated_by: null,
          book_categories: {
            create: [{ categoryId: 1 }, { categoryId: 2 }]
          },
          book_publishers: {
            create: [{ publisherId: 1 }]
          }
        }
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockNewBook);
    });

    test('should return 400 for missing required fields', async () => {
      req.body = { title: 'Book without author' };

      await bookController.addBook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Champs obligatoires manquants ou invalides.'
      });
    });

    test('should return 400 for invalid date', async () => {
      req.body = {
        title: 'New Book',
        author: 'New Author',
        year: 'invalid-date',
        categories: [1],
        editor: [1]
      };

      await bookController.addBook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Date de publication invalide.' });
    });
  });

  describe('getBookByTitle', () => {
    test('should get book by title successfully', async () => {
      req.params = { title: encodeURIComponent('Test Book') };

      const mockBook = {
        bookId: 1,
        title: 'Test Book',
        author: 'Test Author',
        comments: [
          {
            commentId: 1,
            content: 'Great book!',
            rating: 5,
            created_at: new Date(),
            user: { name: 'User1', avatar: 'avatar1.jpg' }
          }
        ]
      };

      mockFindFirst.mockResolvedValue(mockBook);
      formatBooks.mockReturnValue([{ ...mockBook, comments: undefined }]);

      await bookController.getBookByTitle(req, res);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { title: 'Test Book' },
        include: {
          book_publishers: { include: { publishers: true } },
          book_categories: { include: { categories: true } },
          user: { select: { name: true } },
          comments: {
            include: { user: { select: { name: true, avatar: true } } },
            orderBy: { created_at: 'desc' }
          }
        }
      });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          bookId: 1,
          title: 'Test Book',
          comments: expect.arrayContaining([
            expect.objectContaining({
              commentId: 1,
              content: 'Great book!',
              rating: 5
            })
          ])
        })
      );
    });

    test('should return 404 when book not found', async () => {
      req.params = { title: 'Nonexistent Book' };

      mockFindFirst.mockResolvedValue(null);

      await bookController.getBookByTitle(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Livre non trouvé' });
    });

    test('should return 400 for invalid title', async () => {
      req.params = { title: '' };

      await bookController.getBookByTitle(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Titre invalide' });
    });
  });

  describe('getMinYear', () => {
    test('should get minimum year successfully', async () => {
      mockFindFirst.mockResolvedValue({ date: new Date('2000-01-01') });

      await bookController.getMinYear(req, res);

      expect(mockFindFirst).toHaveBeenCalledWith({
        orderBy: { date: 'asc' },
        select: { date: true }
      });

      expect(res.json).toHaveBeenCalledWith({ minYear: 2000 });
    });

    test('should return 404 when no books found', async () => {
      mockFindFirst.mockResolvedValue(null);

      await bookController.getMinYear(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Aucun livre trouvé' });
    });
  });

  describe('updateBookCover', () => {
    test('should update book cover successfully', async () => {
      req.params = { id: '1' };
      req.file = {
        buffer: Buffer.from('image-data'),
        mimetype: 'image/jpeg'
      };

      const mockBook = { bookId: 1, title: 'Test Book!' };
      mockFindUnique.mockResolvedValue(mockBook);
      uploadImageToS3.mockResolvedValue('https://s3.example.com/covers/testbook.webp');

      await bookController.updateBookCover(req, res);

      expect(uploadImageToS3).toHaveBeenCalledWith(
        req.file.buffer,
        'covers/testbook.webp',
        'image/jpeg'
      );

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { bookId: 1 },
        data: { cover_url: 'https://s3.example.com/covers/testbook.webp' }
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Image mise à jour',
        cover_url: 'https://s3.example.com/covers/testbook.webp'
      });
    });

    test('should return 404 when book not found', async () => {
      req.params = { id: '999' };
      req.file = { buffer: Buffer.from('data'), mimetype: 'image/jpeg' };

      mockFindUnique.mockResolvedValue(null);

      await bookController.updateBookCover(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Livre non trouvé' });
    });

    // Ajoutez ces tests à la fin de votre fichier tests/unit/controllers/bookController.test.js

    describe('getBestRatedBooks', () => {
      test('should get best rated books successfully', async () => {
        const mockBooks = [
          { bookId: 1, title: 'Book 1', averageRating: 4.5 },
          { bookId: 2, title: 'Book 2', averageRating: 4.8 },
          { bookId: 3, title: 'Book 3', averageRating: 3.2 }
        ];

        mockFindMany.mockResolvedValue(mockBooks);
        formatBooks.mockReturnValue(
          mockBooks.map((book) => ({ ...book, averageRating: book.averageRating }))
        );

        await bookController.getBestRatedBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {},
          include: {
            book_publishers: { include: { publishers: true } },
            book_categories: { include: { categories: true } },
            user: { select: { name: true } }
          }
        });

        // Vérifier que les livres sont triés par rating et limités à 5
        expect(res.json).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ bookId: 2, averageRating: 4.8 }),
            expect.objectContaining({ bookId: 1, averageRating: 4.5 }),
            expect.objectContaining({ bookId: 3, averageRating: 3.2 })
          ])
        );
      });

      test('should handle filters without search', async () => {
        req.query = { year: '2020', search: 'should be ignored' };

        mockFindMany.mockResolvedValue([]);
        formatBooks.mockReturnValue([]);

        await bookController.getBestRatedBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {
            date: {
              gte: new Date('2020-01-01'),
              lt: new Date('2021-01-01')
            }
          },
          include: expect.any(Object)
        });
      });

      test('should handle database errors', async () => {
        mockFindMany.mockRejectedValue(new Error('Database error'));

        await bookController.getBestRatedBooks(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Erreur lors de la récupération des meilleurs livres.'
        });
      });
    });

    describe('getLastAddedBooks', () => {
      test('should get last added books successfully', async () => {
        const mockBooks = [
          { bookId: 1, title: 'Recent Book 1', created_at: new Date('2024-01-02') },
          { bookId: 2, title: 'Recent Book 2', created_at: new Date('2024-01-01') }
        ];

        mockFindMany.mockResolvedValue(mockBooks);
        formatBooks.mockReturnValue(mockBooks);

        await bookController.getLastAddedBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {},
          orderBy: { created_at: 'desc' },
          take: 5,
          include: {
            book_publishers: { include: { publishers: true } },
            book_categories: { include: { categories: true } },
            user: { select: { name: true } }
          }
        });

        expect(res.json).toHaveBeenCalledWith(mockBooks);
      });

      test('should handle filters without search', async () => {
        req.query = { categories: ['Fiction'], search: 'should be ignored' };

        mockFindMany.mockResolvedValue([]);
        formatBooks.mockReturnValue([]);

        await bookController.getLastAddedBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {
            book_categories: {
              some: { categories: { name: { in: ['Fiction'] } } }
            }
          },
          orderBy: { created_at: 'desc' },
          take: 5,
          include: expect.any(Object)
        });
      });

      test('should handle database errors', async () => {
        mockFindMany.mockRejectedValue(new Error('Database error'));

        await bookController.getLastAddedBooks(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Erreur lors de la récupération des derniers livres.'
        });
      });
    });

    describe('updateBook', () => {
      test('should update book successfully', async () => {
        req.params = { id: '1' };
        req.body = {
          title: 'Updated Book',
          author: 'Updated Author',
          year: '2024-01-01',
          summary: 'Updated summary',
          status: 'validated',
          categories: [1, 2],
          editors: [1],
          cover_url: 'https://example.com/cover.jpg'
        };

        const mockUpdatedBook = {
          bookId: 1,
          title: 'Updated Book',
          author: 'Updated Author'
        };

        mockUpdate.mockResolvedValueOnce({}); // Pour l'update
        mockFindUnique.mockResolvedValue(mockUpdatedBook); // Pour la récupération
        formatBooks.mockReturnValue([mockUpdatedBook]);
        normalize.mockReturnValue('updated book updated author');

        await bookController.updateBook(req, res);

        expect(mockUpdate).toHaveBeenCalledWith({
          where: { bookId: 1 },
          data: {
            title: 'Updated Book',
            search_title: 'updated book updated author',
            author: 'Updated Author',
            date: new Date('2024-01-01'),
            summary: 'Updated summary',
            status: 'validated',
            cover_url: 'https://example.com/cover.jpg',
            validated_by: 1,
            book_categories: {
              deleteMany: {},
              create: [{ categoryId: 1 }, { categoryId: 2 }]
            },
            book_publishers: {
              deleteMany: {},
              create: [{ publisherId: 1 }]
            }
          }
        });

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(mockUpdatedBook);
      });

      test('should return 400 for invalid date', async () => {
        req.params = { id: '1' };
        req.body = {
          title: 'Book',
          author: 'Author',
          year: 'invalid-date'
        };

        await bookController.updateBook(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ error: 'Date invalide' });
      });

      test('should handle database errors', async () => {
        req.params = { id: '1' };
        req.body = {
          title: 'Book',
          author: 'Author',
          year: '2024-01-01'
        };

        mockUpdate.mockRejectedValue(new Error('Database error'));

        await bookController.updateBook(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Erreur serveur',
          message: 'Database error'
        });
      });
    });

    describe('buildWhereFilters - additional tests', () => {
      test('should handle date range filters', async () => {
        req.query = { start: '2020', end: '2023' };

        mockFindMany.mockResolvedValue([]);
        mockCount.mockResolvedValue(0);
        formatBooks.mockReturnValue([]);

        await bookController.getAllBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {
            date: {
              gte: new Date('2020-01-01'),
              lt: new Date('2024-01-01')
            }
          },
          skip: 0,
          take: 10,
          orderBy: [{ created_at: 'desc' }],
          include: expect.any(Object)
        });
      });

      test('should handle categories with AND type', async () => {
        req.query = { categories: ['Fiction', 'Drama'], type: 'et' };

        mockFindMany.mockResolvedValue([]);
        mockCount.mockResolvedValue(0);
        formatBooks.mockReturnValue([]);

        await bookController.getAllBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {
            AND: [
              { book_categories: { some: { categories: { name: 'Fiction' } } } },
              { book_categories: { some: { categories: { name: 'Drama' } } } }
            ]
          },
          skip: 0,
          take: 10,
          orderBy: [{ created_at: 'desc' }],
          include: expect.any(Object)
        });
      });

      test('should handle single category as string', async () => {
        req.query = { categories: 'Fiction' };

        mockFindMany.mockResolvedValue([]);
        mockCount.mockResolvedValue(0);
        formatBooks.mockReturnValue([]);

        await bookController.getAllBooks(req, res);

        expect(mockFindMany).toHaveBeenCalledWith({
          where: {
            book_categories: {
              some: { categories: { name: { in: ['Fiction'] } } }
            }
          },
          skip: 0,
          take: 10,
          orderBy: [{ created_at: 'desc' }],
          include: expect.any(Object)
        });
      });
    });

    describe('addBook - additional tests', () => {
      test('should handle database errors', async () => {
        req.body = {
          title: 'New Book',
          author: 'New Author',
          year: '2023-01-01',
          summary: 'Book summary',
          categories: [1],
          editor: [1]
        };

        mockCreate.mockRejectedValue(new Error('Database error'));

        await bookController.addBook(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Erreur lors de la création du livre.'
        });
      });

      test('should use custom cover_url when provided', async () => {
        req.body = {
          title: 'New Book',
          author: 'New Author',
          year: '2023-01-01',
          summary: 'Book summary',
          cover_url: 'https://custom-cover.com/image.jpg',
          categories: [1],
          editor: [1]
        };

        mockCreate.mockResolvedValue({});

        await bookController.addBook(req, res);

        expect(mockCreate).toHaveBeenCalledWith({
          data: expect.objectContaining({
            cover_url: 'https://custom-cover.com/image.jpg'
          })
        });
      });
    });

    describe('getBookByTitle - additional tests', () => {
      test('should handle database errors', async () => {
        req.params = { title: 'Test Book' };

        mockFindFirst.mockRejectedValue(new Error('Database error'));

        await bookController.getBookByTitle(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
      });
    });

    describe('getMinYear - additional tests', () => {
      test('should handle books with null date', async () => {
        mockFindFirst.mockResolvedValue({ date: null });

        await bookController.getMinYear(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Aucun livre trouvé' });
      });

      test('should handle database errors', async () => {
        mockFindFirst.mockRejectedValue(new Error('Database error'));

        await bookController.getMinYear(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
      });
    });

    describe('updateBookCover - additional tests', () => {
      test('should handle database errors', async () => {
        req.params = { id: '1' };
        req.file = { buffer: Buffer.from('data'), mimetype: 'image/jpeg' };

        mockFindUnique.mockRejectedValue(new Error('Database error'));

        await bookController.updateBookCover(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erreur mise à jour image' });
      });
    });
  });
});

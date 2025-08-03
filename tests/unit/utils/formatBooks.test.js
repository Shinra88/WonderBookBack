// tests/unit/utils/formatBooks.test.js
const { formatBooks } = require('../../../utils/formatBooks');

describe('formatBooks', () => {
  test('should format books correctly', () => {
    expect(formatBooks).toBeDefined();

    // Données mockées qui correspondent à la structure attendue
    const mockBooks = [
      {
        bookId: 1,
        title: 'Test Book',
        author: 'Test Author',
        date: '2024-01-01',
        summary: 'Test summary',
        status: 'validated',
        user: { name: 'Admin User' },
        book_categories: [{ categories: { name: 'Fiction' } }],
        book_publishers: [{ publishers: { name: 'Test Publisher' } }],
        cover_url: 'https://example.com/cover.jpg',
        ebook_url: null,
        averageRating: 4.5
      }
    ];

    const result = formatBooks(mockBooks);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      bookId: 1,
      title: 'Test Book',
      search_title: '',
      author: 'Test Author',
      date: '2024-01-01',
      summary: 'Test summary',
      status: 'validated',
      validated_by: 'Admin User',
      categories: ['Fiction'],
      editors: ['Test Publisher'],
      cover_url: 'https://example.com/cover.jpg',
      ebook_url: null,
      averageRating: 4.5
    });
  });

  test('should handle empty array', () => {
    const result = formatBooks([]);
    expect(result).toEqual([]);
  });
});

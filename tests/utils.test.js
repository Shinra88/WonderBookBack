// tests/utils.test.js
describe('Utility Functions Tests', () => {
  test('should handle date formatting', () => {
    const now = new Date();
    const isoString = now.toISOString();

    expect(isoString).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    expect(new Date(isoString)).toEqual(now);
  });

  test('should handle JSON operations', () => {
    const testObject = {
      id: 1,
      name: 'Test User',
      active: true,
      metadata: { created: '2024-01-01' }
    };

    const jsonString = JSON.stringify(testObject);
    const parsedObject = JSON.parse(jsonString);

    expect(parsedObject).toEqual(testObject);
    expect(typeof jsonString).toBe('string');
  });

  test('should validate environment variables format', () => {
    const { NODE_ENV, JWT_SECRET, FRONTEND_URL } = process.env;

    expect(NODE_ENV).toBe('test');
    expect(JWT_SECRET).toBeTruthy();
    expect(FRONTEND_URL).toMatch(/^https?:\/\//);
  });
});

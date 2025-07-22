describe('Basic Environment Tests', () => {
  test('should have test environment configured', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.JWT_SECRET).toBe('test-secret-key-for-testing-only');
  });

  test('should perform mathematical operations', () => {
    expect(2 + 2).toBe(4);
    expect(Math.max(1, 3, 2)).toBe(3);
    expect(Math.pow(3, 2)).toBe(9);
  });

  test('should handle string operations', () => {
    const testString = 'WonderBook Backend';
    expect(testString.toLowerCase()).toBe('wonderbook backend');
    expect(testString.includes('Backend')).toBe(true);
    expect(testString.split(' ')).toEqual(['WonderBook', 'Backend']);
  });

  test('should work with arrays and objects', () => {
    const testArray = [1, 2, 3, 4, 5];
    expect(testArray.length).toBe(5);
    expect(testArray.filter((x) => x > 3)).toEqual([4, 5]);

    const testObject = { name: 'Test', version: '1.0.0' };
    expect(testObject.name).toBe('Test');
    expect(Object.keys(testObject)).toEqual(['name', 'version']);
  });

  test('should handle async operations', async () => {
    const asyncFunction = () => Promise.resolve('async result');
    const result = await asyncFunction();
    expect(result).toBe('async result');
  });
});

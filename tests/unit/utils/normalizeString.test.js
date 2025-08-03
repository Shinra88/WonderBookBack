// tests/unit/utils/normalizeString.test.js
const { normalize } = require('../../../utils/normalizeString');

describe('normalize', () => {
  test('should normalize string correctly', () => {
    expect(normalize).toBeDefined();
    expect(typeof normalize).toBe('function');

    // Testez la fonction réelle
    const result = normalize('Test String With Accénts!!!');
    expect(result).toBe('test string with accents');

    // Test avec chaîne vide
    expect(normalize()).toBe('');
    expect(normalize('')).toBe('');

    // Test avec caractères spéciaux
    expect(normalize('Héllo Wörld!!!')).toBe('hello world');
  });
});

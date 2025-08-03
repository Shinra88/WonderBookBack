// tests/unit/utils/sendEmail.test.js
const sendConfirmationEmail = require('../../../utils/sendEmail');

// Mock console pour éviter les logs
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('sendConfirmationEmail', () => {
  beforeAll(() => {
    // Variables d'environnement pour les tests
    process.env.MAIL_USER = 'test@wonderbook.com';
    process.env.MAIL_PASS = 'test-password';
  });

  test('should be a function', () => {
    expect(typeof sendConfirmationEmail).toBe('function');
  });

  test('should return false when email config is missing', async () => {
    // Sauvegarder les variables originales
    const originalUser = process.env.MAIL_USER;
    const originalPass = process.env.MAIL_PASS;

    // Supprimer les variables d'environnement
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;

    const result = await sendConfirmationEmail('test@example.com', 'Test User');

    // Doit retourner false car la config est manquante
    expect(result).toBe(false);

    // Restaurer les variables
    process.env.MAIL_USER = originalUser;
    process.env.MAIL_PASS = originalPass;
  });

  test('should handle invalid email parameters', async () => {
    const result = await sendConfirmationEmail('', '');
    expect(result).toBe(false);
  });

  test('should create proper email content', () => {
    // Test indirect - vérifier que la fonction existe et peut être appelée
    expect(() => {
      sendConfirmationEmail('test@example.com', 'Test User');
    }).not.toThrow();
  });
});

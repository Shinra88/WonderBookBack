// tests/unit/controllers/authController.test.js

// Mock des dépendances
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDeleteMany = jest.fn();
const mockDelete = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate
    },
    passwordResetToken: {
      deleteMany: mockDeleteMany,
      create: mockCreate,
      findUnique: mockFindUnique,
      delete: mockDelete
    }
  }))
}));

jest.mock('jsonwebtoken');
jest.mock('bcryptjs');
jest.mock('axios');
jest.mock('crypto');
jest.mock('nodemailer');
jest.mock('../../../utils/sendEmail');

// Importer après les mocks
const authController = require('../../../controllers/authController');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const sendConfirmationEmail = require('../../../utils/sendEmail');

// Mock console
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('AuthController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: {}
    };

    res = {
      status: jest.fn(() => res),
      json: jest.fn(() => res)
    };

    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    test('should login user successfully', async () => {
      req.body = { mail: 'test@test.com', password: 'password123' };

      const mockUser = {
        userId: 1,
        name: 'Test User',
        mail: 'test@test.com',
        password: 'hashedPassword',
        role: 'user',
        avatar: 'avatar.jpg'
      };

      mockFindUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-token');

      await authController.loginUser(req, res);

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { mail: 'test@test.com' } });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 1, role: 'user' },
        'test-secret-key-for-testing-only',
        { expiresIn: '3h' }
      );
      expect(res.json).toHaveBeenCalledWith({
        token: 'fake-token',
        user: expect.objectContaining({
          userId: 1,
          name: 'Test User',
          mail: 'test@test.com',
          role: 'user'
        })
      });
    });

    test('should return 404 when user not found', async () => {
      req.body = { mail: 'notfound@test.com', password: 'password123' };

      mockFindUnique.mockResolvedValue(null);

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Utilisateur introuvable.' });
    });

    test('should return 401 when password is incorrect', async () => {
      req.body = { mail: 'test@test.com', password: 'wrongpassword' };

      const mockUser = { userId: 1, password: 'hashedPassword' };
      mockFindUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe incorrect.' });
    });

    test('should handle server errors', async () => {
      req.body = { mail: 'test@test.com', password: 'password123' };

      mockFindUnique.mockRejectedValue(new Error('Database error'));

      await authController.loginUser(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erreur serveur.' });
    });
  });

  describe('registerUser', () => {
    beforeEach(() => {
      // Mock axios pour reCAPTCHA
      axios.post.mockResolvedValue({ data: { success: true } });
      sendConfirmationEmail.mockResolvedValue(true);
      jwt.sign.mockReturnValue('fake-token');
    });

    test('should detect bot with honeypot field', async () => {
      req.body = {
        name: 'test',
        mail: 'test@test.com',
        password: 'Test123!',
        website: 'http://spam.com' // Honeypot field
      };

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Bot détecté.' });
    });

    test('should return 400 for invalid reCAPTCHA', async () => {
      req.body = {
        name: 'test',
        mail: 'test@test.com',
        password: 'Test123!',
        recaptchaToken: 'invalid-token',
        website: ''
      };

      axios.post.mockResolvedValue({ data: { success: false } });

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Échec de vérification reCAPTCHA.' });
    });

    test('should validate pseudo format', async () => {
      req.body = {
        name: 'ab', // Trop court
        mail: 'test@test.com',
        password: 'Test123!',
        recaptchaToken: 'valid-token',
        website: ''
      };

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Pseudo invalide.' });
    });

    test('should validate email format', async () => {
      req.body = {
        name: 'testuser',
        mail: 'invalid-email',
        password: 'Test123!',
        recaptchaToken: 'valid-token',
        website: ''
      };

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email invalide.' });
    });

    test('should validate password strength', async () => {
      req.body = {
        name: 'testuser',
        mail: 'test@test.com',
        password: 'weak', // Mot de passe faible
        recaptchaToken: 'valid-token',
        website: ''
      };

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Mot de passe faible.' });
    });

    test('should return 400 if email already exists', async () => {
      req.body = {
        name: 'testuser',
        mail: 'existing@test.com',
        password: 'Test123!',
        recaptchaToken: 'valid-token',
        website: ''
      };

      mockFindUnique.mockResolvedValue({ userId: 1 }); // Email existe

      await authController.registerUser(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email déjà utilisé.' });
    });

    test('should register user successfully', async () => {
      req.body = {
        name: 'testuser',
        mail: 'new@test.com',
        password: 'Test123!',
        recaptchaToken: 'valid-token',
        website: ''
      };

      mockFindUnique.mockResolvedValue(null); // Email n'existe pas
      const mockNewUser = {
        userId: 1,
        name: 'testuser',
        mail: 'new@test.com',
        role: 'user'
      };
      mockCreate.mockResolvedValue(mockNewUser);

      await authController.registerUser(req, res);

      expect(mockCreate).toHaveBeenCalledWith({
        data: { name: 'testuser', mail: 'new@test.com', password: 'Test123!', role: 'user' }
      });
      expect(sendConfirmationEmail).toHaveBeenCalledWith('new@test.com', 'testuser');
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        token: 'fake-token',
        user: mockNewUser
      });
    });
  });

  describe('changePassword', () => {
    test('should change password successfully', async () => {
      req.body = { oldPassword: 'oldpass', newPassword: 'newpass' };
      req.user = { userId: 1 };

      const mockUser = { userId: 1, password: 'hashedOldPassword' };
      mockFindUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(true);
      bcrypt.hash.mockResolvedValue('hashedNewPassword');

      await authController.changePassword(req, res);

      expect(bcrypt.compare).toHaveBeenCalledWith('oldpass', 'hashedOldPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('newpass', 10);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: { password: 'hashedNewPassword' }
      });
      expect(res.json).toHaveBeenCalledWith({ message: 'Mot de passe mis à jour avec succès.' });
    });

    test('should return 400 when fields are missing', async () => {
      req.body = { oldPassword: 'oldpass' }; // newPassword manquant
      req.user = { userId: 1 };

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Champs requis manquants.' });
    });

    test('should return 401 when old password is incorrect', async () => {
      req.body = { oldPassword: 'wrongpass', newPassword: 'newpass' };
      req.user = { userId: 1 };

      const mockUser = { userId: 1, password: 'hashedOldPassword' };
      mockFindUnique.mockResolvedValue(mockUser);
      bcrypt.compare.mockResolvedValue(false);

      await authController.changePassword(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ancien mot de passe incorrect.' });
    });

    describe('updateProfile', () => {
      test('should update profile successfully', async () => {
        req.body = {
          name: 'Updated Name',
          mail: 'updated@test.com',
          aboutMe: 'Updated bio',
          repForum: true,
          addCom: true,
          addBook: false,
          news: true,
          avatar: 'new-avatar.jpg'
        };
        req.user = { userId: 1 };

        const mockUpdatedUser = {
          userId: 1,
          name: 'Updated Name',
          mail: 'updated@test.com',
          avatar: 'new-avatar.jpg',
          role: 'user',
          aboutMe: 'Updated bio',
          repForum: true,
          addCom: true,
          addBook: false,
          news: true
        };

        mockUpdate.mockResolvedValue(mockUpdatedUser);

        await authController.updateProfile(req, res);

        expect(mockUpdate).toHaveBeenCalledWith({
          where: { userId: 1 },
          data: {
            name: 'Updated Name',
            mail: 'updated@test.com',
            aboutMe: 'Updated bio',
            avatar: 'new-avatar.jpg',
            repForum: true,
            addCom: true,
            addBook: false,
            news: true
          }
        });

        expect(res.json).toHaveBeenCalledWith({
          message: 'Profil mis à jour',
          user: mockUpdatedUser
        });
      });

      test('should handle update profile errors', async () => {
        req.body = { name: 'Test' };
        req.user = { userId: 1 };

        mockUpdate.mockRejectedValue(new Error('Database error'));

        await authController.updateProfile(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Erreur lors de la mise à jour du profil' });
      });
    });

    describe('sendPasswordResetEmail', () => {
      let mockTransporter;

      beforeEach(() => {
        mockTransporter = {
          sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
        };
        nodemailer.createTransport.mockReturnValue(mockTransporter);
        crypto.randomBytes.mockReturnValue({ toString: () => 'random-token-123' });
      });

      test('should send password reset email successfully', async () => {
        req.body = { email: 'user@test.com' };

        const mockUser = { userId: 1, name: 'Test User' };
        mockFindUnique.mockResolvedValue(mockUser);
        mockDeleteMany.mockResolvedValue({ count: 0 });
        mockCreate.mockResolvedValue({
          userId: 1,
          token: 'random-token-123',
          expiresAt: expect.any(Date)
        });

        await authController.sendPasswordResetEmail(req, res);

        expect(mockFindUnique).toHaveBeenCalledWith({ where: { mail: 'user@test.com' } });
        expect(mockDeleteMany).toHaveBeenCalledWith({
          where: { expiresAt: { lt: expect.any(Date) } }
        });
        expect(mockCreate).toHaveBeenCalledWith({
          data: {
            userId: 1,
            token: 'random-token-123',
            expiresAt: expect.any(Date)
          }
        });
        expect(mockTransporter.sendMail).toHaveBeenCalledWith({
          from: '"WonderBook" <undefined>',
          to: 'user@test.com',
          subject: 'Réinitialisation de votre mot de passe',
          html: expect.stringContaining('Test User')
        });

        expect(res.json).toHaveBeenCalledWith({ success: true });
      });

      test('should return 404 when user not found', async () => {
        req.body = { email: 'notfound@test.com' };

        mockFindUnique.mockResolvedValue(null);

        await authController.sendPasswordResetEmail(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Aucun compte associé à cet e-mail.'
        });
      });

      test('should handle email sending errors', async () => {
        req.body = { email: 'user@test.com' };

        mockFindUnique.mockResolvedValue({ userId: 1, name: 'Test User' });
        mockDeleteMany.mockResolvedValue({ count: 0 });
        mockCreate.mockResolvedValue({});
        mockTransporter.sendMail.mockRejectedValue(new Error('Email error'));

        await authController.sendPasswordResetEmail(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Erreur serveur.'
        });
      });
    });

    describe('resetPassword', () => {
      test('should reset password successfully', async () => {
        req.params = { token: 'valid-token' };
        req.body = { newPassword: 'newPassword123!' };

        const mockResetToken = {
          id: 1,
          userId: 1,
          token: 'valid-token',
          expiresAt: new Date(Date.now() + 10000), // Future date
          user: { userId: 1, name: 'Test User' }
        };

        mockFindUnique.mockResolvedValue(mockResetToken);
        bcrypt.hash.mockResolvedValue('hashedNewPassword');
        mockUpdate.mockResolvedValue({});
        mockDelete.mockResolvedValue({});

        await authController.resetPassword(req, res);

        expect(mockFindUnique).toHaveBeenCalledWith({
          where: { token: 'valid-token' },
          include: { user: true }
        });
        expect(bcrypt.hash).toHaveBeenCalledWith('newPassword123!', 10);
        expect(mockUpdate).toHaveBeenCalledWith({
          where: { userId: 1 },
          data: { password: 'hashedNewPassword' }
        });
        expect(mockDelete).toHaveBeenCalledWith({
          where: { id: 1 }
        });

        expect(res.json).toHaveBeenCalledWith({
          success: true,
          message: 'Mot de passe réinitialisé avec succès.'
        });
      });

      test('should return 400 when token not found', async () => {
        req.params = { token: 'invalid-token' };
        req.body = { newPassword: 'newPassword123!' };

        mockFindUnique.mockResolvedValue(null);

        await authController.resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Lien expiré ou invalide.'
        });
      });

      test('should return 400 when token is expired', async () => {
        req.params = { token: 'expired-token' };
        req.body = { newPassword: 'newPassword123!' };

        const mockResetToken = {
          id: 1,
          userId: 1,
          token: 'expired-token',
          expiresAt: new Date(Date.now() - 10000), // Past date
          user: { userId: 1, name: 'Test User' }
        };

        mockFindUnique.mockResolvedValue(mockResetToken);

        await authController.resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Lien expiré ou invalide.'
        });
      });

      test('should handle database errors during reset', async () => {
        req.params = { token: 'valid-token' };
        req.body = { newPassword: 'newPassword123!' };

        mockFindUnique.mockRejectedValue(new Error('Database error'));

        await authController.resetPassword(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          message: 'Erreur serveur.'
        });
      });
    });

    describe('changePassword - additional tests', () => {
      test('should return 404 when user not found', async () => {
        req.body = { oldPassword: 'oldpass', newPassword: 'newpass' };
        req.user = { userId: 999 };

        mockFindUnique.mockResolvedValue(null);

        await authController.changePassword(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ message: 'Utilisateur introuvable.' });
      });

      test('should handle database errors', async () => {
        req.body = { oldPassword: 'oldpass', newPassword: 'newpass' };
        req.user = { userId: 1 };

        mockFindUnique.mockRejectedValue(new Error('Database error'));

        await authController.changePassword(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ message: 'Erreur serveur.' });
      });
    });

    describe('registerUser - additional tests', () => {
      beforeEach(() => {
        axios.post.mockResolvedValue({ data: { success: true } });
        sendConfirmationEmail.mockResolvedValue(true);
        jwt.sign.mockReturnValue('fake-token');
      });

      test('should handle captcha verification errors', async () => {
        req.body = {
          name: 'testuser',
          mail: 'test@test.com',
          password: 'Test123!',
          recaptchaToken: 'valid-token',
          website: ''
        };

        axios.post.mockRejectedValue(new Error('Network error'));

        await authController.registerUser(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({
          error: 'Erreur lors de la vérification du captcha.'
        });
      });
    });
  });
});

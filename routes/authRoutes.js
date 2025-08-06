// File: routes/authRoutes.js
const express = require('express');
const router = express.Router();

// ✅ Import du contrôleur complet
const authController = require('../controllers/authController');

// ✅ Import des middlewares
const hashPassword = require('../middleware/hashPassword');
const authenticate = require('../middleware/authenticate');
const loginLimiter = require('../middleware/rateLimit');

// ✅ Registration with hash + captcha + honeypot
router.post('/register', hashPassword, authController.registerUser);

// ✅ Login with rate limiter
router.post('/login', loginLimiter, authController.loginUser);

// ✅ Check authentication status (nouvelle route sécurisée)
router.get('/me', authenticate, authController.getMe);

// ✅ Logout (nouvelle route sécurisée)
router.post('/logout', authController.logoutUser);

// ✅ Update connected user profile
router.put('/profile', authenticate, authController.updateProfile);

// ✅ Change password
router.post('/change-password', authenticate, authController.changePassword);

// ✅ Send password reset email
router.post('/forget-password', authController.sendPasswordResetEmail);

// ✅ Reset password via link
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;

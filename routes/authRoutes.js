// File: routes/authRoutes.js
const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  updateProfile,
  changePassword,
  sendPasswordResetEmail, 
  resetPassword            
} = require("../controllers/authController");

const hashPassword = require("../middleware/hashPassword");
const authenticate = require("../middleware/authenticate");
const loginLimiter = require("../middleware/rateLimit");

// ✅ Registration with hash + captcha + honeypot
router.post("/register", hashPassword, registerUser);

// ✅ Login with rate limiter
router.post("/login", loginLimiter, loginUser);

// ✅ Update connected user profile
router.put("/profile", authenticate, updateProfile);

// ✅ Change password
router.post("/change-password", authenticate, changePassword);

// ✅ Send password reset email
router.post("/forget-password", sendPasswordResetEmail);

// ✅ Reset password via link
router.post("/reset-password/:token", resetPassword);

module.exports = router;

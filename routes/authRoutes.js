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

// ✅ Inscription avec hash + captcha + honeypot
router.post("/register", hashPassword, registerUser);

// ✅ Connexion avec rate limiter
router.post("/login", loginLimiter, loginUser);

// ✅ Mise à jour du profil utilisateur connecté
router.put("/profile", authenticate, updateProfile);

// ✅ Changement de mot de passe
router.post("/change-password", authenticate, changePassword);

// ✅ Envoi d'un e-mail de réinitialisation
router.post("/forget-password", sendPasswordResetEmail);

// ✅ Réinitialisation du mot de passe via lien
router.post("/reset-password/:token", resetPassword);

module.exports = router;

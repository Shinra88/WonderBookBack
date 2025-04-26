// middleware/rateLimit.js
const rateLimit = require("express-rate-limit");

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 tentatives max
  message: {
    error: "Trop de tentatives de connexion. Réessayez plus tard.",
  },
  standardHeaders: true, // Retourne les headers RateLimit
  legacyHeaders: false,
});

module.exports = loginLimiter;

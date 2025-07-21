//jwt.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'dev_secret';

function generateToken(payload) {
  if (!SECRET) {
    throw new Error("JWT_SECRET non défini dans l'environnement");
  }
  return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { generateToken, verifyToken };

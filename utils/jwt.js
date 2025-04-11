const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "dev_secret";

function generateToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "24h" });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { generateToken, verifyToken };

const bcrypt = require('bcryptjs');

async function hashPassword(req, res, next) {
  if (!req.body.password) {
    return res.status(400).json({ error: "Mot de passe requis." });
  }

  try {
    req.body.password = await bcrypt.hash(req.body.password, 10);
    next();
  } catch (err) {
    console.error("Erreur hash :", err);
    res.status(500).json({ error: "Erreur lors du hash du mot de passe." });
  }
}

module.exports = hashPassword;

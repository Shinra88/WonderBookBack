//authController
const jwt = require("jsonwebtoken");
const bcrypt = require('bcryptjs');
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.loginUser = async (req, res) => {
  try {
    const { mail, password } = req.body;
    const user = await prisma.user.findUnique({ where: { mail } });

    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Mot de passe incorrect." });

    const token = jwt.sign({ userId: user.userId, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "3h",
    });

    res.json({ token, user: { name: user.name, mail: user.mail, role: user.role } });
  } catch (err) {
    console.error("Erreur login :", err);
    res.status(500).json({ error: "Erreur serveur." });
  }
};

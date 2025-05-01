const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "dev_secret";

async function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, SECRET);

    // 🟢 Utiliser userId comme clé de recherche
    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
      select: {
        userId: true,
        name: true,
        avatar: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Utilisateur introuvable." });
    }

    // 🟢 Ajout correct dans req.user
    req.user = {
      userId: user.userId,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("❌ Erreur middleware authenticate :", error);
    res.status(403).json({ error: "Token invalide ou expiré" });
  }
}

module.exports = authenticate;

// controllers/adminController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔍 GET /api/admin/users → liste paginée avec recherche et filtrage
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = 'all',
    } = req.query;

    const currentPage = parseInt(page, 10);
    const take = parseInt(limit, 10);
    const skip = (currentPage - 1) * take;

    const where = {
      name: {
        contains: search.toLowerCase(),
      },
      
    };

    if (status !== 'all') {
      where.status = status;
    }

    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { created_at: 'desc' },
      select: {
        userId: true,
        name: true,
        mail: true,
        role: true,
        created_at: true,
        avatar: true,
        aboutMe: true,
        status: true,
      },
    });

    const total = await prisma.user.count({ where });

    res.json({ users, total });
  } catch (err) {
    console.error("❌ Erreur getAllUsers:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ✏️ PUT /api/users/:id → modifier rôle ou infos
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { role, name, mail } = req.body;

  try {
    const updated = await prisma.user.update({
      where: { userId: Number(id) },
      data: { role, name, mail },
    });

    res.json({ message: "Utilisateur mis à jour", user: updated });
  } catch (err) {
    console.error("Erreur updateUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// ❌ DELETE /api/users/:id → supprimer un utilisateur
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.user.delete({ where: { userId: Number(id) } });
    res.json({ message: "Utilisateur supprimé" });
  } catch (err) {
    console.error("Erreur deleteUser:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

// 🔄 PUT /api/users/:id/status → modifier le statut d'un utilisateur
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  try {
    const updated = await prisma.user.update({
      where: { userId: Number(id) },
      data: { status },
    });

    res.json({ message: "Statut mis à jour", user: updated });
  } catch (err) {
    console.error("Erreur updateUserStatus:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
};


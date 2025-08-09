// controllers/adminController.js
const { PrismaClient } = require('@prisma/client');
const { createLog, LOG_ACTIONS } = require('./logsController');
const prisma = new PrismaClient();

// 🔍 GET /api/admin/users → paginated list with search and filtering
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = 'all' } = req.query;
    const currentPage = parseInt(page, 10);
    const take = parseInt(limit, 10);
    const skip = (currentPage - 1) * take;

    const where = {
      name: {
        contains: search.toLowerCase()
      }
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
        status: true
      }
    });

    const total = await prisma.user.count({ where });

    res.json({ users, total });
  } catch (err) {
    console.error('❌ Erreur getAllUsers:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ✏️ PUT /api/users/:id → change role or info
exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const { role, name, mail } = req.body;

  try {
    // Récupérer l'utilisateur avant modification pour comparer
    const beforeUpdate = await prisma.user.findUnique({
      where: { userId: Number(id) },
      select: { role: true, name: true, mail: true }
    });

    const updated = await prisma.user.update({
      where: { userId: Number(id) },
      data: { role, name, mail }
    });

    // 📊 Log des modifications
    try {
      if (beforeUpdate.role !== role) {
        await createLog(
          req.user.userId,
          `${LOG_ACTIONS.USER_ROLE_CHANGED} : ${beforeUpdate.role} → ${role}`,
          Number(id),
          'user'
        );
      }

      if (beforeUpdate.name !== name || beforeUpdate.mail !== mail) {
        await createLog(req.user.userId, LOG_ACTIONS.USER_PROFILE_UPDATED, Number(id), 'user');
      }
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.json({ message: 'Utilisateur mis à jour', user: updated });
  } catch (err) {
    console.error('Erreur updateUser:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// ❌ DELETE /api/users/:id → delete a user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    // Récupérer le nom de l'utilisateur avant suppression
    const userToDelete = await prisma.user.findUnique({
      where: { userId: Number(id) },
      select: { name: true }
    });

    await prisma.user.delete({ where: { userId: Number(id) } });

    // 📊 Log de la suppression
    try {
      await createLog(
        req.user.userId,
        `Utilisateur supprimé : ${userToDelete?.name || 'Inconnu'}`,
        Number(id),
        'user'
      );
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('Erreur deleteUser:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// 🔄 PUT /api/users/:id/status → change a user's status
exports.updateUserStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['active', 'suspended', 'banned'].includes(status)) {
    return res.status(400).json({ error: 'Statut invalide.' });
  }

  try {
    // Récupérer le statut actuel
    const beforeUpdate = await prisma.user.findUnique({
      where: { userId: Number(id) },
      select: { status: true, name: true }
    });

    const updated = await prisma.user.update({
      where: { userId: Number(id) },
      data: { status }
    });

    // 📊 Log du changement de statut
    try {
      let logAction;
      switch (status) {
        case 'suspended':
          logAction = `${LOG_ACTIONS.USER_SUSPENDED} : ${beforeUpdate?.name || 'Utilisateur inconnu'}`;
          break;
        case 'active':
          logAction = `${LOG_ACTIONS.USER_ACTIVATED} : ${beforeUpdate?.name || 'Utilisateur inconnu'}`;
          break;
        case 'banned':
          logAction = `${LOG_ACTIONS.USER_BANNED} : ${beforeUpdate?.name || 'Utilisateur inconnu'}`;
          break;
        default:
          logAction = `Statut utilisateur changé en ${status} : ${beforeUpdate?.name || 'Utilisateur inconnu'}`;
      }

      await createLog(req.user.userId, logAction, Number(id), 'user');
    } catch (logError) {
      console.error('⚠️ Erreur lors de la création du log:', logError);
    }

    res.json({ message: 'Statut mis à jour', user: updated });
  } catch (err) {
    console.error('Erreur updateUserStatus:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// controllers/logsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 🔍 GET /api/logs → récupérer tous les logs avec pagination et filtres
exports.getAllLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, targetType, action, startDate, endDate } = req.query;

    const currentPage = parseInt(page, 10);
    const take = parseInt(limit, 10);
    const skip = (currentPage - 1) * take;

    const where = {};

    if (userId) where.userId = parseInt(userId, 10);
    if (targetType) where.targetType = targetType;
    if (action) where.action = { contains: action };
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    const logs = await prisma.logs.findMany({
      where,
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take
    });

    const total = await prisma.logs.count({ where });

    res.json({
      logs,
      total,
      pagination: {
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ Erreur getAllLogs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des logs' });
  }
};

// 🔍 GET /api/logs/user/:userId → récupérer les logs d'un utilisateur spécifique
exports.getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const currentPage = parseInt(page, 10);
    const take = parseInt(limit, 10);
    const skip = (currentPage - 1) * take;

    const logs = await prisma.logs.findMany({
      where: { userId: parseInt(userId, 10) },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      skip,
      take
    });

    const total = await prisma.logs.count({ where: { userId: parseInt(userId, 10) } });

    res.json({
      logs,
      total,
      pagination: {
        page: currentPage,
        limit: take,
        totalPages: Math.ceil(total / take)
      }
    });
  } catch (error) {
    console.error('❌ Erreur getUserLogs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des logs utilisateur' });
  }
};

// 📊 GET /api/logs/stats → statistiques des logs
exports.getLogsStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) where.created_at.gte = new Date(startDate);
      if (endDate) where.created_at.lte = new Date(endDate);
    }

    // Statistiques par type d'action
    const actionStats = await prisma.logs.groupBy({
      by: ['targetType'],
      where,
      _count: {
        logId: true
      }
    });

    // Utilisateurs les plus actifs
    const userStats = await prisma.logs.groupBy({
      by: ['userId'],
      where,
      _count: {
        logId: true
      },
      orderBy: {
        _count: {
          logId: 'desc'
        }
      },
      take: 10
    });

    // Récupérer les noms des utilisateurs
    const userIds = userStats.map((stat) => stat.userId);
    const users = await prisma.user.findMany({
      where: {
        userId: {
          in: userIds
        }
      },
      select: {
        userId: true,
        name: true,
        role: true
      }
    });

    const enrichedUserStats = userStats.map((stat) => ({
      ...stat,
      user: users.find((user) => user.userId === stat.userId)
    }));

    res.json({
      actionStats,
      userStats: enrichedUserStats
    });
  } catch (error) {
    console.error('❌ Erreur getLogsStats:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des statistiques' });
  }
};

// ➕ POST /api/logs → créer un nouveau log (fonction utilitaire)
exports.createLog = async (userId, action, targetId = null, targetType = null) => {
  try {
    const log = await prisma.logs.create({
      data: {
        userId,
        action,
        targetId,
        targetType
      }
    });
    return log;
  } catch (error) {
    console.error('❌ Erreur createLog:', error);
    throw error;
  }
};

// Actions prédéfinies pour assurer la cohérence
exports.LOG_ACTIONS = {
  // Actions sur les livres
  BOOK_ADDED: 'Livre ajouté',
  BOOK_VALIDATED: 'Livre validé',
  BOOK_DENIED: 'Livre refusé',
  BOOK_UPDATED: 'Livre modifié',
  BOOK_DELETED: 'Livre supprimé',

  // Actions sur les utilisateurs
  USER_SUSPENDED: 'Utilisateur suspendu',
  USER_ACTIVATED: 'Utilisateur activé',
  USER_BANNED: 'Utilisateur banni',
  USER_ROLE_CHANGED: 'Rôle utilisateur modifié',
  USER_PROFILE_UPDATED: 'Profil utilisateur modifié',

  // Actions sur les commentaires
  COMMENT_ADDED: 'Commentaire ajouté',
  COMMENT_UPDATED: 'Commentaire modifié',
  COMMENT_DELETED: 'Commentaire supprimé',

  // Actions sur le forum - Sujets
  SUBJECT_CREATED: 'Sujet créé',
  SUBJECT_UPDATED: 'Sujet modifié',
  SUBJECT_DELETED: 'Sujet supprimé',

  // Actions sur le forum - Posts
  POST_ADDED: 'Post ajouté',
  POST_UPDATED: 'Post modifié',
  POST_DELETED: 'Post supprimé'
};

// routes/logsRoutes.js
const express = require('express');
const router = express.Router();
const { getAllLogs, getUserLogs, getLogsStats } = require('../controllers/logsController');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');

// 👮 All routes here require authentication
router.use(authenticate);

// 🔍 GET /api/logs → récupérer tous les logs (admin seulement)
router.get('/', authorizeRoles('admin'), getAllLogs);

// 🔍 GET /api/logs/user/:userId → récupérer les logs d'un utilisateur (admin/moderator)
router.get('/user/:userId', authorizeRoles('admin', 'moderator'), getUserLogs);

// 📊 GET /api/logs/stats → statistiques des logs (admin seulement)
router.get('/stats', authorizeRoles('admin'), getLogsStats);

module.exports = router;

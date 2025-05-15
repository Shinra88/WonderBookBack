// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  updateUser,
  updateUserStatus,
  deleteUser
} = require('../controllers/adminController');

const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');

// ✅ Toutes les routes nécessitent d’être connecté
router.use(authenticate);

// ✅ Liste des utilisateurs accessible à admin & modérateurs
router.get('/users', authorizeRoles('admin', 'moderator'), getAllUsers);

// ✅ Mise à jour générale d'un utilisateur (admin uniquement recommandé ou fort contrôle dans le contrôleur)
router.put('/users/:id', authorizeRoles('admin', 'moderator'), updateUser);

// ✅ Mise à jour spécifique du **statut** (active / suspended / banned)
router.put('/users/:id/status', authorizeRoles('admin', 'moderator'), updateUserStatus);

// ❌ Suppression d'utilisateur réservée à l'admin uniquement
router.delete('/users/:id', authorizeRoles('admin'), deleteUser);

module.exports = router;

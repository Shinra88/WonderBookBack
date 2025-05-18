// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser, updateUserStatus } = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');

// 👮 Toutes les routes ici nécessitent un rôle admin
router.use(authenticate);
router.use(authorizeRoles('admin'));

// Routes admin pour gestion utilisateurs
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/status', updateUserStatus);

module.exports = router;

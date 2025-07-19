// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { getAllUsers, updateUser, deleteUser, updateUserStatus } = require('../controllers/adminController');
const authenticate = require('../middleware/authenticate');
const authorizeRoles = require('../middleware/authorizeRoles');

// 👮 All routes here require an admin role
router.use(authenticate);
router.use(authorizeRoles('admin'));

// Admin routes for user management
router.get('/users', getAllUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/status', updateUserStatus);

module.exports = router;



const express = require('express');
const router  = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
    getAdminStats,
    getUsers,
    changeUserRole,
    toggleUser,
    removeUser,
    getConsultations,
    getPrescriptions
} = require('../controllers/adminController');

// Admin auth middleware
const isAdmin = [verifyToken, checkRole('Admin')];

// Stats
router.get('/stats',           isAdmin, getAdminStats);

// Users
router.get('/users',           isAdmin, getUsers);
router.put('/users/:id/role',  isAdmin, changeUserRole);
router.put('/users/:id/toggle',isAdmin, toggleUser);
router.delete('/users/:id',    isAdmin, removeUser);

// Consultations
router.get('/consultations',   isAdmin, getConsultations);

// Prescriptions
router.get('/prescriptions',   isAdmin, getPrescriptions);

module.exports = router;
// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const {
    getAdminStats,
    getUsers,
    getUserById,
    changeUserRole,
    toggleUser,
    removeUser,
    getConsultations,
    getConsultationById,
    getPrescriptions,
    getPrescriptionById,
    getDoctorDetails,
    approveDoctor,
    rejectDoctor,
    getAllDoctors,
    getPendingDoctors,
    getDoctorsMissingLicense,
    updateDoctorLicense
} = require('../controllers/adminController');

// Admin auth middleware - only users with 'Admin' role can access these routes
const isAdmin = [verifyToken, checkRole('Admin')];

// ===========================
// STATS ROUTES
// ===========================
router.get('/stats', isAdmin, getAdminStats);

// ===========================
// USER MANAGEMENT ROUTES
// ===========================
router.get('/users', isAdmin, getUsers);
router.get('/users/:id', isAdmin, getUserById);
router.put('/users/:id/role', isAdmin, changeUserRole);
router.put('/users/:id/toggle', isAdmin, toggleUser);
router.delete('/users/:id', isAdmin, removeUser);

// ===========================
// CONSULTATION ROUTES
// ===========================
router.get('/consultations', isAdmin, getConsultations);

router.get('/consultations/:id', isAdmin, getConsultationById);

// ===========================
// PRESCRIPTION ROUTES
// ===========================
router.get('/prescriptions', isAdmin, getPrescriptions);
router.get('/prescriptions/:id', isAdmin, getPrescriptionById);

// ===========================
// DOCTOR MANAGEMENT ROUTES
// ===========================
// Get all doctors
router.get('/doctors', isAdmin, getAllDoctors);

// Get pending doctors (approved = false but have license)
router.get('/doctors/pending', isAdmin, getPendingDoctors);

// Get doctors missing license numbers
router.get('/doctors/missing-license', isAdmin, getDoctorsMissingLicense);

// Get single doctor details
router.get('/doctors/:id', isAdmin, getDoctorDetails);

// Approve a doctor (only if they have license number)
router.put('/doctors/:id/approve', isAdmin, approveDoctor);

// Reject a doctor
router.put('/doctors/:id/reject', isAdmin, rejectDoctor);

// Update doctor's license number
router.put('/doctors/:id/license', isAdmin, updateDoctorLicense);

// ===========================
// TEST ROUTE (for debugging)
// ===========================
router.get('/test', isAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Admin access confirmed',
        user: req.user
    });
});



module.exports = router;
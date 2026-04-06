

const {
    getStats,
    getAllUsers,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getAllConsultations,
    getAllPrescriptions
} = require('../models/adminModel');

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
    try {
        const stats = await getStats();
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error fetching stats");
    }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
    try {
        const users = await getAllUsers();
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error fetching users");
    }
};

// PUT /api/admin/users/:id/role
const changeUserRole = async (req, res) => {
    const { id }   = req.params;
    const { role } = req.body;

    if (!['Patient', 'Doctor', 'Admin'].includes(role)) {
        return res.status(400).json("Invalid role");
    }

    try {
        const updated = await updateUserRole(id, role);
        if (!updated) return res.status(404).json("User not found");
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error updating role");
    }
};

// PUT /api/admin/users/:id/toggle
const toggleUser = async (req, res) => {
    try {
        const updated = await toggleUserStatus(req.params.id);
        if (!updated) return res.status(404).json("User not found");
        res.json(updated);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error toggling user status");
    }
};

// DELETE /api/admin/users/:id
const removeUser = async (req, res) => {
    try {
        const result = await deleteUser(req.params.id);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error deleting user");
    }
};

// GET /api/admin/consultations
const getConsultations = async (req, res) => {
    try {
        const consultations = await getAllConsultations();
        res.json(consultations);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error fetching consultations");
    }
};

// GET /api/admin/prescriptions
const getPrescriptions = async (req, res) => {
    try {
        const prescriptions = await getAllPrescriptions();
        res.json(prescriptions);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error fetching prescriptions");
    }
};

module.exports = {
    getAdminStats,
    getUsers,
    changeUserRole,
    toggleUser,
    removeUser,
    getConsultations,
    getPrescriptions
};
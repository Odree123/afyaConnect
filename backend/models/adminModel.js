

const pool = require('../config/db');

// Get system stats
const getStats = async () => {
    const [patients, doctors, consultations, prescriptions, paid] = await Promise.all([
        pool.query("SELECT COUNT(*) FROM users WHERE role='Patient'"),
        pool.query("SELECT COUNT(*) FROM users WHERE role='Doctor'"),
        pool.query("SELECT COUNT(*) FROM consultations"),
        pool.query("SELECT COUNT(*) FROM prescriptions"),
        pool.query("SELECT COUNT(*) FROM consultations WHERE status IN ('paid','in_progress','completed')")
    ]);

    return {
        total_patients:      parseInt(patients.rows[0].count),
        total_doctors:       parseInt(doctors.rows[0].count),
        total_consultations: parseInt(consultations.rows[0].count),
        total_prescriptions: parseInt(prescriptions.rows[0].count),
        paid_consultations:  parseInt(paid.rows[0].count)
    };
};

// Get all users
const getAllUsers = async () => {
    const result = await pool.query(
        `SELECT id, name, email, phone, role, specialization, is_available, created_at
         FROM users
         ORDER BY created_at DESC`
    );
    return result.rows;
};

// Update user role
const updateUserRole = async (id, role) => {
    const result = await pool.query(
        `UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, email, role`,
        [role, id]
    );
    return result.rows[0];
};

// Toggle user active/inactive
const toggleUserStatus = async (id) => {
    const user = await pool.query("SELECT is_available FROM users WHERE id=$1", [id]);
    const current = user.rows[0]?.is_available;

    const result = await pool.query(
        `UPDATE users SET is_available=$1 WHERE id=$2 RETURNING id, name, is_available`,
        [!current, id]
    );
    return result.rows[0];
};

// Delete user
const deleteUser = async (id) => {
    await pool.query("DELETE FROM users WHERE id=$1", [id]);
    return { message: "User deleted successfully" };
};

// Get all consultations
const getAllConsultations = async () => {
    const result = await pool.query(
        `SELECT consultations.*,
                p.name AS patient_name,
                d.name AS doctor_name
         FROM consultations
         LEFT JOIN users p ON consultations.patient_id = p.id
         LEFT JOIN users d ON consultations.doctor_id  = d.id
         ORDER BY consultations.created_at DESC`
    );
    return result.rows;
};

// Get all prescriptions
const getAllPrescriptions = async () => {
    const result = await pool.query(
        `SELECT prescriptions.*,
                p.name AS patient_name,
                d.name AS doctor_name
         FROM prescriptions
         LEFT JOIN users p ON prescriptions.patient_id = p.id
         LEFT JOIN users d ON prescriptions.doctor_id  = d.id
         ORDER BY prescriptions.issued_at DESC`
    );
    return result.rows;
};

module.exports = {
    getStats,
    getAllUsers,
    updateUserRole,
    toggleUserStatus,
    deleteUser,
    getAllConsultations,
    getAllPrescriptions
};
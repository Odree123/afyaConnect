// models/adminModel.js
const pool = require('../config/db');

class AdminModel {

    // ===============================
    // ADMIN STATS
    // ===============================
    static async getStats() {
        try {
            const patients = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['Patient']);
            const doctors = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['Doctor']);
            const consultations = await pool.query('SELECT COUNT(*) FROM consultations');
            const prescriptions = await pool.query('SELECT COUNT(*) FROM prescriptions');
            const paidConsultations = await pool.query(
                `SELECT COUNT(*) FROM consultations 
                 WHERE status = 'paid' OR mpesa_checkout_id IS NOT NULL`
            );

            return {
                total_patients: parseInt(patients.rows[0].count || 0),
                total_doctors: parseInt(doctors.rows[0].count || 0),
                total_consultations: parseInt(consultations.rows[0].count || 0),
                total_prescriptions: parseInt(prescriptions.rows[0].count || 0),
                paid_consultations: parseInt(paidConsultations.rows[0].count || 0)
            };
        } catch (error) {
            console.error('Error in getStats:', error);
            throw error;
        }
    }

    // ===============================
    // USERS & DOCTORS
    // ===============================
    static async getAllUsers(filters = {}) {
        try {
            let query = `
                SELECT id, name, email, phone, role, is_available, is_approved,
                       specialization, license_number, created_at, updated_at
                FROM users
                WHERE true
            `;
            const params = [];
            let count = 1;

            if (filters.role) {
                query += ` AND role = $${count++}`;
                params.push(filters.role);
            }
            if (filters.is_available !== undefined) {
                query += ` AND is_available = $${count++}`;
                params.push(filters.is_available);
            }

            query += ` ORDER BY created_at DESC`;
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    // THIS WAS MISSING - ADD THIS NOW
    static async getDoctorById(id) {
        try {
            const result = await pool.query(
                `SELECT id, name, email, phone, specialization, 
                        license_number, is_approved, is_available, created_at 
                 FROM users 
                 WHERE id = $1 AND role = 'Doctor'`,
                [id]
            );
            return result.rows[0];
        } catch (error) {
            console.error('Error in getDoctorById:', error);
            throw error;
        }
    }

    static async getUserById(id) {
        try {
            const result = await pool.query(
                `SELECT id, name, email, phone, role, is_available, is_approved,
                        specialization, license_number, created_at, updated_at
                 FROM users WHERE id = $1`,
                [id]
            );
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // ===============================
    // ACTIONS
    // ===============================
    static async approveDoctor(id) {
        try {
            // Check if doctor exists and has license
            const check = await pool.query(`SELECT license_number FROM users WHERE id = $1`, [id]);
            if (check.rows.length === 0) throw new Error('Doctor not found');
            if (!check.rows[0]?.license_number) {
                throw new Error('Cannot approve doctor: License number is required');
            }

            const result = await pool.query(
                `UPDATE users SET is_approved = true, updated_at = NOW() WHERE id = $1
                 RETURNING id, name, is_approved`,
                [id]
            );
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async toggleUserStatus(id) {
        try {
            const current = await pool.query(`SELECT is_available FROM users WHERE id = $1`, [id]);
            if (current.rows.length === 0) throw new Error('User not found');

            const newStatus = !current.rows[0].is_available;
            const result = await pool.query(
                `UPDATE users SET is_available = $1, updated_at = NOW() WHERE id = $2
                 RETURNING id, name, email, is_available, updated_at`,
                [newStatus, id]
            );
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    static async deleteUser(id) {
        try {
            const result = await pool.query(`DELETE FROM users WHERE id = $1 RETURNING id, name, email`, [id]);
            return result.rows[0];
        } catch (error) {
            throw error;
        }
    }

    // ===============================
    // CONSULTATIONS & PRESCRIPTIONS
    // ===============================
    static async getAllConsultations(filters = {}) {
        try {
            let query = `
                SELECT c.*, p.name AS patient_name, d.name AS doctor_name
                FROM consultations c
                LEFT JOIN users p ON c.patient_id = p.id
                LEFT JOIN users d ON c.doctor_id = d.id
                WHERE true
            `;
            const params = [];
            let count = 1;

            if (filters.status) {
                query += ` AND c.status = $${count++}`;
                params.push(filters.status);
            }

            query += ` ORDER BY c.created_at DESC`;
            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }

    static async getAllPrescriptions() {
        try {
            const query = `
                SELECT p.*, u.name AS patient_name, d.name AS doctor_name
                FROM prescriptions p
                LEFT JOIN users u ON p.patient_id = u.id
                LEFT JOIN users d ON p.doctor_id = d.id
                ORDER BY p.issued_at DESC`; 
            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = AdminModel;
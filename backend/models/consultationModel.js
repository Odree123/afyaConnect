const pool = require('../config/db');

// Function to request a consultation
const createConsultationRequest = async (patient_id, doctor_id) => {
    const result = await pool.query(
        "INSERT INTO consultations (patient_id, doctor_id, status) VALUES ($1, $2, $3) RETURNING *",
        [patient_id, doctor_id, 'requested']
    );
    return result.rows[0];
};

// Get consultations for a doctor
const getDoctorConsultations = async (doctor_id) => {
    const result = await pool.query(
        `SELECT consultations.*, users.name AS patient_name
         FROM consultations
         LEFT JOIN users ON consultations.patient_id = users.id
         WHERE consultations.doctor_id = $1
         ORDER BY consultations.created_at DESC`,
        [doctor_id]
    );
    return result.rows;
};

// Doctor accepts consultation
const acceptConsultation = async (consultation_id) => {
    const result = await pool.query(
        `UPDATE consultations
         SET status = 'accepted'
         WHERE id = $1
         RETURNING consultations.*, 
         (SELECT name FROM users WHERE id = consultations.patient_id) AS patient_name,
         (SELECT name FROM users WHERE id = consultations.doctor_id) AS doctor_name`,
        [consultation_id]
    );
    return result.rows[0];
};

// Pay for consultation
const payConsultation = async (consultation_id, checkout_id) => {
    const result = await pool.query(
        `UPDATE consultations
         SET status = 'paid',
             mpesa_checkout_id = $2
         WHERE id = $1
         RETURNING *`,
        [consultation_id, checkout_id]
    );
    return result.rows[0];
};

// Start consultation
const startConsultation = async (consultation_id) => {
    const result = await pool.query(
        `UPDATE consultations
         SET status = 'in_progress'
         WHERE id = $1
         RETURNING *`,
        [consultation_id]
    );
    return result.rows[0];
};

// Get consultation by ID
const getConsultationById = async (id) => {
    const result = await pool.query(
        `SELECT consultations.*, 
         p.name AS patient_name, 
         d.name AS doctor_name
         FROM consultations
         LEFT JOIN users p ON consultations.patient_id = p.id
         LEFT JOIN users d ON consultations.doctor_id = d.id
         WHERE consultations.id = $1`,
        [id]
    );
    return result.rows[0];
};

// Complete consultation
const completeConsultation = async (consultation_id) => {
    const result = await pool.query(
        `UPDATE consultations
         SET status = 'completed'
         WHERE id = $1
         RETURNING *`,
        [consultation_id]
    );
    return result.rows[0];
};

// Get patient consultations
const getPatientConsultations = async (patient_id) => {
    const result = await pool.query(
        `SELECT consultations.*, users.name AS doctor_name
         FROM consultations
         LEFT JOIN users ON consultations.doctor_id = users.id
         WHERE consultations.patient_id = $1
         ORDER BY consultations.created_at DESC`,
        [patient_id]
    );
    console.log("Result:", result.rows);
    return result.rows;
};

// ===========================
// ADD THESE MISSING FUNCTIONS
// ===========================

// Get consultations by status (for cron job)
const getConsultationsByStatus = async (status) => {
    const result = await pool.query(
        `SELECT * FROM consultations WHERE status = $1`,
        [status]
    );
    return result.rows;
};

// Update consultation status
const updateConsultationStatus = async (consultation_id, status) => {
    const result = await pool.query(
        `UPDATE consultations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [status, consultation_id]
    );
    return result.rows[0];
};

// Get expired accepted consultations (for cleanup)
const getExpiredAcceptedConsultations = async (minutesAgo = 10) => {
    const result = await pool.query(
        `SELECT * FROM consultations 
         WHERE status = 'accepted' 
         AND created_at < NOW() - INTERVAL '${minutesAgo} minutes'`,
        []
    );
    return result.rows;
};

module.exports = { 
    createConsultationRequest, 
    getDoctorConsultations, 
    acceptConsultation, 
    payConsultation, 
    startConsultation, 
    getConsultationById, 
    completeConsultation, 
    getPatientConsultations,
    getConsultationsByStatus,     
    updateConsultationStatus,      
    getExpiredAcceptedConsultations 
};
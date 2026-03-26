

const pool = require('../config/db');

// Function to request a consultation
const createConsultationRequest = async (patient_id, doctor_id) => {
    const result = await pool.query(
        "INSERT INTO consultations (patient_id, doctor_id,status) VALUES ($1, $2,$3) RETURNING *",
        [patient_id, doctor_id , 'requested']
    );
    return result.rows[0];
};

// Get consultations for a doctor
const getDoctorConsultations = async (doctor_id) => {
    const result = await pool.query(
        `SELECT consultations.*, users.name AS patient_name
         FROM consultations
         JOIN users ON consultations.patient_id = users.id
         WHERE consultations.doctor_id = $1
         ORDER BY consultations.created_at DESC`,
        [doctor_id]
    );

    return result.rows;
};

// doctor accepts consultation
const acceptConsultation = async (consultation_id) => {
    const result = await pool.query(
        `UPDATE consultations
         SET status = 'accepted'
         WHERE id = $1
         RETURNING *`,
        [consultation_id]
    );

    return result.rows[0];
};

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


const getConsultationById = async (id) => {
    const result = await pool.query("SELECT * FROM consultations WHERE id = $1", [id]);
    return result.rows[0];
};


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
module.exports = { createConsultationRequest, getDoctorConsultations, acceptConsultation, payConsultation, startConsultation, getConsultationById, completeConsultation };

  

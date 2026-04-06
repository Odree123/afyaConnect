const pool = require('../config/db');

// Create Prescription
const createPrescription = async (
    consultation_id,
    doctor_id,
    patient_id,
    diagnosis,
    medication_name,
    dosage,
    instructions
) => {
    const result = await pool.query(
        `INSERT INTO prescriptions 
        (consultation_id, doctor_id, patient_id, diagnosis, medication_name, dosage, instructions)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [consultation_id, doctor_id, patient_id, diagnosis, medication_name, dosage, instructions]
    );

    return result.rows[0];
};

//  Get All Prescriptions
const getAllPrescriptions = async (patient_id) => {
    const result = await pool.query(
        `SELECT 
            prescriptions.*,
            users.name AS doctor_name
         FROM prescriptions
         LEFT JOIN users ON prescriptions.doctor_id = users.id
         WHERE prescriptions.patient_id = $1
         ORDER BY prescriptions.id DESC`,
        [patient_id]
    );
    return result.rows;
};

module.exports = {
    createPrescription,
    getAllPrescriptions
};
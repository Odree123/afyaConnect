const { createPrescription, getAllPrescriptions: fetchAll } = require('../models/prescriptionModel');
const { getConsultationById } = require('../models/consultationModel');


const addPrescription = async (req, res) => {
    const { consultation_id, diagnosis, medication_name, dosage, instructions } = req.body;

    try {
        const consultation = await getConsultationById(consultation_id);

        if (!consultation) return res.status(404).json("Consultation not found");

        // PRO-TIP: During testing, ensure your consultation status matches this exactly!
        if (consultation.status !== "in_progress") {
            return res.status(400).json("Consultation must be in progress to prescribe");
        }

        const prescription = await createPrescription(
            consultation_id,
            consultation.doctor_id,
            consultation.patient_id,
            diagnosis,
            medication_name,
            dosage,
            instructions    
        );

        res.status(201).json(prescription);
    } catch (err) {
        console.error("Prescription error:", err.message);
        res.status(500).json("Error adding prescription");
    }
};

const getAllPrescriptions = async (req, res) => {
    try {
        const patient_id = req.user.id; // ✅ get from token, not URL
        const prescriptions = await fetchAll(patient_id); // ✅ pass patient_id

        res.status(200).json({
            success: true,
            prescriptions
        });
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch' });
    }
};

module.exports = { addPrescription, getAllPrescriptions };
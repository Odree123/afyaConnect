
const { createConsultationRequest, getDoctorConsultations, acceptConsultation,payConsultation ,startConsultation,completeConsultation,getConsultationById,} = require('../models/consultationModel');

const requestConsultation = async (req,res)=>{
    const{ patient_id, doctor_id }=req.body;

    try{
        const newRequest = await createConsultationRequest(patient_id, doctor_id);
        res.json(newRequest);   
    } catch (error) {
        console.error(error.message)
        res.status(500).json("Error sending  consultation request"); 
    }
}


// Doctor views requests
const viewDoctorConsultations = async (req, res) => {
    const doctor_id = req.params.doctor_id;

    try {
        const consultations = await getDoctorConsultations(doctor_id);
        res.json(consultations);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Error fetching consultations");
    }
};

const acceptConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        const updatedConsultation = await acceptConsultation(id);

        if (!updatedConsultation) {
            return res.status(404).json("Consultation not found");
        }

        res.json(updatedConsultation);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error accepting consultation");
    }
};

const payConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        // simulate mpesa checkout id
        const fakeCheckoutId = "MPESA_" + Date.now();

        const updated = await payConsultation(id, fakeCheckoutId);

        if (!updated) {
            return res.status(404).json("Consultation not found");
        }

        res.json({
            message: "Payment successful (simulated)",
            data: updated
        });

    } catch (err) {
        console.error(err);
        res.status(500).json("Payment failed");
    }
};
const startConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        const consultation = await getConsultationById(id);
        if (!consultation) {
            return res.status(404).json("Consultation not found");
        }
        // Check if consultation is paid

        if (consultation.status !== "paid") {
            return res.status(400).json("Consultation must be paid first");
        }

        const updated = await startConsultation(id);

        res.json(updated);

    } catch (err) {
        res.status(500).json("Error starting consultation");
    }
};

const completeConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        const consultation = await getConsultationById(id);

        if (!consultation) {
            return res.status(404).json("Consultation not found");
        }

        // Only allow if consultation is in progress
        if (consultation.status !== "in_progress") {
            return res.status(400).json("Consultation must be in progress");
        }

        const updated = await completeConsultation(id);

        res.json({
            message: "Consultation completed successfully",
            data: updated
        });

    } catch (err) {
        console.error(err);
        res.status(500).json("Error completing consultation");
    }
};



module.exports = { requestConsultation, viewDoctorConsultations, acceptConsultationController, payConsultationController, startConsultationController, completeConsultationController };
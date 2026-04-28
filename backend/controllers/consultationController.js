const { createConsultationRequest, getDoctorConsultations, acceptConsultation, payConsultation, startConsultation, completeConsultation, getConsultationById, getPatientConsultations, } = require('../models/consultationModel');

let io; // will be set from server.js

const setIO = (socketIO) => { io = socketIO; };

// ===========================
// REQUEST CONSULTATION (Patient)
// ===========================
const requestConsultation = async (req, res) => {
    const patient_id = req.user.id;
    const { doctor_id } = req.body;
    console.log("req.user:", req.user);

    try {
        const newRequest = await createConsultationRequest(patient_id, doctor_id);
        
        // Notify doctor about new request
        if (io) {
            io.to(`user_${doctor_id}`).emit('new_consultation_request', {
                consultation_id: newRequest.id,
                patient_id: patient_id,
                patient_name: req.user.name,
                message: 'New consultation request received'
            });
            console.log(`📨 New request notification sent to doctor ${doctor_id}`);
        }
        
        res.json(newRequest);
    } catch (error) {
        console.error(error.message);
        res.status(500).json("Error sending consultation request");
    }
};

// ===========================
// VIEW DOCTOR CONSULTATIONS
// ===========================
const viewDoctorConsultations = async (req, res) => {
    const doctor_id = req.params.doctor_id;
    console.log("Doctor ID received:", doctor_id);

    try {
        const consultations = await getDoctorConsultations(doctor_id);
        console.log("Consultations found:", consultations);
        res.json(consultations);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Error fetching consultations");
    }
};

// ===========================
// ACCEPT CONSULTATION (Doctor) - WITH AUTO-EXPIRY (10 MINUTES)
// ===========================
const acceptConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        const updatedConsultation = await acceptConsultation(id);

        if (!updatedConsultation) {
            return res.status(404).json("Consultation not found");
        }

        // ✅ Notify patient that doctor accepted (with payment deadline)
        if (io) {
            io.to(`user_${updatedConsultation.patient_id}`).emit('consultation_accepted', {
                consultation_id: updatedConsultation.id,
                message: 'Your consultation request has been accepted! You have 10 minutes to pay.',
                doctor_id: updatedConsultation.doctor_id,
                doctor_name: updatedConsultation.doctor_name
            });
            console.log(`✅ Notification sent to patient ${updatedConsultation.patient_id}`);
        }

        // ✅ Auto-expire after 10 minutes if not paid
        setTimeout(async () => {
            try {
                const pool = require('../config/db');
                
                // Check current status
                const check = await pool.query(
                    `SELECT status, patient_id, doctor_id FROM consultations WHERE id = $1`,
                    [id]
                );

                if (check.rows.length === 0) {
                    console.log(`⚠️ Consultation #${id} not found during expiry check`);
                    return;
                }

                const currentStatus = check.rows[0]?.status;
                
                // Only expire if still 'accepted' (not paid yet)
                if (currentStatus === 'accepted') {
                    // Update status to expired
                    await pool.query(
                        `UPDATE consultations SET status = 'expired' WHERE id = $1`,
                        [id]
                    );
                    console.log(`⏰ Consultation #${id} expired — patient did not pay within 10 minutes`);

                    // Notify both doctor and patient about expiry
                    if (io) {
                        // Notify patient
                        io.to(`user_${check.rows[0].patient_id}`).emit('consultation_expired', {
                            consultation_id: id,
                            message: 'Your consultation request has expired because payment was not completed within 10 minutes. Please request a new consultation.'
                        });
                        
                        // Notify doctor
                        io.to(`user_${check.rows[0].doctor_id}`).emit('consultation_expired', {
                            consultation_id: id,
                            message: 'Consultation expired — patient did not pay within 10 minutes. Slot is now free.',
                            patient_id: check.rows[0].patient_id
                        });
                        
                        console.log(`📨 Expiry notifications sent for consultation #${id}`);
                    }
                } else {
                    console.log(`✅ Consultation #${id} was paid before expiry (status: ${currentStatus})`);
                }
            } catch (err) {
                console.error('❌ Auto-expiry error for consultation', id, ':', err.message);
            }
        }, 10 * 60 * 1000); // ⏰ 10 minutes (10 * 60 * 1000 milliseconds)

        res.json(updatedConsultation);
    } catch (err) {
        console.error(err);
        res.status(500).json("Error accepting consultation");
    }
};

// ===========================
// PAY CONSULTATION (Patient)
// ===========================
const payConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        // Get consultation details first
        const consultation = await getConsultationById(id);
        
        if (!consultation) {
            return res.status(404).json("Consultation not found");
        }
        
        // Check if consultation is still valid (not expired)
        if (consultation.status === 'expired') {
            return res.status(400).json("Consultation has expired. Please request a new one.");
        }
        
        // Check if consultation is accepted
        if (consultation.status !== 'accepted') {
            return res.status(400).json("Consultation must be accepted before payment");
        }
        
        // simulate mpesa checkout id
        const fakeCheckoutId = "MPESA_" + Date.now();

        const updated = await payConsultation(id, fakeCheckoutId);

        if (!updated) {
            return res.status(404).json("Consultation not found");
        }

        // Notify doctor that payment is complete
        if (io) {
            io.to(`user_${consultation.doctor_id}`).emit('patient_paid', {
                consultation_id: id,
                patient_id: consultation.patient_id,
                message: 'Patient has completed payment. You can start the consultation now.'
            });
            console.log(`💰 Payment notification sent to doctor ${consultation.doctor_id}`);
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

// ===========================
// START CONSULTATION (Doctor)
// ===========================
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

        // Notify patient that session started
        if (io) {
            io.to(`user_${consultation.patient_id}`).emit('consultation_started', {
                consultation_id: id,
                message: 'Your consultation has started! Join now.',
                doctor_id: consultation.doctor_id
            });
            console.log(`🩺 Session start notification sent to patient ${consultation.patient_id}`);
        }

        res.json(updated);

    } catch (err) {
        console.error(err);
        res.status(500).json("Error starting consultation");
    }
};

// ===========================
// COMPLETE CONSULTATION (Doctor)
// ===========================
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

        // Notify patient that session ended
        if (io) {
            io.to(`user_${consultation.patient_id}`).emit('consultation_completed', {
                consultation_id: id,
                message: 'Your consultation has been completed. A prescription will be available soon.'
            });
            console.log(`✅ Session completion notification sent to patient ${consultation.patient_id}`);
        }

        res.json({
            message: "Consultation completed successfully",
            data: updated
        });

    } catch (err) {
        console.error(err);
        res.status(500).json("Error completing consultation");
    }
};

// ===========================
// VIEW PATIENT CONSULTATIONS
// ===========================
const viewPatientConsultations = async (req, res) => {
    try {
        const { patient_id } = req.params;

        // Security check — patient can only view their own consultations
        if (req.user.id !== parseInt(patient_id)) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const consultations = await getPatientConsultations(patient_id);

        res.status(200).json(consultations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching consultations" });
    }
};

// RENEW EXPIRED CONSULTATION (Patient)
// ===========================
const renewConsultationController = async (req, res) => {
    const { id } = req.params;
    const patient_id = req.user.id;

    try {
        const pool = require('../config/db');
        
        // Get the expired consultation
        const expiredConsult = await pool.query(
            `SELECT doctor_id, patient_id, status FROM consultations WHERE id = $1`,
            [id]
        );
        
        if (expiredConsult.rows.length === 0) {
            return res.status(404).json({ message: "Consultation not found" });
        }
        
        const consult = expiredConsult.rows[0];
        
        // Verify ownership
        if (consult.patient_id !== patient_id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        // Verify status is expired
        if (consult.status !== 'expired') {
            return res.status(400).json({ message: "Only expired consultations can be renewed" });
        }
        
        // Create a new consultation request with the same doctor
        const newRequest = await createConsultationRequest(patient_id, consult.doctor_id);
        
        // Notify doctor about new request
        if (io) {
            io.to(`user_${consult.doctor_id}`).emit('new_consultation_request', {
                consultation_id: newRequest.id,
                patient_id: patient_id,
                patient_name: req.user.name,
                message: 'New consultation request (renewed from expired)'
            });
            console.log(`🔄 Renewed request notification sent to doctor ${consult.doctor_id}`);
        }
        
        res.status(201).json({
            message: "Consultation renewed successfully",
            consultation: newRequest
        });
        
    } catch (error) {
        console.error('Error renewing consultation:', error);
        res.status(500).json({ message: "Error renewing consultation: " + error.message });
    }
};

// ===========================
// GET CONSULTATION BY ID
// ===========================
const getConsultationByIdController = async (req, res) => {
    const { id } = req.params;
    
    try {
        const consultation = await getConsultationById(id);
        
        if (!consultation) {
            return res.status(404).json({ message: "Consultation not found" });
        }
        
        // Security check - user can only view their own consultations
        if (req.user.id !== consultation.patient_id && req.user.id !== consultation.doctor_id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        res.json(consultation);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching consultation" });
    }
};
// ===========================
// DECLINE CONSULTATION (Doctor)
// ===========================
const declineConsultationController = async (req, res) => {
    const { id } = req.params;
    const doctor_id = req.user.id;

    try {
        const pool = require('../config/db');
        
        // Check if consultation exists and belongs to this doctor
        const check = await pool.query(
            `SELECT id, status, patient_id, doctor_id FROM consultations WHERE id = $1`,
            [id]
        );
        
        if (check.rows.length === 0) {
            return res.status(404).json({ message: "Consultation not found" });
        }
        
        const consultation = check.rows[0];
        
        // Verify doctor owns this consultation
        if (consultation.doctor_id !== doctor_id) {
            return res.status(403).json({ message: "Unauthorized" });
        }
        
        // Verify status is 'requested' (only pending requests can be declined)
        if (consultation.status !== 'requested') {
            return res.status(400).json({ 
                message: `Cannot decline consultation with status: ${consultation.status}` 
            });
        }
        
        // ✅ REMOVED updated_at - using only created_at
        const result = await pool.query(
            `UPDATE consultations 
             SET status = 'declined'
             WHERE id = $1 
             RETURNING *`,
            [id]
        );
        
        // Notify patient that their request was declined
        if (io) {
            io.to(`user_${consultation.patient_id}`).emit('consultation_declined', {
                consultation_id: id,
                message: 'Your consultation request was declined by the doctor. Please try another doctor.'
            });
            console.log(`📨 Decline notification sent to patient ${consultation.patient_id}`);
        }
        
        res.json({ 
            message: "Consultation declined successfully",
            consultation: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error declining consultation:', error);
        res.status(500).json({ message: "Error declining consultation: " + error.message });
    }
};

module.exports = { 
    requestConsultation, 
    viewDoctorConsultations, 
    acceptConsultationController, 
    payConsultationController, 
    startConsultationController, 
    completeConsultationController, 
    viewPatientConsultations,
    renewConsultationController,
    getConsultationByIdController,
    declineConsultationController,
    setIO
};
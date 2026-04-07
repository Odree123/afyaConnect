
const { createConsultationRequest, getDoctorConsultations, acceptConsultation,payConsultation ,startConsultation,completeConsultation,getConsultationById,getPatientConsultations} = require('../models/consultationModel');
let io; // will be set from server.js
const setIO = (socketIO) => { io = socketIO; };
const requestConsultation = async (req,res)=>{

     
    const patient_id=req.user.id;
    const {doctor_id}= req.body
    console.log("req.user:", req.user);

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

const acceptConsultationController = async (req, res) => {
    const { id } = req.params;

    try {
        const updatedConsultation = await acceptConsultation(id);

        if (!updatedConsultation) {
            return res.status(404).json("Consultation not found");
        }

            // ✅ Emit real-time notification to patient
        if (io) {
            io.to(`user_${updatedConsultation.patient_id}`).emit('consultation_accepted', {
                consultation_id: updatedConsultation.id,
                message: 'Your consultation request has been accepted! Please proceed to payment.',
                doctor_id: updatedConsultation.doctor_id
            });
            console.log(`✅ Notification sent to patient ${updatedConsultation.patient_id}`);
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

const viewPatientConsultations = async (req, res) => {
    try {
        const { patient_id } = req.params;

        // Security check — patient can only view their own consultations
        if (req.user.id !== parseInt(patient_id)) {
            return res.status(403).json({ message: "Unauthorized" });
        }

        const consultations = await getPatientConsultations(patient_id); // ✅ use model function

        res.status(200).json(consultations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching consultations" });
    }
};
 


module.exports = { requestConsultation, viewDoctorConsultations, acceptConsultationController, payConsultationController, startConsultationController, completeConsultationController ,viewPatientConsultations, setIO};
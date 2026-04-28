

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware'); // ✅ add verifyToken

const {
    requestConsultation,
    viewDoctorConsultations,
    acceptConsultationController,
    payConsultationController,
    startConsultationController,
    completeConsultationController,
    viewPatientConsultations,
    declineConsultationController,
    renewConsultationController,      
    getConsultationByIdController  
    
} = require('../controllers/consultationController');

router.post("/request", verifyToken, checkRole("Patient"), requestConsultation);
router.put("/pay/:id", verifyToken, checkRole("Patient"), payConsultationController);
router.put("/accept/:id", verifyToken, checkRole("Doctor"), acceptConsultationController);
router.put("/start/:id", verifyToken, checkRole("Doctor"), startConsultationController);
router.put("/complete/:id", verifyToken, checkRole("Doctor"), completeConsultationController);
router.get("/doctor/:doctor_id", verifyToken, viewDoctorConsultations);
router.get("/patient/:patient_id", verifyToken, checkRole("Patient"), viewPatientConsultations);
router.put('/decline/:id', verifyToken, checkRole("Doctor"), declineConsultationController);
router.put('/renew/:id', verifyToken, checkRole("Patient"), renewConsultationController);
router.get('/:id', verifyToken, getConsultationByIdController);
module.exports = router;
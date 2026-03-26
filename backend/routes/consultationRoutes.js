

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware'); // ✅ add verifyToken

const {
    requestConsultation,
    viewDoctorConsultations,
    acceptConsultationController,
    payConsultationController,
    startConsultationController,
    completeConsultationController
} = require('../controllers/consultationController');

router.post("/request", verifyToken, checkRole("Patient"), requestConsultation);
router.put("/pay/:id", verifyToken, checkRole("Patient"), payConsultationController);
router.put("/accept/:id", verifyToken, checkRole("Doctor"), acceptConsultationController);
router.put("/start/:id", verifyToken, checkRole("Doctor"), startConsultationController);
router.put("/complete/:id", verifyToken, checkRole("Doctor"), completeConsultationController);
router.get("/doctor/:doctor_id", verifyToken, viewDoctorConsultations);

module.exports = router;
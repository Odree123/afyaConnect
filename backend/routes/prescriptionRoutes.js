const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/authMiddleware');
const prescriptionController = require('../controllers/prescriptionController');


// 2. Changed path to "/" because the main server.js usually adds "/api/prescriptions"
router.post("/", verifyToken, checkRole("Doctor"), prescriptionController.addPrescription);

// 3. Match the function name exactly as exported in the controller
router.get("/", verifyToken, prescriptionController.getAllPrescriptions);


// ✅ Patient views prescriptions by patient_id in URL
router.get("/patient/:patient_id", verifyToken, async (req, res) => {
    try {
        const { getAllPrescriptions } = require('../models/prescriptionModel');
        const prescriptions = await getAllPrescriptions(req.params.patient_id);

        const withPatientName = prescriptions.map(p => ({
            ...p,
            patient_name: req.user.name
        }));
    
        res.json(withPatientName);
    } catch (err) {
        console.error("Error:", err.message);
        res.status(500).json("Error fetching prescriptions");
    }
});

module.exports = router;
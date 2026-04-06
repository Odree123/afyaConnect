const express = require('express');
const router = express.Router();

const { getAvailableDoctors } = require('../controllers/doctorController');

// Get available doctors
router.get('/', getAvailableDoctors);

module.exports = router;
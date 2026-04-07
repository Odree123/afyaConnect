// controllers/adminController.js
const AdminModel = require('../models/adminModel');

// Get admin statistics
const getAdminStats = async (req, res) => {
    try {
        const stats = await AdminModel.getStats();
        // Send data directly without wrapping in data property
        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ 
            message: 'Failed to fetch statistics', 
            error: error.message 
        });
    }
};

// Get all users
const getUsers = async (req, res) => {
    try {
        const { role, is_available, is_approved } = req.query;
        const filters = {};
        
        if (role) filters.role = role;
        if (is_available !== undefined) filters.is_available = is_available === 'true';
        if (is_approved !== undefined) filters.is_approved = is_approved === 'true';
        
        const users = await AdminModel.getAllUsers(filters);
        // Send the array directly
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            message: 'Failed to fetch users', 
            error: error.message 
        });
    }
};

// Get user by ID
const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await AdminModel.getUserById(id);
        
        if (!user) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            message: 'Failed to fetch user', 
            error: error.message 
        });
    }
};

// Change user role
const changeUserRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        
        const validRoles = ['Patient', 'Doctor', 'Admin'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ 
                message: 'Invalid role' 
            });
        }
        
        const updatedUser = await AdminModel.updateUserRole(id, role);
        
        if (!updatedUser) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        res.status(200).json({ 
            message: 'User role updated successfully', 
            user: updatedUser 
        });
    } catch (error) {
        console.error('Error changing user role:', error);
        res.status(500).json({ 
            message: 'Failed to change user role', 
            error: error.message 
        });
    }
};

// Toggle user active status
const toggleUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedUser = await AdminModel.toggleUserStatus(id);
        
        if (!updatedUser) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        res.status(200).json({ 
            message: `User ${updatedUser.is_available ? 'activated' : 'deactivated'} successfully`,
            user: updatedUser
        });
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ 
            message: 'Failed to toggle user status', 
            error: error.message 
        });
    }
};

// Remove user
const removeUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ 
                message: 'Cannot delete your own account' 
            });
        }
        
        const deletedUser = await AdminModel.deleteUser(id);
        
        if (!deletedUser) {
            return res.status(404).json({ 
                message: 'User not found' 
            });
        }
        
        res.status(200).json({ 
            message: 'User deleted successfully',
            user: deletedUser
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ 
            message: 'Failed to delete user', 
            error: error.message 
        });
    }
};

// Get all consultations
const getConsultations = async (req, res) => {
    try {
        const { status, patient_id, doctor_id } = req.query;
        const filters = {};
        
        if (status) filters.status = status;
        if (patient_id) filters.patient_id = parseInt(patient_id);
        if (doctor_id) filters.doctor_id = parseInt(doctor_id);
        
        const consultations = await AdminModel.getAllConsultations(filters);
        // Send the array directly
        res.status(200).json(consultations);
    } catch (error) {
        console.error('Error fetching consultations:', error);
        res.status(500).json({ 
            message: 'Failed to fetch consultations', 
            error: error.message 
        });
    }
};

// Get consultation by ID
const getConsultationById = async (req, res) => {
    try {
        const { id } = req.params;
        const consultation = await AdminModel.getConsultationById(id);
        
        if (!consultation) {
            return res.status(404).json({ 
                message: 'Consultation not found' 
            });
        }
        
        res.status(200).json(consultation);
    } catch (error) {
        console.error('Error fetching consultation:', error);
        res.status(500).json({ 
            message: 'Failed to fetch consultation', 
            error: error.message 
        });
    }
};

// Get all prescriptions
const getPrescriptions = async (req, res) => {
    try {
        const { patient_id, doctor_id } = req.query;
        const filters = {};
        
        if (patient_id) filters.patient_id = parseInt(patient_id);
        if (doctor_id) filters.doctor_id = parseInt(doctor_id);
        
        const prescriptions = await AdminModel.getAllPrescriptions(filters);
        // Send the array directly
        res.status(200).json(prescriptions);
    } catch (error) {
        console.error('Error fetching prescriptions:', error);
        res.status(500).json({ 
            message: 'Failed to fetch prescriptions', 
            error: error.message 
        });
    }
};

// Get prescription by ID
const getPrescriptionById = async (req, res) => {
    try {
        const { id } = req.params;
        const prescription = await AdminModel.getPrescriptionById(id);
        
        if (!prescription) {
            return res.status(404).json({ 
                message: 'Prescription not found' 
            });
        }
        
        res.status(200).json(prescription);
    } catch (error) {
        console.error('Error fetching prescription:', error);
        res.status(500).json({ 
            message: 'Failed to fetch prescription', 
            error: error.message 
        });
    }
};

// Get doctor details

const getDoctorDetails = async (req, res) => {
    try {
        const { id } = req.params;
        // This will now work because getDoctorById exists in the model!
        const doctor = await AdminModel.getDoctorById(id); 
        
        if (!doctor) {
            return res.status(404).json({ 
                message: 'Doctor not found' 
            });
        }
        
        res.status(200).json(doctor);
    } catch (error) {
        console.error('Error fetching doctor details:', error);
        res.status(500).json({ 
            message: 'Failed to fetch doctor details', 
            error: error.message 
        });
    }
};
// Approve doctor
const approveDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const approvedDoctor = await AdminModel.approveDoctor(id);
        
        res.status(200).json({ 
            message: 'Doctor approved successfully',
            doctor: approvedDoctor
        });
    } catch (error) {
        console.error('Error approving doctor:', error);
        
        if (error.message === 'Doctor not found') {
            return res.status(404).json({ 
                message: 'Doctor not found' 
            });
        }
        
        if (error.message === 'Cannot approve doctor: License number is required') {
            return res.status(400).json({ 
                message: 'Cannot approve doctor: License number is required. Please ask the doctor to provide their license number first.' 
            });
        }
        
        if (error.message === 'Doctor is already approved') {
            return res.status(400).json({ 
                message: 'Doctor is already approved' 
            });
        }
        
        res.status(500).json({ 
            message: 'Failed to approve doctor', 
            error: error.message 
        });
    }
};

// Reject doctor
const rejectDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const rejectedDoctor = await AdminModel.rejectDoctor(id);
        
        if (!rejectedDoctor) {
            return res.status(404).json({ 
                message: 'Doctor not found' 
            });
        }
        
        res.status(200).json({ 
            message: 'Doctor rejected successfully',
            doctor: rejectedDoctor
        });
    } catch (error) {
        console.error('Error rejecting doctor:', error);
        res.status(500).json({ 
            message: 'Failed to reject doctor', 
            error: error.message 
        });
    }
};

// Get all doctors
const getAllDoctors = async (req, res) => {
    try {
        const doctors = await AdminModel.getAllDoctors();
        // Send the array directly
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching doctors:', error);
        res.status(500).json({ 
            message: 'Failed to fetch doctors', 
            error: error.message 
        });
    }
};

// Get pending doctors
const getPendingDoctors = async (req, res) => {
    try {
        const doctors = await AdminModel.getPendingDoctors();
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching pending doctors:', error);
        res.status(500).json({ 
            message: 'Failed to fetch pending doctors', 
            error: error.message 
        });
    }
};

// Get doctors missing license
const getDoctorsMissingLicense = async (req, res) => {
    try {
        const doctors = await AdminModel.getDoctorsMissingLicense();
        res.status(200).json(doctors);
    } catch (error) {
        console.error('Error fetching doctors missing license:', error);
        res.status(500).json({ 
            message: 'Failed to fetch doctors', 
            error: error.message 
        });
    }
};

// Update doctor license
const updateDoctorLicense = async (req, res) => {
    try {
        const { id } = req.params;
        const { license_number } = req.body;
        
        if (!license_number || license_number.trim() === '') {
            return res.status(400).json({ 
                message: 'License number is required' 
            });
        }
        
        const updatedDoctor = await AdminModel.updateDoctorLicense(id, license_number);
        
        if (!updatedDoctor) {
            return res.status(404).json({ 
                message: 'Doctor not found' 
            });
        }
        
        res.status(200).json({ 
            message: 'License number updated successfully. Doctor needs to be re-approved.',
            doctor: updatedDoctor
        });
    } catch (error) {
        console.error('Error updating license:', error);
        res.status(500).json({ 
            message: 'Failed to update license number', 
            error: error.message 
        });
    }
};

module.exports = {
    getAdminStats,
    getUsers,
    getUserById,
    changeUserRole,
    toggleUser,
    removeUser,
    getConsultations,
    getConsultationById,
    getPrescriptions,
    getPrescriptionById,
    getDoctorDetails,
    approveDoctor,
    rejectDoctor,
    getAllDoctors,
    getPendingDoctors,
    getDoctorsMissingLicense,
    updateDoctorLicense
};
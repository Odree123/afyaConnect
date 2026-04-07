
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail } = require('../models/userModel');

// Register a new user
const registerUser = async (req, res) => {
    const { 
        name, 
        email, 
        password, 
        phone, 
        role, 
        specialization, 
        license_number 
    } = req.body;

    console.log("Registration request:", { name, email, role });

    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
    }

    // Validate password strength
    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    try {
        const allowedRoles = ['Patient', 'Doctor'];
        const userRole = allowedRoles.includes(role) ? role : 'Patient';

        // Additional validation for doctors
        if (userRole === 'Doctor') {
            if (!specialization) {
                return res.status(400).json({ error: "Specialization is required for doctors" });
            }
            if (!license_number || license_number.trim() === '') {
                return res.status(400).json({ error: "Medical license number is required for doctors" });
            }
        }

        // Format phone number if provided
        let formattedPhone = phone || null;
        if (formattedPhone) {
            let cleaned = formattedPhone.replace(/\D/g, '');
            if (cleaned.startsWith('0')) {
                formattedPhone = '254' + cleaned.substring(1);
            } else if (cleaned.startsWith('254')) {
                formattedPhone = cleaned;
            }
        }

        // Create user
        const user = await createUser(
            name, 
            email, 
            password, 
            formattedPhone, 
            userRole, 
            specialization || null, 
            license_number || null
        );

        // Generate token
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'afyaconnect_super_secret_key_2024',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: userRole === 'Doctor' 
                ? "Doctor account created! Pending admin approval." 
                : "Registration successful!",
            token,
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                phone: user.phone,
                role: user.role,
                is_approved: user.is_approved,
                is_available: user.is_available
            }
        });

    } catch (err) {
        console.error("Registration Error:", err);
        
        // Handle duplicate key errors
        if (err.code === '23505') {
            if (err.constraint === 'users_email_key') {
                return res.status(400).json({ error: "Email already registered" });
            }
            if (err.constraint === 'users_phone_key') {
                return res.status(400).json({ error: "Phone number already registered" });
            }
        }
        
        res.status(500).json({ error: "Registration failed. Please try again." });
    }
};

// Login a user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        if (!user.is_available) {
            return res.status(403).json({ error: "Account is deactivated. Contact support." });
        }

        if (user.role === 'Doctor' && !user.is_approved) {
            return res.status(403).json({ error: "Account pending admin approval." });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'afyaconnect_super_secret_key_2024',
            { expiresIn: '7d' }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                role: user.role,
                is_approved: user.is_approved,
                is_available: user.is_available
            }
        });

    } catch (err) {
        console.error("Login Error:", err);
        res.status(500).json({ error: "Login failed. Please try again." });
    }
};

module.exports = { registerUser, loginUser };
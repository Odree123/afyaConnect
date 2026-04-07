const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail } = require('../models/userModel');

// Login a user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        // 1. Find user by email
        const user = await findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 2. Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 3. Check if account is active (is_available)
        if (!user.is_available) {
            return res.status(403).json({ 
                error: "Your account is not active. Please contact support." 
            });
        }

        // 4. Role-based Access Control (RBAC)
        // Check if the doctor is approved before allowing login
        if (user.role === 'Doctor' && !user.is_approved) {
            return res.status(403).json({ 
                error: "Your account is pending admin approval. You will be notified once activated." 
            });
        }

        // 5. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'afyaconnect_super_secret_key_2024',
            { expiresIn: '7d' }
        );

        // 6. Success Response
        res.status(200).json({
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
        console.error("Login Error:", err.message);
        res.status(500).json({ error: "Server error during login" });
    }
};

// Register a new user
const registerUser = async (req, res) => {
    const { name, email, password, phone, role, specialization, license_number } = req.body;

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
            if (!license_number) {
                return res.status(400).json({ error: "License number is required for doctors" });
            }
        }

        // Create user
        const user = await createUser(name, email, password, phone, userRole, specialization, license_number);

        // Generate token (but doctor can't login until approved)
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email, name: user.name },
            process.env.JWT_SECRET || 'afyaconnect_super_secret_key_2024',
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: userRole === 'Doctor' 
                ? "Doctor account created! Pending admin approval." 
                : "Registration successful! You can now login.",
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
        console.error("Registration Error Details:", err);
        
        // Handle PostgreSQL unique constraint violations
        if (err.code === '23505') {
            if (err.constraint === 'users_phone_key') {
                return res.status(400).json({ error: "Phone number already registered" });
            }
            if (err.constraint === 'users_email_key') {
                return res.status(400).json({ error: "Email already registered" });
            }
            if (err.constraint === 'users_license_number_key') {
                return res.status(400).json({ error: "License number already registered" });
            }
        }
        
        res.status(500).json({ error: "Error registering user" });
    }
};

module.exports = { registerUser, loginUser };
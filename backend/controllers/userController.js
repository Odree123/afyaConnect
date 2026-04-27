const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto'); // ADD THIS for generating reset tokens
const { createUser, findUserByEmail, updateUserPassword, saveResetToken, findUserByResetToken } = require('../models/userModel');

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

    // Validate password strength (updated to match frontend requirements)
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
    }
    
    // Check for uppercase, lowercase, number, special character
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);
    
    if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        return res.status(400).json({ 
            error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
        });
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

// ===========================
// FORGOT PASSWORD - Send reset email
// ===========================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        // Find user by email
        const user = await findUserByEmail(email);
        
        if (!user) {
            // For security, don't reveal if email exists or not
            return res.status(200).json({ 
                message: 'If an account exists with that email, a reset link has been sent.' 
            });
        }
        
        // Generate a secure reset token (expires in 15 minutes)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        // Save token to database
        await saveResetToken(user.id, resetToken, resetTokenExpiry);
        
        // Create reset URL (for frontend)
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password.html?token=${resetToken}`;
        
        // Send email (you need to set up nodemailer)
        const emailSent = await sendResetEmail(email, resetUrl, user.name);
        
        if (emailSent) {
            res.status(200).json({ 
                message: 'Password reset link sent to your email address.' 
            });
        } else {
            // Still return success to avoid email enumeration
            res.status(200).json({ 
                message: 'If an account exists with that email, a reset link has been sent.' 
            });
        }
        
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// ===========================
// RESET PASSWORD - Actually reset the password
// ===========================
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and new password are required.' });
        }
        
        // Validate password strength
        const hasLength = newPassword.length >= 8;
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasLower = /[a-z]/.test(newPassword);
        const hasNumber = /[0-9]/.test(newPassword);
        const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword);
        
        if (!hasLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.' 
            });
        }
        
        // Find user by valid token (not expired)
        const user = await findUserByResetToken(token);
        
        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired reset token.' });
        }
        
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update user password and clear reset token fields
        await updateUserPassword(user.id, hashedPassword);
        
        res.status(200).json({ message: 'Password has been reset successfully. You can now login.' });
        
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error. Please try again later.' });
    }
};

// ===========================
// Helper function to send email (Nodemailer setup)
// ===========================
const sendResetEmail = async (email, resetUrl, userName) => {
    try {
        // Check if nodemailer is installed
        let nodemailer;
        try {
            nodemailer = require('nodemailer');
        } catch (err) {
            console.log('Nodemailer not installed. Email not sent.');
            console.log(`Reset URL for ${email}: ${resetUrl}`);
            return true; // Return true to simulate success in development
        }
        
        // Configure your email transporter (using Gmail as example)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER, // Your email
                pass: process.env.EMAIL_PASS  // Your app password
            }
        });
        
        const mailOptions = {
            from: `"AfyaConnect" <${process.env.EMAIL_USER || 'noreply@afyaconnect.com'}>`,
            to: email,
            subject: 'AfyaConnect - Password Reset Request',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #ecfdf5; border-radius: 16px;">
                    <h2 style="color: #059669;">AfyaConnect</h2>
                    <h3>Password Reset Request</h3>
                    <p>Hello ${userName || 'User'},</p>
                    <p>We received a request to reset your password. Click the button below to create a new password:</p>
                    <a href="${resetUrl}" style="display: inline-block; background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Reset Password</a>
                    <p>This link will expire in <strong>15 minutes</strong>.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr style="margin: 20px 0; border-color: #d1fae5;">
                    <p style="font-size: 12px; color: #6b7280;">AfyaConnect - Secure Healthcare Platform</p>
                </div>
            `
        };
        
        await transporter.sendMail(mailOptions);
        return true;
        
    } catch (error) {
        console.error('Email sending error:', error);
        console.log(`Reset URL for ${email}: ${resetUrl}`); // Log URL for development
        return false;
    }
};

module.exports = { registerUser, loginUser, forgotPassword, resetPassword };
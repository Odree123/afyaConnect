const jwt = require('jsonwebtoken');
const { createUser, findUser } = require('../models/userModel');

// Register a new user
const registerUser = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        const user = await createUser(name, email, password, phone, "Patient");

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        // ✅ Handle duplicate email or phone
        if (err.code === '23505') {
            if (err.constraint === 'users_phone_key') {
                return res.status(400).json("Phone number already registered");
            }
            if (err.constraint === 'users_email_key') {
                return res.status(400).json("Email already registered");
            }
            return res.status(400).json("Account already exists");
        }

        console.error(err.message);
        res.status(500).json("Error registering user");
    }
};

// Login a user
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await findUser(email, password);

        if (!user) {
            return res.status(401).json("Invalid email or password");
        }

        // Generate token on login
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Error logging in");
    }
};

module.exports = { registerUser, loginUser };
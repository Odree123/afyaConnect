

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

// Insert user into the database
const createUser = async (name, email, password, phone, role) => {
    try {
        // Hash password before storing
        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, hashedPassword, phone, role]
        );
        return result.rows[0];
    } catch (err) {
        console.error('Error creating user:', err);
        throw err;
    }
};

// Find user by email, then verify password
const findUser = async (email, password) => {
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        const user = result.rows[0];

        if (!user) return null;

        // Compare submitted password with hashed password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) return null;

        return user;
    } catch (err) {
        console.error('Error finding user:', err);
        throw err;
    }
};

module.exports = { createUser, findUser };
const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Insert user into the database
 * Matches exact column order from your PostgreSQL table:
 * name, email, password, phone, role, specialization, is_available, license_number, is_approved
 */
const createUser = async (name, email, password, phone, role, specialization = null, license_number = null) => {
    // Hash password with a salt round of 10
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Logic: 
    // 1. Patients are approved by default (is_approved = true)
    // 2. Doctors are NOT approved until Admin reviews license (is_approved = false)
    const isApproved = (role === 'Patient'); 
    
    // Set is_available to true by default for new accounts
    const isAvailable = true; 

    const query = `
        INSERT INTO users (
            name, 
            email, 
            password, 
            phone, 
            role, 
            specialization, 
            is_available, 
            license_number, 
            is_approved
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING *`;

    const values = [
        name,           // $1
        email,          // $2
        hashedPassword, // $3
        phone,          // $4
        role,           // $5
        specialization, // $6
        isAvailable,    // $7
        license_number, // $8
        isApproved      // $9
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

// Find user by email (Used during Login)
const findUserByEmail = async (email) => {
    const result = await pool.query(
        `SELECT id, name, email, password, phone, role, specialization, 
                license_number, is_approved, is_available, created_at 
         FROM users 
         WHERE email = $1`,
        [email]
    );
    return result.rows[0];
};

// Find user by ID (Used for profile fetching)
const findUserById = async (id) => {
    const result = await pool.query(
        `SELECT id, name, email, phone, role, specialization, 
                license_number, is_approved, is_available, created_at 
         FROM users 
         WHERE id = $1`,
        [id]
    );
    return result.rows[0];
};

// Update user (Used by Admin to approve or Doctor to toggle availability)
const updateUser = async (id, updates) => {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined) {
            fields.push(`${key} = $${paramCount}`);
            values.push(value);
            paramCount++;
        }
    }
    
    if (fields.length === 0) return null;
    
    values.push(id);
    const query = `
        UPDATE users 
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${paramCount}
        RETURNING id, name, email, phone, role, is_approved, is_available
    `;
    
    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (error) {
        console.error('Database error in updateUser:', error);
        throw error;
    }
};

module.exports = { createUser, findUserByEmail, findUserById, updateUser };
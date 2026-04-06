

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// Get all messages for a consultation
router.get('/:consultation_id', verifyToken, async (req, res) => {
    const { consultation_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT messages.*, users.name AS sender_name
             FROM messages
             LEFT JOIN users ON messages.sender_id = users.id
             WHERE messages.consultation_id = $1
             ORDER BY messages.created_at ASC`,
            [consultation_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json('Error fetching messages');
    }
});

module.exports = router;
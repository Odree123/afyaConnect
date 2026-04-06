const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    console.log("Auth header received:", authHeader); // ✅ debug
    console.log("JWT_SECRET:", process.env.JWT_SECRET); // ✅ debug

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json("Access token required");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded); // ✅ debug
        req.user = decoded;
        next();
    } catch (err) {
        console.log("Token error:", err.message); // ✅ debug
        return res.status(403).json("Invalid or expired token");
    }
};

const checkRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json("Not authenticated");
        }
        if (req.user.role !== role) {
            return res.status(403).json("Access denied");
        }
        next();
    };
};

module.exports = { verifyToken, checkRole };
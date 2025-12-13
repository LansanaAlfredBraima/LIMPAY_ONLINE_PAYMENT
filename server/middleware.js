const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// Role-based Authorization Middleware
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user || req.user.role !== role) {
            return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
        }
        next();
    };
};

// Validation Middleware
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// Error Handling Middleware
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
};

module.exports = {
    authenticateToken,
    requireRole,
    validateRequest,
    errorHandler
};

const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const db = require('../database');
const { validateRequest, authenticateToken } = require('../middleware');

// Register User
router.post('/register', [
    body('id').notEmpty().withMessage('Student ID is required')
        .matches(/^[0-9]{7}$/).withMessage('Student ID must be exactly 7 digits'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
], (req, res) => {
    const { id, name, email, password, faculty } = req.body;
    const saltRounds = 10;

    // Explicit uniqueness check to provide clearer feedback and proper status code
    db.get('SELECT id, email FROM users WHERE id = ? OR email = ?', [id, email], (err, existing) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (existing) {
            const conflictFields = [];
            if (existing.id === id) conflictFields.push('Student ID');
            if (existing.email === email) conflictFields.push('Email');
            return res.status(409).json({ success: false, message: `${conflictFields.join(' and ')} already exists` });
        }

        bcrypt.hash(password, saltRounds, (err, hash) => {
            if (err) return res.status(500).json({ success: false, message: 'Error hashing password' });

            const sql = `INSERT INTO users (id, name, email, password_hash, faculty) VALUES (?, ?, ?, ?, ?)`;
            db.run(sql, [id, name, email, hash, faculty || 'N/A'], function (err) {
                if (err) {
                    // Fallback for race condition or unexpected UNIQUE constraint failure
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(409).json({ success: false, message: 'User ID or Email already exists' });
                    }
                    return res.status(500).json({ success: false, message: 'Database error' });
                }

                // Assign default fees to new student
                const defaultFees = ['fee_tuition_24', 'fee_dept_24', 'fee_accom_24'];
                const feeStmt = db.prepare(`INSERT INTO user_fees (user_id, fee_id, total_amount, balance) 
                                          SELECT ?, id, amount, amount FROM fees WHERE id = ?`);

                defaultFees.forEach(feeId => {
                    feeStmt.run(id, feeId);
                });
                feeStmt.finalize();

                res.status(201).json({ success: true, message: 'User registered successfully' });
            });
        });
    });
});

// Login User
router.post('/login', [
    body('id').notEmpty().withMessage('ID or Email is required'),
    body('password').notEmpty().withMessage('Password is required'),
    validateRequest
], (req, res) => {
    const { id, password } = req.body;

    const sql = `SELECT * FROM users WHERE id = ? OR email = ?`;
    db.get(sql, [id, id], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

        bcrypt.compare(password, user.password_hash, (err, result) => {
            if (result) {
                const token = jwt.sign(
                    { id: user.id, role: user.role, name: user.name },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );
                // Include faculty in response
                res.json({ success: true, token, user: { id: user.id, name: user.name, role: user.role, email: user.email, faculty: user.faculty } });
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        });
    });
});

// Get Current User
router.get('/me', authenticateToken, (req, res) => {
    const sql = `SELECT id, name, email, role, faculty, created_at FROM users WHERE id = ?`;
    db.get(sql, [req.user.id], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        res.json({ success: true, user });
    });
});

// Update Current User Profile
router.put('/me', [
    authenticateToken,
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest
], (req, res) => {
    const { name, email, password, faculty } = req.body;
    const userId = req.user.id;

    // First check if user exists
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const updates = [];
        const params = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (faculty) {
            updates.push('faculty = ?');
            params.push(faculty);
        }

        const finalizeUpdate = () => {
            if (updates.length === 0) {
                return res.json({ success: true, message: 'No changes made' });
            }

            params.push(userId);
            const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;

            db.run(sql, params, function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ success: false, message: 'Email already in use' });
                    }
                    return res.status(500).json({ success: false, message: 'Database error' });
                }
                res.json({ success: true, message: 'Profile updated successfully' });
            });
        };

        if (password) {
            bcrypt.hash(password, 10, (err, hash) => {
                if (err) return res.status(500).json({ success: false, message: 'Error hashing password' });
                updates.push('password_hash = ?');
                params.push(hash);
                finalizeUpdate();
            });
        } else {
            finalizeUpdate();
        }
    });
});

module.exports = router;

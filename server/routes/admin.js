const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken, requireRole } = require('../middleware');
const bcrypt = require('bcrypt');

// Middleware to ensure user is admin
const isAdmin = [authenticateToken, requireRole('admin')];

// Get all students
router.get('/students', isAdmin, (req, res, next) => {
    const sql = `SELECT id, name, email, role, faculty, created_at FROM users WHERE role = 'student'`;
    db.all(sql, [], (err, rows) => {
        if (err) return next(err);

        // Fetch faculty for each student (assuming it's stored in user_fees or similar, 
        // but for now let's just return the user data. 
        // If faculty is needed, we might need to join or store it in users table.
        // Looking at register.html, faculty is sent but not explicitly stored in users table in init-db.js?
        // Let's check init-db.js later. For now, return what we have.
        res.json({ success: true, students: rows });
    });
});

// Get all transactions
router.get('/transactions', isAdmin, (req, res, next) => {
    const sql = `
        SELECT t.*, u.name as studentName, t.user_id as student_id
        FROM transactions t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return next(err);
        res.json({ success: true, transactions: rows });
    });
});

// Add a student (Admin)
router.post('/students', isAdmin, async (req, res, next) => {
    const { id, name, email, password, faculty } = req.body;

    if (!id || !name || !email || !password) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        // Start transaction
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            const insertUser = `INSERT INTO users (id, name, email, password_hash, role, faculty) VALUES (?, ?, ?, ?, 'student', ?)`;
            db.run(insertUser, [id, name, email, hashedPassword, faculty || 'N/A'], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return next(err);
                }

                // Assign default fees
                // First get all fees
                db.all('SELECT id FROM fees', [], (err, fees) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return next(err);
                    }

                    const stmt = db.prepare('INSERT INTO user_fees (user_id, fee_id, total_amount, balance) VALUES (?, ?, (SELECT amount FROM fees WHERE id = ?), (SELECT amount FROM fees WHERE id = ?))');
                    fees.forEach(fee => {
                        stmt.run(id, fee.id, fee.id, fee.id);
                    });
                    stmt.finalize();

                    db.run('COMMIT');
                    res.status(201).json({ success: true, message: 'Student created successfully' });
                });
            });
        });
    } catch (err) {
        next(err);
    }
});

// Update student
router.put('/students/:id', isAdmin, async (req, res, next) => {
    const { id } = req.params;
    const { name, email, faculty, password } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and Email are required' });
    }

    try {
        let sql, params;
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            sql = `UPDATE users SET name = ?, email = ?, faculty = ?, password_hash = ? WHERE id = ? AND role = 'student'`;
            params = [name, email, faculty || 'N/A', hashedPassword, id];
        } else {
            sql = `UPDATE users SET name = ?, email = ?, faculty = ? WHERE id = ? AND role = 'student'`;
            params = [name, email, faculty || 'N/A', id];
        }

        db.run(sql, params, function (err) {
            if (err) return next(err);
            if (this.changes === 0) {
                return res.status(404).json({ success: false, message: 'Student not found' });
            }
            res.json({ success: true, message: 'Student updated successfully' });
        });
    } catch (err) {
        next(err);
    }
});

// Delete student
router.delete('/students/:id', isAdmin, (req, res, next) => {
    const { id } = req.params;

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        // Delete related records first since foreign keys might not have CASCADE
        db.run('DELETE FROM user_fees WHERE user_id = ?', [id], (err) => {
            if (err) {
                db.run('ROLLBACK');
                return next(err);
            }

            db.run('DELETE FROM transactions WHERE user_id = ?', [id], (err) => {
                if (err) {
                    db.run('ROLLBACK');
                    return next(err);
                }

                db.run('DELETE FROM users WHERE id = ? AND role = "student"', [id], function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return next(err);
                    }
                    if (this.changes === 0) {
                        db.run('ROLLBACK');
                        return res.status(404).json({ success: false, message: 'Student not found' });
                    }

                    db.run('COMMIT');
                    res.json({ success: true, message: 'Student deleted successfully' });
                });
            });
        });
    });
});

module.exports = router;

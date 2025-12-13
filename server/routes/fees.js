const express = require('express');
const router = express.Router();
const db = require('../database');
const { authenticateToken } = require('../middleware');

// Get Outstanding Fees for Current User
router.get('/outstanding', authenticateToken, (req, res) => {
    const sql = `
        SELECT f.id, f.type, f.description, f.session, uf.total_amount, uf.paid_amount, uf.balance
        FROM user_fees uf
        JOIN fees f ON uf.fee_id = f.id
        WHERE uf.user_id = ? AND uf.balance > 0
    `;

    db.all(sql, [req.user.id], (err, fees) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, fees });
    });
});

module.exports = router;

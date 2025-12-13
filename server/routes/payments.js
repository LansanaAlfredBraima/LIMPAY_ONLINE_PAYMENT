const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const db = require('../database');
const { authenticateToken, validateRequest } = require('../middleware');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Create Payment Intent
router.post('/create-payment-intent', [
    authenticateToken,
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('currency').optional().isString(),
    validateRequest
], async (req, res) => {
    const { amount, currency = 'usd' } = req.body; // Default to USD for Stripe compatibility

    try {
        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe expects amounts in smallest currency unit (e.g., cents)
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                userId: req.user.id
            }
        });

        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });
    } catch (error) {
        console.error('Stripe Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Record Payment (After successful Stripe confirmation)
router.post('/record', [
    authenticateToken,
    body('amount').isFloat({ min: 0.01 }).withMessage('Valid amount is required'),
    body('feeId').notEmpty().withMessage('Fee ID is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('paymentIntentId').notEmpty().withMessage('Payment Intent ID is required'),
    validateRequest
], async (req, res) => {
    const { amount, feeId, description, paymentIntentId } = req.body;
    const userId = req.user.id;

    try {
        // Verify payment status with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ success: false, message: 'Payment not successful' });
        }

        const txnId = paymentIntent.id;
        const cardLast4 = paymentIntent.payment_method_details?.card?.last4 || 'xxxx';

        db.serialize(() => {
            db.run('BEGIN TRANSACTION');

            // 1. Record Transaction
            const txnSql = `INSERT INTO transactions (id, user_id, fee_id, amount, status, description, card_last4) 
                           VALUES (?, ?, ?, ?, ?, ?, ?)`;

            db.run(txnSql, [txnId, userId, feeId, amount, 'Success', description, cardLast4], function (err) {
                if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({ success: false, message: 'Error recording transaction' });
                }

                // 2. Update User Fee Balance
                const updateFeeSql = `UPDATE user_fees 
                                    SET paid_amount = paid_amount + ?, 
                                        balance = balance - ?, 
                                        updated_at = CURRENT_TIMESTAMP 
                                    WHERE user_id = ? AND fee_id = ?`;

                db.run(updateFeeSql, [amount, amount, userId, feeId], function (err) {
                    if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({ success: false, message: 'Error updating fee balance' });
                    }

                    db.run('COMMIT');
                    res.json({
                        success: true,
                        message: 'Payment recorded successfully',
                        transaction: { id: txnId, amount, status: 'Success', date: new Date() }
                    });
                });
            });
        });
    } catch (error) {
        console.error('Payment Verification Error:', error);
        res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
});

// Get User Transactions
router.get('/transactions', authenticateToken, (req, res) => {
    const sql = `SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC`;
    db.all(sql, [req.user.id], (err, transactions) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error' });
        res.json({ success: true, transactions });
    });
});

module.exports = router;

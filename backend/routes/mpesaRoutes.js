const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const pool    = require('../config/db');
const { verifyToken } = require('../middleware/authMiddleware');

// ===========================
// GET ACCESS TOKEN
// ===========================
async function getAccessToken() {
    const consumer_key    = process.env.MPESA_CONSUMER_KEY;
    const consumer_secret = process.env.MPESA_CONSUMER_SECRET;
    const auth = Buffer.from(`${consumer_key}:${consumer_secret}`).toString('base64');

    const res = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${auth}` } }
    );

    return res.data.access_token;
}

// ===========================
// HELPER: Confirm payment in DB and notify doctor
// ===========================
async function confirmPayment(checkoutRequestId) {
    // Update status to paid
    await pool.query(
        `UPDATE consultations SET status='paid' WHERE mpesa_checkout_id=$1`,
        [checkoutRequestId]
    );
    console.log(`✅ Payment confirmed for: ${checkoutRequestId}`);

    // Get consultation and notify doctor
    const result = await pool.query(
        `SELECT * FROM consultations WHERE mpesa_checkout_id=$1`,
        [checkoutRequestId]
    );

    const consultation = result.rows[0];
    if (consultation && global.io) {
        global.io.to(`user_${consultation.doctor_id}`).emit('patient_paid', {
            consultation_id: consultation.id,
            patient_id:      consultation.patient_id,
            message:         'Patient has paid! You can now start the session.'
        });
        console.log(`🔔 Doctor ${consultation.doctor_id} notified of payment`);
    }

    return consultation;
}

// ===========================
// INITIATE STK PUSH
// ===========================
router.post('/initiate', verifyToken, async (req, res) => {
    const { phone, consultation_id, amount } = req.body;

    if (!phone || !consultation_id || !amount) {
        return res.status(400).json({ message: 'Phone, consultation_id and amount are required' });
    }

    // Format phone: 0712345678 → 254712345678
    const formattedPhone = phone.startsWith('0')
        ? '254' + phone.slice(1)
        : phone;

    const shortcode   = process.env.MPESA_SHORTCODE;
    const passkey     = process.env.MPESA_PASSKEY;
    const timestamp   = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
    const password    = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
    const callbackURL = process.env.MPESA_CALLBACK_URL;

    try {
        const token = await getAccessToken();

        const stkRes = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                BusinessShortCode: shortcode,
                Password:          password,
                Timestamp:         timestamp,
                TransactionType:   'CustomerPayBillOnline',
                Amount:            amount,
                PartyA:            formattedPhone,
                PartyB:            shortcode,
                PhoneNumber:       formattedPhone,
                CallBackURL:       callbackURL,
                AccountReference:  `afyaConnect#${consultation_id}`,
                TransactionDesc:   `AfyaConnect Payment`
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const checkoutRequestId = stkRes.data.CheckoutRequestID;

        // Save checkout ID to DB
        await pool.query(
            `UPDATE consultations SET mpesa_checkout_id=$1 WHERE id=$2`,
            [checkoutRequestId, consultation_id]
        );

        // ✅ AUTO-CHECK: Query M-PESA after 30 seconds to confirm payment
        // This fixes the issue when callback URL is unavailable
        setTimeout(async () => {
            try {
                console.log(`🔍 Auto-checking payment for: ${checkoutRequestId}`);

                const queryToken    = await getAccessToken();
                const queryTimestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
                const queryPassword  = Buffer.from(`${shortcode}${passkey}${queryTimestamp}`).toString('base64');

                const queryRes = await axios.post(
                    'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
                    {
                        BusinessShortCode: shortcode,
                        Password:          queryPassword,
                        Timestamp:         queryTimestamp,
                        CheckoutRequestID: checkoutRequestId
                    },
                    { headers: { Authorization: `Bearer ${queryToken}` } }
                );

                console.log('STK Query result:', queryRes.data.ResultCode, queryRes.data.ResultDesc);

                // ResultCode 0 means payment was successful
                if (queryRes.data.ResultCode === '0' || queryRes.data.ResultCode === 0) {
                    await confirmPayment(checkoutRequestId);
                } else {
                    console.log(`❌ Payment not confirmed: ${queryRes.data.ResultDesc}`);
                }

            } catch (err) {
                console.error('Auto-check error:', err.response?.data || err.message);
            }
        }, 30000); // ✅ Check after 30 seconds

        res.json({
            message:           'STK Push sent successfully',
            checkoutRequestId,
            responseCode:      stkRes.data.ResponseCode
        });

    } catch (err) {
        console.error('STK Push error:', err.response?.data || err.message);
        res.status(500).json({ message: 'Failed to initiate payment' });
    }
});

// ===========================
// MPESA CALLBACK
// (Used when ngrok/public URL is available)
// ===========================
router.post('/callback', async (req, res) => {
    const callbackData = req.body?.Body?.stkCallback;

    if (!callbackData) {
        return res.status(400).json({ message: 'Invalid callback data' });
    }

    const { ResultCode, ResultDesc, CheckoutRequestID } = callbackData;
    console.log('M-PESA Callback received:', ResultCode, ResultDesc);

    try {
        if (ResultCode === 0) {
            await confirmPayment(CheckoutRequestID);
        } else {
            console.log(`❌ Payment failed: ${ResultDesc}`);
        }
    } catch (err) {
        console.error('Callback DB error:', err.message);
    }

    // Always respond 200 to Safaricom
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
});

// ===========================
// CHECK PAYMENT STATUS
// ===========================
router.get('/status/:consultation_id', verifyToken, async (req, res) => {
    const { consultation_id } = req.params;

    if (!consultation_id || consultation_id === 'null') {
        return res.status(400).json({ message: 'Valid consultation_id is required' });
    }

    try {
        const result = await pool.query(
            `SELECT status, mpesa_checkout_id FROM consultations WHERE id=$1`,
            [consultation_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error checking payment status' });
    }
});

// ===========================
// ✅ MANUAL PAYMENT CONFIRM
// Use this for testing when ngrok is unavailable
// POST /api/mpesa/manual-confirm/:consultation_id
// ===========================
router.put('/manual-confirm/:consultation_id', verifyToken, async (req, res) => {
    const { consultation_id } = req.params;

    try {
        const result = await pool.query(
            `UPDATE consultations SET status='paid' WHERE id=$1 RETURNING *`,
            [consultation_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Consultation not found' });
        }

        const consultation = result.rows[0];

        // Notify doctor
        if (global.io) {
            global.io.to(`user_${consultation.doctor_id}`).emit('patient_paid', {
                consultation_id: consultation.id,
                patient_id:      consultation.patient_id,
                message:         'Patient has paid! You can now start the session.'
            });
            console.log(`🔔 Doctor ${consultation.doctor_id} notified (manual confirm)`);
        }

        console.log(`✅ Manual payment confirmed for consultation #${consultation_id}`);
        res.json({
            message: 'Payment manually confirmed',
            data:    consultation
        });

    } catch (err) {
        console.error('Manual confirm error:', err.message);
        res.status(500).json({ message: 'Error confirming payment' });
    }
});

module.exports = router;
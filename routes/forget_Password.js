const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const db = require('../connection');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const user = 


router.post('/forget-password', async (req, res) => {
    const { email } = req.body;
    let connection;

    try {
        connection = await db.getConnection();
        const [user] = await connection.execute('SELECT * FROM users WHERE email = ?', [email]);

        if (user.length === 0) {
            return res.status(404).json({ message: "User nahi mila!" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60000); // 15 mins expiry

        await connection.execute(
            'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?',
            [otp, expiry, email]
        );

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset OTP - Football Management System',
            text: `Your Password Reset Code is ${otp}. This code is valid for 15 minutes.`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: "OTP sent to your registered email" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});


router.post('/reset-password', async (req, res) => {
    const { email, otp, newPassword } = req.body;
    let connection;

    try {
        connection = await db.getConnection();


        const [user] = await connection.execute(
            'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expiry > NOW()',
            [email, otp]
        );

        if (user.length === 0) {
            return res.status(400).json({ message: "Invalid OTP or its expired!" });
        }


        const hashedPassword = await bcrypt.hash(newPassword, 10);


        await connection.execute(
            'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?',
            [hashedPassword, email]
        );

        res.status(200).json({ message: "Your passoword is successfully reset" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;
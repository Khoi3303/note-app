const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { poolPromise, sql } = require('../config/db');

const sendVerificationEmail = async (email, token) => {
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:8080';
    const verificationUrl = `${appUrl}/api/auth/verify-email/${token}`;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP chưa cấu hình. Link kích hoạt:', verificationUrl);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Kích hoạt tài khoản',
        html: `
            <p>Chào bạn,</p>
            <p>Vui lòng nhấp vào link dưới đây để kích hoạt tài khoản:</p>
            <a href="${verificationUrl}">Kích hoạt tài khoản</a>
            <p>Nếu bạn không yêu cầu kích hoạt này, hãy bỏ qua email.</p>
        `,
    };

    await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, token, otp) => {
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:8080';
    const resetUrl = `${appUrl}/reset_password.html?token=${encodeURIComponent(token)}`;

    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP chưa cấu hình. Link reset:', resetUrl);
        console.warn('OTP reset:', otp);
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Yêu cầu đặt lại mật khẩu',
        html: `
            <p>Chào bạn,</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Bạn có thể sử dụng một trong hai cách dưới đây:</p>
            <ul>
                <li>Nhấn vào link sau để mở trang đổi mật khẩu: <a href="${resetUrl}">Đổi mật khẩu</a></li>
                <li>Hoặc dùng mã OTP: <strong>${otp}</strong></li>
            </ul>
            <p>Mã OTP có hiệu lực trong 15 phút.</p>
            <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        `,
    };

    await transporter.sendMail(mailOptions);
};

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');
const generateResetToken = () => crypto.randomBytes(32).toString('hex');
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const register = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Vui lòng nhập đủ email và mật khẩu!' });
        }

        const pool = await poolPromise;
        const checkUser = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        if (checkUser.recordset.length > 0) {
            return res.status(400).json({ message: 'Email này đã được đăng ký!' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const displayName = email.split('@')[0];
        const verificationToken = generateVerificationToken();

        await pool.request()
            .input('email', sql.VarChar, email)
            .input('password_hash', sql.VarChar, hashedPassword)
            .input('display_name', sql.NVarChar, displayName)
            .input('email_verified', sql.Bit, 0)
            .input('verification_token', sql.VarChar(255), verificationToken)
            .query(`INSERT INTO Users (email, password_hash, display_name, email_verified, verification_token)
                VALUES (@email, @password_hash, @display_name, @email_verified, @verification_token)`);

        await sendVerificationEmail(email, verificationToken);
        res.status(201).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.' });
    } catch (error) {
        console.error('Lỗi khi đăng ký:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Vui lòng nhập email.' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');

        const user = result.recordset[0];
        if (!user) {
            return res.status(200).json({ message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.' });
        }

        const resetToken = generateResetToken();
        const resetOtp = generateOtp();
        const resetExpires = new Date(Date.now() + 15 * 60 * 1000);

        await pool.request()
            .input('id', sql.Int, user.id)
            .input('reset_token', sql.VarChar(255), resetToken)
            .input('reset_otp', sql.VarChar(6), resetOtp)
            .input('reset_expires', sql.DateTime, resetExpires)
            .query(`UPDATE Users SET reset_token = @reset_token, reset_otp = @reset_otp, reset_expires = @reset_expires WHERE id = @id`);

        await sendPasswordResetEmail(email, resetToken, resetOtp);
        res.status(200).json({ message: 'Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới email của bạn.' });
    } catch (error) {
        console.error('Lỗi khi yêu cầu reset mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email, token, otp, password } = req.body;
        if (!password) {
            return res.status(400).json({ message: 'Vui lòng nhập mật khẩu mới.' });
        }

        const pool = await poolPromise;
        let result;
        const now = new Date();

        if (token) {
            result = await pool.request()
                .input('token', sql.VarChar(255), token)
                .input('now', sql.DateTime, now)
                .query('SELECT * FROM Users WHERE reset_token = @token AND reset_expires > @now');
        } else if (email && otp) {
            result = await pool.request()
                .input('email', sql.VarChar, email)
                .input('otp', sql.VarChar(6), otp)
                .input('now', sql.DateTime, now)
                .query('SELECT * FROM Users WHERE email = @email AND reset_otp = @otp AND reset_expires > @now');
        } else {
            return res.status(400).json({ message: 'Vui lòng cung cấp token hoặc mã OTP để đặt lại mật khẩu.' });
        }

        const user = result.recordset[0];
        if (!user) {
            return res.status(400).json({ message: 'Token hoặc OTP không hợp lệ hoặc đã hết hạn.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await pool.request()
            .input('id', sql.Int, user.id)
            .input('password_hash', sql.VarChar, hashedPassword)
            .query('UPDATE Users SET password_hash = @password_hash, reset_token = NULL, reset_otp = NULL, reset_expires = NULL WHERE id = @id');

        res.status(200).json({ message: 'Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.' });
    } catch (error) {
        console.error('Lỗi khi reset mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await poolPromise;
        
        const result = await pool.request()
            .input('email', sql.VarChar, email)
            .query('SELECT * FROM Users WHERE email = @email');
            
        const user = result.recordset[0];
        if (!user) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng!' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng!' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({
            message: 'Đăng nhập thành công!',
            token,
            displayName: user.display_name,
            emailVerified: !!user.email_verified,
        });
    } catch (error) {
        console.error('Lỗi khi đăng nhập:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const me = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query('SELECT id, email, display_name, email_verified FROM Users WHERE id = @id');

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }

        res.status(200).json({
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            emailVerified: !!user.email_verified,
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin user:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const verifyEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const pool = await poolPromise;

        const result = await pool.request()
            .input('token', sql.VarChar, token)
            .query('SELECT * FROM Users WHERE verification_token = @token');

        const user = result.recordset[0];
        if (!user) {
            return res.status(400).send('<h2>Token xác thực không hợp lệ hoặc đã được sử dụng.</h2>');
        }

        if (user.email_verified) {
            return res.status(200).send('<h2>Tài khoản đã được xác thực trước đó.</h2>');
        }

        await pool.request()
            .input('id', sql.Int, user.id)
            .query('UPDATE Users SET email_verified = 1, verification_token = NULL WHERE id = @id');

        res.status(200).send('<h2>Xác thực thành công! Bạn đã kích hoạt tài khoản.</h2>');
    } catch (error) {
        console.error('Lỗi khi xác thực email:', error);
        res.status(500).send('<h2>Lỗi server khi xác thực. Vui lòng thử lại sau.</h2>');
    }
};

const resendVerificationEmail = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query('SELECT email, email_verified, verification_token FROM Users WHERE id = @id');

        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: 'Người dùng không tồn tại.' });
        }
        if (user.email_verified) {
            return res.status(400).json({ message: 'Tài khoản đã được xác thực.' });
        }

        const verificationToken = user.verification_token || generateVerificationToken();

        await pool.request()
            .input('id', sql.Int, req.user.id)
            .input('verification_token', sql.VarChar, verificationToken)
            .query('UPDATE Users SET verification_token = @verification_token WHERE id = @id');

        await sendVerificationEmail(user.email, verificationToken);
        res.status(200).json({ message: 'Đã gửi lại email kích hoạt. Vui lòng kiểm tra hộp thư.' });
    } catch (error) {
        console.error('Lỗi khi gửi lại email kích hoạt:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

module.exports = { register, login, me, verifyEmail, resendVerificationEmail, requestPasswordReset, resetPassword };
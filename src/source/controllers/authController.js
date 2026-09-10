const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { poolPromise, sql } = require('../config/db');

// Khởi tạo transporter với timeout kiểm soát lỗi nghẽn mạng
const createTransporter = () => {
    return nodemailer.createTransport({
        service: 'gmail',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true', // false cho port 587
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS?.replace(/\s+/g, ''), // Tự động dọn sạch mọi khoảng trắng nếu có
        },
        connectionTimeout: 10000, // Tối đa 10s kết nối
        greetingTimeout: 5000,
        socketTimeout: 10000,
    });
};

const sendVerificationEmail = async (email, token) => {
    const backendUrl = process.env.BACKEND_BASE_URL || process.env.APP_BASE_URL || 'https://note-app-backend-3mbr.onrender.com';
    const verificationUrl = `${backendUrl}/api/auth/verify-email/${token}`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP chưa cấu hình. Link kích hoạt:', verificationUrl);
        return;
    }

    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Kích hoạt tài khoản - Smart Notes',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #2563eb;">Chào mừng bạn đến với Smart Notes!</h2>
                <p>Vui lòng nhấp vào nút dưới đây để kích hoạt tài khoản của bạn:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Kích hoạt tài khoản</a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Nếu nút trên không hoạt động, bạn có thể copy link sau dán vào trình duyệt:<br><a href="${verificationUrl}">${verificationUrl}</a></p>
                <p style="color: #64748b; font-size: 13px;">Nếu bạn không thực hiện đăng ký này, vui lòng bỏ qua email.</p>
            </div>
        `,
    };

    await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, token, otp) => {
    const frontendUrl = process.env.FRONTEND_BASE_URL || 'https://note-app-ir52.vercel.app';
    const resetUrl = `${frontendUrl}/reset_password.html?token=${encodeURIComponent(token)}`;

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn('SMTP chưa cấu hình. Link reset:', resetUrl);
        console.warn('OTP reset:', otp);
        return;
    }

    const transporter = createTransporter();

    const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Yêu cầu đặt lại mật khẩu - Smart Notes',
        html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                <h2 style="color: #2563eb;">Yêu cầu đặt lại mật khẩu</h2>
                <p>Bạn có thể sử dụng một trong hai cách dưới đây để đổi mật khẩu mới:</p>
                <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0;">Mã OTP của bạn: <strong style="font-size: 20px; color: #2563eb; letter-spacing: 2px;">${otp}</strong></p>
                    <small style="color: #64748b;">(Có hiệu lực trong 15 phút)</small>
                </div>
                <p>Hoặc nhấp trực tiếp vào đường link sau:</p>
                <div style="text-align: center; margin: 24px 0;">
                    <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đổi mật khẩu ngay</a>
                </div>
                <p style="color: #64748b; font-size: 13px;">Nếu bạn không yêu cầu, vui lòng bỏ qua email này để bảo vệ tài khoản.</p>
            </div>
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
            .input('avatar_color', sql.NVarChar, 'blue')
            .input('email_verified', sql.Bit, 0)
            .input('verification_token', sql.VarChar(255), verificationToken)
            .query(`INSERT INTO Users (email, password_hash, display_name, avatar_color, email_verified, verification_token) VALUES (@email, @password_hash, @display_name, @avatar_color, @email_verified, @verification_token)`);
        
        // Gửi ngầm không chặn luồng đăng ký
        sendVerificationEmail(email, verificationToken).catch(err => {
            console.error('Lỗi ngầm khi gửi email xác thực:', err);
        });

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

        // Gửi ngầm không làm đơ trang đổi mật khẩu
        sendPasswordResetEmail(email, resetToken, resetOtp).catch(err => {
            console.error('Lỗi ngầm khi gửi email đặt lại mật khẩu:', err);
        });

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
        const frontendUrl = process.env.FRONTEND_BASE_URL || 'https://note-app-ir52.vercel.app';

        const result = await pool.request()
            .input('token', sql.VarChar, token)
            .query('SELECT * FROM Users WHERE verification_token = @token');

        const user = result.recordset[0];
        if (!user) {
            return res.status(400).send(`
                <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                    <h2 style="color: #ef4444;">Token xác thực không hợp lệ hoặc đã được sử dụng.</h2>
                    <a href="${frontendUrl}" style="color: #2563eb; text-decoration: none; font-weight: bold;">Quay lại trang chủ</a>
                </div>
            `);
        }

        if (!user.email_verified) {
            await pool.request()
                .input('id', sql.Int, user.id)
                .query('UPDATE Users SET email_verified = 1, verification_token = NULL WHERE id = @id');
        }

        res.status(200).send(`
            <div style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
                <h2 style="color: #22c55e;">Xác thực thành công! Tài khoản của bạn đã được kích hoạt.</h2>
                <p>Bạn có thể quay lại trang ứng dụng để đăng nhập ngay bây giờ.</p>
                <a href="${frontendUrl}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 15px;">Đến trang Đăng nhập</a>
            </div>
        `);
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

        sendVerificationEmail(user.email, verificationToken).catch(err => {
            console.error('Lỗi ngầm khi gửi lại email xác thực:', err);
        });

        res.status(200).json({ message: 'Đã gửi lại email kích hoạt. Vui lòng kiểm tra hộp thư.' });
    } catch (error) {
        console.error('Lỗi khi gửi lại email kích hoạt:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

const getProfile = async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, req.user.id)
            .query(`
                SELECT
                    id,
                    email,
                    display_name,
                    avatar_color,
                    email_verified
                FROM Users
                WHERE id = @id
            `);
        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy user' });
        }
        res.status(200).json({
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            avatarColor: user.avatar_color,
            emailVerified: !!user.email_verified
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { displayName, avatarColor } = req.body;
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, req.user.id)
            .input('display_name', sql.NVarChar, displayName)
            .input('avatar_color', sql.NVarChar, avatarColor)
            .query(`
                UPDATE Users
                SET
                    display_name = @display_name,
                    avatar_color = @avatar_color
                WHERE id = @id
            `);
        res.status(200).json({ message: 'Cập nhật profile thành công' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Lỗi server' });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword, confirmPassword } = req.body;
        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin!' });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Xác nhận mật khẩu không khớp!' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Mật khẩu mới phải từ 6 ký tự!' });
        }

        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, userId)
            .query(`SELECT * FROM Users WHERE id = @id`);
        const user = result.recordset[0];
        if (!user) {
            return res.status(404).json({ message: 'Không tìm thấy tài khoản!' });
        }
        const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Mật khẩu cũ không đúng!' });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await pool.request()
            .input('id', sql.Int, userId)
            .input('password', sql.VarChar, hashedPassword)
            .query(`
                UPDATE Users
                SET password_hash = @password
                WHERE id = @id
            `);
        res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ message: 'Lỗi server!' });
    }
};

module.exports = {
    changePassword,
    register,
    login,
    me,
    verifyEmail,
    resendVerificationEmail,
    requestPasswordReset,
    resetPassword,
    getProfile,
    updateProfile
};

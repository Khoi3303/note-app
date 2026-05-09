const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Mở đường dẫn Đăng ký
router.post('/register', authController.register);

// Đường dẫn Đăng nhập cũ
router.post('/login', authController.login);

// Kiểm tra trạng thái tài khoản hiện tại
router.get('/me', verifyToken, authController.me);

// Xác thực email bằng token trong link
router.get('/verify-email/:token', authController.verifyEmail);

// Gửi lại email kích hoạt
router.post('/resend-verification', verifyToken, authController.resendVerificationEmail);

// Yêu cầu đặt lại mật khẩu qua email/OTP
router.post('/request-password-reset', authController.requestPasswordReset);

// Thực hiện đặt lại mật khẩu với token hoặc OTP
router.post('/reset-password', authController.resetPassword);

module.exports = router;
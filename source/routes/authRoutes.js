const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {verifyToken} = require('../middleware/authMiddleware');
// Đăng ký
router.post('/register', authController.register);
// Đăng nhập
router.post('/login', authController.login);
// Kiểm tra tài khoản hiện tại
router.get('/me', verifyToken, authController.me);
// Xác thực email
router.get('/verify-email/:token', authController.verifyEmail);
// Gửi lại email kích hoạt
router.post(
    '/resend-verification',
    verifyToken,
    authController.resendVerificationEmail
);
// Yêu cầu đặt lại mật khẩu
router.post(
    '/request-password-reset',
    authController.requestPasswordReset
);
// Reset mật khẩu bằng OTP/token
router.post(
    '/reset-password',
    authController.resetPassword
);
// Lấy profile
router.get(
    '/profile',
    verifyToken,
    authController.getProfile
);
// Cập nhật profile
router.put(
    '/profile',
    verifyToken,
    authController.updateProfile
);
// Đổi mật khẩu khi đã đăng nhập
router.put(
    '/change-password',
    verifyToken,
    authController.changePassword
);
module.exports = router;
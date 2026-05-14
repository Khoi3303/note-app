// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
    // Lấy token từ header Authorization (dạng: Bearer <token>)
    const authHeader = req.header('Authorization');
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Nếu không có token, trả về lỗi 401 (Unauthorized)
        return res.status(401).json({ message: 'Truy cập bị từ chối. Vui lòng đăng nhập!' });
    }

    try {
        // Kiểm tra token có hợp lệ không
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Lưu thông tin user vào request để dùng ở các controller sau
        next(); // Cho phép đi tiếp
    } catch (error) {
        return res.status(403).json({ message: 'Phiên đăng nhập hết hạn hoặc không hợp lệ!' });
    }
};

module.exports = { verifyToken };
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const uploadsPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}

// QUAN TRỌNG: Mở thư mục uploads ra bên ngoài
app.use('/uploads', express.static(uploadsPath));

// Phục vụ giao diện front-end từ thư mục frontend_notes
const frontendPath = path.join(__dirname, '..', 'frontend_notes');
app.use(express.static(frontendPath));

const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const http = require('http');
const { initWebSocketServer } = require('./wsServer');

app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

const PORT = process.env.PORT || 8080;
const server = http.createServer(app);
initWebSocketServer(server);
server.listen(PORT, () => console.log(`Server chạy tại: http://localhost:${PORT}`));
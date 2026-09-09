const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '1433', 10), // Bổ sung cổng 1433 rõ ràng
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Kết nối SQL Server thành công!');
        return pool;
    })
    .catch(err => {
        console.error('Lỗi kết nối CSDL chi tiết:', err);
        // Không gọi process.exit(1) để tránh làm sập cả web server
        return null;
    });

module.exports = {
    sql,
    poolPromise
};

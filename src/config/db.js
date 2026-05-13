const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true,
    },
};

const connectDB = async () => {
    try {
        await sql.connect(config);
        console.log('Kết nối SQL Server thành công!');
    } catch (err) {
        console.error('Lỗi kết nối CSDL:', err);
    }
};

module.exports = { sql, connectDB };
const poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('Kết nối SQL Server thành công!');
        return pool;
    })
    .catch(err => {
        console.error('Lỗi kết nối CSDL:', err);
        process.exit(1);
    });

module.exports = {
    sql,
    poolPromise
};
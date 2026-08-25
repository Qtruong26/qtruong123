/**
 * Kết nối MySQL dùng connection pool (mysql2/promise).
 * Pool cho phép nhiều request/nhiều người dùng truy vấn đồng thời
 * mà không phải mở/đóng kết nối liên tục — phù hợp cho web app thật.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fitcore',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true, // trả DATE/DATETIME dạng chuỗi "YYYY-MM-DD" thay vì object Date (dễ dùng ở frontend)
});

module.exports = pool;

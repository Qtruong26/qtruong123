require('dotenv').config();
const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Kiểm tra kết nối MySQL trước khi mở cổng lắng nghe, để lỗi cấu hình DB
    // hiện ra ngay khi khởi động thay vì lỗi rải rác từng request.
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('✔ Kết nối MySQL thành công.');

    app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ FitCore backend đang chạy tại http://192.168.1.170:${PORT}`);
  console.log(`Kiểm tra sức khỏe server: http://192.168.1.170:${PORT}/api/health`);
});

  } catch (err) {
    console.error('✘ Không thể kết nối MySQL. Kiểm tra lại file .env và MySQL server.');
    console.error(err.message);
    process.exit(1);
  }
}

start();

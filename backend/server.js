const express = require('express');
require('dotenv').config();

const app = require('./src/app');
const pool = require('./src/config/db');

const PORT = process.env.PORT || 5000;


async function start() {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();

    console.log('✔ Kết nối MySQL thành công.');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✓ FitCore backend đang chạy tại port ${PORT}`);
      console.log(`✓ Health: http://localhost:${PORT}/api/health`);
    });

  } catch (err) {
    console.error('✘ Không thể kết nối MySQL.');
    console.error(err.message);
    process.exit(1);
  }
}

start();
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// API lấy toàn bộ lịch sử ai_logs từ database
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ai_logs ORDER BY created_at DESC');
    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
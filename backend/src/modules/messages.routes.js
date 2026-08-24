const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/** GET /api/messages?memberId=&trainerId= — lấy toàn bộ đoạn hội thoại giữa 1 HLV và 1 hội viên */
router.get('/', async (req, res, next) => {
  try {
    const memberId = req.user.role === 'member' ? req.user.memberId : req.query.memberId;
    const trainerId = req.user.role === 'trainer' ? req.user.trainerId : req.query.trainerId;
    if (!memberId || !trainerId) return res.status(400).json({ message: 'Thiếu memberId hoặc trainerId.' });

    const [rows] = await pool.query(
      'SELECT id, member_id AS memberId, trainer_id AS trainerId, sender, text, created_at AS date FROM messages WHERE member_id=? AND trainer_id=? ORDER BY created_at',
      [memberId, trainerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /api/messages — gửi tin nhắn (sender tự suy ra từ vai trò đăng nhập) */
router.post('/', async (req, res, next) => {
  try {
    if (!['member', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Chỉ hội viên và huấn luyện viên mới nhắn tin được.' });
    }
    const { text } = req.body;
    const memberId = req.user.role === 'member' ? req.user.memberId : req.body.memberId;
    const trainerId = req.user.role === 'trainer' ? req.user.trainerId : req.body.trainerId;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Vui lòng nhập nội dung tin nhắn.' });

    const [r] = await pool.query(
      'INSERT INTO messages (member_id, trainer_id, sender, text) VALUES (?,?,?,?)',
      [memberId, trainerId, req.user.role, text.trim()]
    );
    res.status(201).json({ id: r.insertId, message: 'Đã gửi tin nhắn.' });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { todayStr } = require('../utils/dateUtils');

const router = express.Router();
router.use(requireAuth);

/** GET /api/progress/students — học viên đang thuộc HLV hiện tại */
router.get('/students', requireRole('trainer'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, phone, goal, level FROM members WHERE trainer_id = ? ORDER BY name',
      [req.user.trainerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** GET /api/progress/available-students — hội viên chưa thuộc HLV hiện tại (để "nhận học viên") */
router.get('/available-students', requireRole('trainer'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.id, m.name, m.phone, m.goal, m.trainer_id AS trainerId, t.name AS trainerName
       FROM members m LEFT JOIN trainers t ON t.id = m.trainer_id
       WHERE m.trainer_id IS NULL OR m.trainer_id != ? ORDER BY m.name`,
      [req.user.trainerId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /api/progress/students/:memberId/accept — nhận học viên */
router.post('/students/:memberId/accept', requireRole('trainer'), async (req, res, next) => {
  try {
    await pool.query('UPDATE members SET trainer_id = ? WHERE id = ?', [req.user.trainerId, req.params.memberId]);
    res.json({ message: 'Đã nhận học viên mới.' });
  } catch (err) { next(err); }
});

/** POST /api/progress/students/:memberId/release — bỏ nhận (ngừng phụ trách) */
router.post('/students/:memberId/release', requireRole('trainer'), async (req, res, next) => {
  try {
    await pool.query('UPDATE members SET trainer_id = NULL WHERE id = ? AND trainer_id = ?', [req.params.memberId, req.user.trainerId]);
    res.json({ message: 'Đã bỏ nhận học viên.' });
  } catch (err) { next(err); }
});

/** GET /api/progress/notes?memberId= */
router.get('/notes', async (req, res, next) => {
  try {
    const memberId = req.user.role === 'member' ? req.user.memberId : req.query.memberId;
    if (!memberId) return res.status(400).json({ message: 'Thiếu memberId.' });
    const [rows] = await pool.query(
      'SELECT id, member_id AS memberId, trainer_id AS trainerId, date, note FROM progress_notes WHERE member_id = ? ORDER BY date DESC',
      [memberId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /api/progress/notes — HLV thêm ghi chú tiến độ cho học viên của mình */
router.post('/notes', requireRole('trainer'), async (req, res, next) => {
  try {
    const { memberId, note } = req.body;
    if (!note || !note.trim()) return res.status(400).json({ message: 'Vui lòng nhập nội dung ghi chú.' });
    const [r] = await pool.query(
      'INSERT INTO progress_notes (member_id, trainer_id, date, note) VALUES (?,?,?,?)',
      [memberId, req.user.trainerId, todayStr(), note.trim()]
    );
    res.status(201).json({ id: r.insertId, message: 'Đã lưu ghi chú tiến độ.' });
  } catch (err) { next(err); }
});

module.exports = router;

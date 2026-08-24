const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { todayStr } = require('../utils/dateUtils');

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT a.id, a.member_id AS memberId, m.name AS memberName, a.date, a.time,
         a.check_out_time AS checkOutTime, a.note
  FROM attendance a JOIN members m ON m.id = a.member_id`;

/** GET /api/attendance — hội viên chỉ thấy của mình; staff/HLV thấy tất cả (HLV cần xem để theo dõi tiến độ) */
router.get('/', async (req, res, next) => {
  try {
    let sql = SELECT;
    const params = [];
    const memberIdFilter = req.query.memberId;
    if (req.user.role === 'member') {
      sql += ' WHERE a.member_id = ?';
      params.push(req.user.memberId);
    } else if (memberIdFilter) {
      sql += ' WHERE a.member_id = ?';
      params.push(memberIdFilter);
    }
    sql += ' ORDER BY a.date DESC, a.time DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /api/attendance — check-in. Hội viên tự check-in cho mình; staff check-in hộ hội viên bất kỳ. */
router.post('/', async (req, res, next) => {
  try {
    const { date, time, note } = req.body;
    const memberId = req.user.role === 'member' ? req.user.memberId : req.body.memberId;
    if (!memberId) return res.status(400).json({ message: 'Thiếu hội viên.' });

    const [r] = await pool.query(
      'INSERT INTO attendance (member_id, date, time, note) VALUES (?,?,?,?)',
      [memberId, date || todayStr(), time || new Date().toTimeString().slice(0, 5), note || '']
    );
    res.status(201).json({ id: r.insertId, message: 'Đã check-in.' });
  } catch (err) { next(err); }
});

/** POST /api/attendance/:id/checkout */
router.post('/:id/checkout', async (req, res, next) => {
  try {
    const time = new Date().toTimeString().slice(0, 5);
    await pool.query('UPDATE attendance SET check_out_time = ? WHERE id = ?', [time, req.params.id]);
    res.json({ message: 'Đã check-out.', checkOutTime: time });
  } catch (err) { next(err); }
});

/** DELETE /api/attendance/:id — chỉ Admin/Reception/Trainer (không cho hội viên tự xóa lịch sử) */
router.delete('/:id', async (req, res, next) => {
  try {
    if (!['admin', 'reception', 'trainer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa.' });
    }
    await pool.query('DELETE FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa.' });
  } catch (err) { next(err); }
});

module.exports = router;

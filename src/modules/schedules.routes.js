const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const SELECT = `
  SELECT s.id, s.member_id AS memberId, m.name AS memberName, s.trainer_id AS trainerId,
         t.name AS trainerName, s.date, s.time, s.type, s.status, s.note
  FROM schedules s
  LEFT JOIN members m ON m.id = s.member_id
  JOIN trainers t ON t.id = s.trainer_id`;

/** GET /api/schedules — lọc theo vai trò: hội viên thấy lịch của mình, HLV thấy lịch mình phụ trách, staff thấy tất cả */
router.get('/', async (req, res, next) => {
  try {
    let sql = SELECT;
    const params = [];
    if (req.user.role === 'member') {
      sql += ' WHERE s.member_id = ?';
      params.push(req.user.memberId);
    } else if (req.user.role === 'trainer') {
      sql += ' WHERE s.trainer_id = ?';
      params.push(req.user.trainerId);
    }
    sql += ' ORDER BY s.date, s.time';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { next(err); }
});

/** POST /api/schedules — đặt lịch (cá nhân hoặc lớp nhóm) */
router.post('/', async (req, res, next) => {
  try {
    const { trainerId, date, time, type, note } = req.body;
    let memberId = req.body.memberId || null;
    if (req.user.role === 'member') memberId = req.user.memberId; // hội viên chỉ đặt cho chính mình
    if (type === 'Nhóm') memberId = null;

    if (!trainerId || !date || !time) return res.status(400).json({ message: 'Thiếu thông tin lịch tập.' });

    const [r] = await pool.query(
      'INSERT INTO schedules (member_id, trainer_id, date, time, type, status, note) VALUES (?,?,?,?,?,"Đã đặt",?)',
      [memberId, trainerId, date, time, type || 'Cá nhân', type === 'Nhóm' ? (note || 'Lớp nhóm') : null]
    );
    res.status(201).json({ id: r.insertId, message: 'Đã đặt lịch tập.' });
  } catch (err) { next(err); }
});

/** DELETE /api/schedules/:id — hủy lịch; Admin/Reception hủy bất kỳ, Trainer/Member chỉ hủy lịch của mình */
router.delete('/:id', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM schedules WHERE id = ?', [req.params.id]);
    const s = rows[0];
    if (!s) return res.status(404).json({ message: 'Không tìm thấy lịch tập.' });

    const canCancelAny = ['admin', 'reception'].includes(req.user.role);
    const isOwnerTrainer = req.user.role === 'trainer' && s.trainer_id === req.user.trainerId;
    const isOwnerMember = req.user.role === 'member' && s.member_id === req.user.memberId;
    if (!canCancelAny && !isOwnerTrainer && !isOwnerMember) {
      return res.status(403).json({ message: 'Bạn không có quyền hủy lịch tập này.' });
    }

    await pool.query('DELETE FROM schedules WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã hủy lịch.' });
  } catch (err) { next(err); }
});

module.exports = router;

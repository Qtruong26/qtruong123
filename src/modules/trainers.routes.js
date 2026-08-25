const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

/** GET /api/trainers — mọi vai trò đã đăng nhập đều xem được (để chọn HLV khi đặt lịch...) */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, phone, specialty, work_days AS workDays FROM trainers ORDER BY name');
    res.json(rows.map((t) => ({ ...t, workDays: t.workDays ? t.workDays.split(',').filter(Boolean) : [] })));
  } catch (err) { next(err); }
});

/** POST /api/trainers — chỉ Admin (thêm hồ sơ HLV độc lập, không tạo tài khoản đăng nhập — dùng /api/staff cho việc đó) */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {
    const { name, phone, specialty, workDays } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ tên.' });
    const [r] = await pool.query(
      'INSERT INTO trainers (name, phone, specialty, work_days) VALUES (?,?,?,?)',
      [name.trim(), phone || '', specialty || '', (workDays || []).join(',')]
    );
    res.status(201).json({ id: r.insertId, message: 'Đã thêm HLV.' });
  } catch (err) { next(err); }
});

/** PUT /api/trainers/:id — Admin và Reception đều được sửa thông tin (không xóa) */
router.put('/:id', requireRole('admin', 'reception'), async (req, res, next) => {
  try {
    const { name, phone, specialty, workDays } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ tên.' });
    await pool.query(
      'UPDATE trainers SET name=?, phone=?, specialty=?, work_days=? WHERE id=?',
      [name.trim(), phone || '', specialty || '', (workDays || []).join(','), req.params.id]
    );
    res.json({ message: 'Đã cập nhật HLV.' });
  } catch (err) { next(err); }
});

/** DELETE /api/trainers/:id — chỉ Admin */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM trainers WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa HLV.' });
  } catch (err) { next(err); }
});

module.exports = router;

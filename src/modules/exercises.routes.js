const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, muscle_group AS muscleGroup, description, sets, reps FROM exercises ORDER BY name'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireRole('admin', 'trainer'), async (req, res, next) => {
  try {
    const { name, muscleGroup, description, sets, reps } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập tên bài tập.' });
    const [r] = await pool.query(
      'INSERT INTO exercises (name, muscle_group, description, sets, reps) VALUES (?,?,?,?,?)',
      [name.trim(), muscleGroup || '', description || '', Number(sets) || 3, reps || '']
    );
    res.status(201).json({ id: r.insertId, message: 'Đã thêm bài tập.' });
  } catch (err) { next(err); }
});

router.put('/:id', requireRole('admin', 'trainer'), async (req, res, next) => {
  try {
    const { name, muscleGroup, description, sets, reps } = req.body;
    await pool.query(
      'UPDATE exercises SET name=?, muscle_group=?, description=?, sets=?, reps=? WHERE id=?',
      [name, muscleGroup, description, Number(sets) || 3, reps, req.params.id]
    );
    res.json({ message: 'Đã cập nhật bài tập.' });
  } catch (err) { next(err); }
});

router.delete('/:id', requireRole('admin', 'trainer'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM exercises WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa bài tập.' });
  } catch (err) { next(err); }
});

module.exports = router;

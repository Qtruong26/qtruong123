const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { daysBetween, todayStr } = require('../utils/dateUtils');

const router = express.Router();
router.use(requireAuth);

const MEMBER_SELECT = `
  SELECT m.id, m.name, m.phone, m.email, m.join_date AS joinDate, m.goal, m.level,
         m.trainer_id AS trainerId, t.name AS trainerName
  FROM members m
  LEFT JOIN trainers t ON t.id = m.trainer_id`;

/** Trả gói đang có hiệu lực gần nhất của 1 hội viên (dùng chung nhiều nơi) */
async function getActivePackage(memberId) {
  const [rows] = await pool.query(
    `SELECT mp.*, p.name AS packageName FROM member_packages mp
     JOIN packages p ON p.id = mp.package_id
     WHERE mp.member_id = ? ORDER BY mp.end_date DESC LIMIT 1`,
    [memberId]
  );
  return rows[0] || null;
}
function packageStatus(mp) {
  if (!mp) return 'none';
  const d = daysBetween(todayStr(), mp.end_date);
  if (d < 0) return 'expired';
  if (d <= 7) return 'expiring';
  return 'active';
}

/** GET /api/members — Admin/Reception xem tất cả; Trainer xem học viên của mình */
router.get('/', requireRole('admin', 'reception', 'trainer'), async (req, res, next) => {
  try {
    let sql = MEMBER_SELECT;
    const params = [];
    if (req.user.role === 'trainer') {
      sql += ' WHERE m.trainer_id = ?';
      params.push(req.user.trainerId);
    }
    sql += ' ORDER BY m.name';
    const [members] = await pool.query(sql, params);
    const withStatus = await Promise.all(members.map(async (m) => {
      const mp = await getActivePackage(m.id);
      return { ...m, activePackage: mp, packageStatus: packageStatus(mp) };
    }));
    res.json(withStatus);
  } catch (err) { next(err); }
});

/** GET /api/members/:id */
router.get('/:id', async (req, res, next) => {
  try {
    if (req.user.role === 'member' && Number(req.params.id) !== req.user.memberId) {
      return res.status(403).json({ message: 'Bạn chỉ có thể xem hồ sơ của chính mình.' });
    }
    const [rows] = await pool.query(`${MEMBER_SELECT} WHERE m.id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Không tìm thấy hội viên.' });
    const mp = await getActivePackage(req.params.id);
    res.json({ ...rows[0], activePackage: mp, packageStatus: packageStatus(mp) });
  } catch (err) { next(err); }
});

/** POST /api/members — Admin/Reception thêm hội viên mới */
router.post('/', requireRole('admin', 'reception'), async (req, res, next) => {
  try {
    const { name, phone, email, goal, level } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ tên.' });
    const [r] = await pool.query(
      'INSERT INTO members (name, phone, email, join_date, goal, level) VALUES (?,?,?,?,?,?)',
      [name.trim(), phone || '', email || null, todayStr(), goal || 'Duy trì sức khỏe', level || 'Mới bắt đầu']
    );
    res.status(201).json({ id: r.insertId, message: 'Đã thêm hội viên mới.' });
  } catch (err) { next(err); }
});

/** PUT /api/members/:id — sửa hồ sơ; hội viên có thể tự sửa hồ sơ của chính mình */
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const isSelf = req.user.role === 'member' && req.user.memberId === id;
    if (!isSelf && !['admin', 'reception'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền sửa hồ sơ này.' });
    }
    const { name, phone, email, goal, level } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ tên.' });
    await pool.query(
      'UPDATE members SET name=?, phone=?, email=?, goal=?, level=? WHERE id=?',
      [name.trim(), phone || '', email || null, goal, level, id]
    );
    if (isSelf) await pool.query('UPDATE users SET name=? WHERE member_id=?', [name.trim(), id]);
    res.json({ message: 'Đã cập nhật hội viên.' });
  } catch (err) { next(err); }
});

/** DELETE /api/members/:id — chỉ Admin */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM members WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã xóa hội viên.' });
  } catch (err) { next(err); }
});

module.exports = { router, getActivePackage, packageStatus };

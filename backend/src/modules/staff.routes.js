const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

/** GET /api/staff — danh sách nhân viên (đã kích hoạt) + yêu cầu đang chờ duyệt */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, username, role, name, pending, member_id AS memberId, trainer_id AS trainerId
       FROM users WHERE role IN ('reception','trainer') ORDER BY pending DESC, name`
    );
    res.json({
      pending: rows.filter((u) => u.pending),
      staff: rows.filter((u) => !u.pending),
    });
  } catch (err) {
    next(err);
  }
});

/** POST /api/staff — Admin thêm nhân viên trực tiếp (kích hoạt ngay, không cần duyệt) */
router.post('/', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { role, name, phone, username, password } = req.body;
    if (!['reception', 'trainer'].includes(role)) return res.status(400).json({ message: 'Vai trò không hợp lệ.' });
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ tên.' });
    if (!username || username.trim().length < 3) return res.status(400).json({ message: 'Tên đăng nhập cần tối thiểu 3 ký tự.' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Mật khẩu cần tối thiểu 6 ký tự.' });

    const [existing] = await conn.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existing.length) return res.status(409).json({ message: 'Tên đăng nhập đã tồn tại.' });

    await conn.beginTransaction();
    let trainerId = null;
    if (role === 'trainer') {
      const [r] = await conn.query(
        'INSERT INTO trainers (name, phone, specialty, work_days) VALUES (?,?,?,?)',
        [name.trim(), phone || '', 'Chưa cập nhật', '']
      );
      trainerId = r.insertId;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const [r2] = await conn.query(
      'INSERT INTO users (username, password_hash, role, name, trainer_id, pending) VALUES (?,?,?,?,?,0)',
      [username.trim(), passwordHash, role, name.trim(), trainerId]
    );
    await conn.commit();
    res.status(201).json({ id: r2.insertId, message: 'Đã thêm nhân viên mới.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

/** POST /api/staff/promote-to-trainer — Admin thăng chức Hội viên lên HLV */
router.post('/promote-to-trainer', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { userId, specialty, workDays } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Thiếu ID người dùng.' });
    }

    // 1. Kiểm tra tài khoản người dùng
    const [users] = await conn.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users.length) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng.' });
    }

    const targetUser = users[0];

    if (targetUser.role === 'trainer') {
      return res.status(400).json({ message: 'Người dùng này đã là Huấn luyện viên.' });
    }

    await conn.beginTransaction();

    let trainerId = targetUser.trainer_id;

    // 2. Tạo hồ sơ HLV mới nếu chưa liên kết
    if (!trainerId) {
      const [tResult] = await conn.query(
        'INSERT INTO trainers (name, phone, specialty, work_days) VALUES (?, ?, ?, ?)',
        [
          targetUser.name,
          targetUser.phone || '',
          specialty || 'Chưa cập nhật',
          workDays || ''
        ]
      );
      trainerId = tResult.insertId;
    }

    // 3. Đổi role thành trainer, gắn trainer_id và mở khóa tài khoản
    await conn.query(
      'UPDATE users SET role = "trainer", trainer_id = ?, pending = 0 WHERE id = ?',
      [trainerId, userId]
    );

    await conn.commit();

    return res.json({
      message: `Đã thăng chức ${targetUser.name} thành Huấn luyện viên thành công!`,
      trainerId
    });

  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

/** POST /api/staff/:id/approve — phê duyệt tài khoản tự đăng ký */
router.post('/:id/approve', async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET pending = 0 WHERE id = ?', [req.params.id]);
    res.json({ message: 'Đã phê duyệt nhân viên.' });
  } catch (err) { 
    next(err); 
  }
});

/** DELETE /api/staff/:id — từ chối yêu cầu đăng ký HOẶC cho nhân viên đang làm việc thôi việc */
router.delete('/:id', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const user = rows[0];
    if (!user) return res.status(404).json({ message: 'Không tìm thấy nhân viên.' });

    await conn.beginTransaction();
    await conn.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (user.trainer_id) {
      await conn.query('DELETE FROM trainers WHERE id = ?', [user.trainer_id]);
    }
    await conn.commit();
    res.json({ message: user.pending ? 'Đã từ chối yêu cầu.' : 'Đã cho nhân viên thôi việc.' });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
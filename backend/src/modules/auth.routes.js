const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { todayStr } = require('../utils/dateUtils');

const router = express.Router();

/**
 * POST /api/auth/register
 * Tự đăng ký tài khoản. Số điện thoại được dùng làm tên đăng nhập (username)
 * — không cần người dùng tự chọn tên đăng nhập riêng. Hội viên được kích
 * hoạt ngay với mục tiêu/mức độ mặc định (chỉnh sau ở "Thông tin cá nhân");
 * Lễ tân/HLV vào trạng thái "pending" chờ Admin phê duyệt (mục /api/staff).
 */
router.post('/register', async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    const { role, name, phone, email, password } = req.body;
    const username = (phone || '').trim(); // SĐT chính là tên đăng nhập

    if (!['member', 'reception', 'trainer'].includes(role)) {
      return res.status(400).json({ message: 'Vai trò đăng ký không hợp lệ.' });
    }
    if (!name || !name.trim()) return res.status(400).json({ message: 'Vui lòng nhập họ và tên.' });
    if (!username || username.length < 8) return res.status(400).json({ message: 'Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số).' });
    if (!password || password.length < 6) return res.status(400).json({ message: 'Mật khẩu cần tối thiểu 6 ký tự.' });

    const [existing] = await conn.query('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    if (existing.length) return res.status(409).json({ message: 'Số điện thoại này đã được đăng ký, vui lòng đăng nhập hoặc dùng số khác.' });

    await conn.beginTransaction();

    let memberId = null;
    let trainerId = null;
    if (role === 'member') {
      const [r] = await conn.query(
        'INSERT INTO members (name, phone, email, join_date, goal, level) VALUES (?,?,?,?,?,?)',
        [name.trim(), username, email || null, todayStr(), 'Duy trì sức khỏe', 'Mới bắt đầu']
      );
      memberId = r.insertId;
    } else if (role === 'trainer') {
      const [r] = await conn.query(
        'INSERT INTO trainers (name, phone, specialty, work_days) VALUES (?,?,?,?)',
        [name.trim(), username, 'Chưa cập nhật', '']
      );
      trainerId = r.insertId;
    }

    const pending = role !== 'member' ? 1 : 0;
    const passwordHash = await bcrypt.hash(password, 10);
    const [userResult] = await conn.query(
      'INSERT INTO users (username, password_hash, role, name, member_id, trainer_id, pending) VALUES (?,?,?,?,?,?,?)',
      [username, passwordHash, role, name.trim(), memberId, trainerId, pending]
    );

    await conn.commit();

    if (pending) {
      return res.status(201).json({ pending: true, message: 'Đăng ký thành công! Tài khoản đang chờ Quản lý phê duyệt.', username });
    }
    const token = signToken({ id: userResult.insertId, username, role, name: name.trim(), memberId, trainerId });
    res.status(201).json({
      pending: false,
      token,
      user: { id: userResult.insertId, username, role, name: name.trim(), memberId, trainerId },
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
});

/**
 * POST /api/auth/login
 * body: { username, password }
 * Không cần chọn vai trò khi đăng nhập — vai trò được đọc thẳng từ tài khoản.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Thiếu tên đăng nhập hoặc mật khẩu.' });
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'Không tìm thấy tài khoản. Kiểm tra lại tên đăng nhập hoặc đăng ký mới.' });
    if (user.pending) return res.status(403).json({ message: 'Tài khoản đang chờ Quản lý phê duyệt, chưa thể đăng nhập.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Mật khẩu không đúng.' });

    const payload = { id: user.id, username: user.username, role: user.role, name: user.name, memberId: user.member_id, trainerId: user.trainer_id };
    const token = signToken(payload);
    res.json({ token, user: payload });
  } catch (err) {
    next(err);
  }
});

/** GET /api/auth/me — trả thông tin người dùng hiện tại dựa trên token, để frontend khôi phục phiên khi tải lại trang. */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;

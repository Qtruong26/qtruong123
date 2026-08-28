const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { signToken } = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { todayStr } = require('../utils/dateUtils');

const router = express.Router();

/**
 * POST /api/auth/register
 *
 * Người dùng tự chọn username.
 * Username là duy nhất, một số điện thoại có thể đăng ký nhiều tài khoản.
 */
router.post('/register', async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const { role, name, phone, email, password, username } = req.body;

    const phoneNumber = (phone || '').trim();
    const rawUsername = (username || '').trim();

    if (!['member', 'reception', 'trainer'].includes(role)) {
      return res.status(400).json({
        message: 'Vai trò đăng ký không hợp lệ.'
      });
    }

    if (!rawUsername || rawUsername.length < 3) {
      return res.status(400).json({
        message: 'Vui lòng nhập Tên đăng nhập (tối thiểu 3 ký tự).'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập họ và tên.'
      });
    }

    if (!phoneNumber || phoneNumber.length < 8) {
      return res.status(400).json({
        message: 'Vui lòng nhập số điện thoại hợp lệ (tối thiểu 8 số).'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: 'Mật khẩu cần tối thiểu 6 ký tự.'
      });
    }

    // Kiểm tra xem Username đã tồn tại trong hệ thống chưa
    const [existingUsers] = await conn.query(
      'SELECT id FROM users WHERE username = ?',
      [rawUsername]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        message: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn tên khác.'
      });
    }

    await conn.beginTransaction();

    let memberId = null;
    let trainerId = null;

    // Tạo hội viên
    if (role === 'member') {
      const [r] = await conn.query(
        `INSERT INTO members
        (name, phone, email, join_date, goal, level)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          phoneNumber,
          email || null,
          todayStr(),
          'Duy trì sức khỏe',
          'Mới bắt đầu'
        ]
      );

      memberId = r.insertId;
    }

    // Tạo HLV
    else if (role === 'trainer') {
      const [r] = await conn.query(
        `INSERT INTO trainers
        (name, phone, specialty, work_days)
        VALUES (?, ?, ?, ?)`,
        [
          name.trim(),
          phoneNumber,
          'Chưa cập nhật',
          ''
        ]
      );

      trainerId = r.insertId;
    }

    const pending = role !== 'member' ? 1 : 0;

    // Mã hóa mật khẩu
    const passwordHash = await bcrypt.hash(password, 10);

    const [userResult] = await conn.query(
      `INSERT INTO users
      (username, phone, password_hash, role, name, member_id, trainer_id, pending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rawUsername,
        phoneNumber,
        passwordHash,
        role,
        name.trim(),
        memberId,
        trainerId,
        pending
      ]
    );

    await conn.commit();

    // Tài khoản reception / trainer chờ Admin duyệt
    if (pending) {
      return res.status(201).json({
        pending: true,
        message: 'Đăng ký thành công! Tài khoản đang chờ Quản lý phê duyệt.',
        username: rawUsername,
        phone: phoneNumber
      });
    }

    // Hội viên đăng ký thành công
    const token = signToken({
      id: userResult.insertId,
      username: rawUsername,
      phone: phoneNumber,
      role,
      name: name.trim(),
      memberId,
      trainerId
    });

    return res.status(201).json({
      pending: false,
      token,
      user: {
        id: userResult.insertId,
        username: rawUsername,
        phone: phoneNumber,
        role,
        name: name.trim(),
        memberId,
        trainerId
      }
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
 *
 * Đăng nhập chuẩn bằng:
 * Tên đăng nhập (username) + mật khẩu
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu.'
      });
    }

    const inputUsername = username.trim();

    // Tìm tài khoản chính xác theo Username
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [inputUsername]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.'
      });
    }

    const user = rows[0];

    // Kiểm tra mật khẩu
    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({
        message: 'Tên đăng nhập hoặc mật khẩu không chính xác.'
      });
    }

    if (user.pending) {
      return res.status(403).json({
        message: 'Tài khoản đang chờ Quản lý phê duyệt, chưa thể đăng nhập.'
      });
    }

    const payload = {
      id: user.id,
      username: user.username,
      phone: user.phone,
      role: user.role,
      name: user.name,
      memberId: user.member_id,
      trainerId: user.trainer_id
    };

    const token = signToken(payload);

    return res.json({
      token,
      user: payload
    });

  } catch (err) {
    next(err);
  }
});


/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user
  });
});


module.exports = router;
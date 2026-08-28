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
 * Một số điện thoại có thể đăng ký nhiều tài khoản.
 * Username được tạo tự động và không còn chính là số điện thoại.
 */
router.post('/register', async (req, res, next) => {
  const conn = await pool.getConnection();

  try {
    const { role, name, phone, email, password } = req.body;

    const phoneNumber = (phone || '').trim();

    if (!['member', 'reception', 'trainer'].includes(role)) {
      return res.status(400).json({
        message: 'Vai trò đăng ký không hợp lệ.'
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

    /*
     * Tạo username riêng cho từng tài khoản.
     *
     * Ví dụ:
     * 0123456789_1723456789123
     * 0123456789_1723456790456
     */
    const username = `${phoneNumber}_${Date.now()}`;

    const [userResult] = await conn.query(
      `INSERT INTO users
      (username, phone, password_hash, role, name, member_id, trainer_id, pending)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
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
        username,
        phone: phoneNumber
      });
    }

    // Hội viên đăng ký thành công
    const token = signToken({
      id: userResult.insertId,
      username,
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
        username,
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
 * Đăng nhập bằng:
 * Số điện thoại + mật khẩu
 *
 * Nếu một số điện thoại có nhiều tài khoản,
 * hệ thống sẽ kiểm tra mật khẩu để tìm đúng tài khoản.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: 'Thiếu số điện thoại hoặc mật khẩu.'
      });
    }

    const phoneNumber = username.trim();

    // Lấy tất cả tài khoản có cùng số điện thoại
    const [rows] = await pool.query(
      'SELECT * FROM users WHERE phone = ?',
      [phoneNumber]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: 'Không tìm thấy tài khoản.'
      });
    }

    let user = null;

    // Kiểm tra mật khẩu từng tài khoản
    for (const row of rows) {
      const ok = await bcrypt.compare(
        password,
        row.password_hash
      );

      if (ok) {
        user = row;
        break;
      }
    }

    if (!user) {
      return res.status(401).json({
        message: 'Số điện thoại hoặc mật khẩu không đúng.'
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
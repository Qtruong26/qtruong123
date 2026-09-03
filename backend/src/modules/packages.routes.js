const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { addDays } = require('../utils/dateUtils');
const {
  buildVietQRUrl,
  stripDiacritics,
  BANK_CONFIG
} = require('../utils/vietqr');

const router = express.Router();

router.use(requireAuth);


/* =========================================================
   GÓI TẬP
========================================================= */

/**
 * GET /api/packages
 * Lấy danh sách tất cả gói tập
 */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        id,
        name,
        duration_days AS durationDays,
        price,
        description,
        image_url AS imageUrl
      FROM packages
      ORDER BY duration_days
    `);

    res.json(rows);

  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/packages
 * Chỉ admin được thêm gói
 */
router.post('/', requireRole('admin'), async (req, res, next) => {
  try {

    const {
      name,
      durationDays,
      price,
      description,
      imageUrl
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập tên gói.'
      });
    }

    const days = Number(durationDays) || 30;
    const packagePrice = Number(price) || 0;

    const [result] = await pool.query(
      `
      INSERT INTO packages
      (
        name,
        duration_days,
        price,
        description,
        image_url
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        days,
        packagePrice,
        description || '',
        imageUrl || ''
      ]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Đã thêm gói tập.'
    });

  } catch (err) {
    next(err);
  }
});


/**
 * DELETE /api/packages/:id
 */
router.delete('/:id', requireRole('admin'), async (req, res, next) => {
  try {

    await pool.query(
      'DELETE FROM packages WHERE id = ?',
      [req.params.id]
    );

    res.json({
      message: 'Đã xóa gói.'
    });

  } catch (err) {
    next(err);
  }
});


/* =========================================================
   ĐĂNG KÝ / GIA HẠN GÓI
========================================================= */

/**
 * GET /api/packages/enrollments/list
 */
router.get('/enrollments/list', async (req, res, next) => {
  try {

    let sql = `
      SELECT
        mp.id,
        mp.member_id AS memberId,
        m.name AS memberName,
        mp.package_id AS packageId,
        p.name AS packageName,
        mp.start_date AS startDate,
        mp.end_date AS endDate,
        mp.status,
        mp.paid
      FROM member_packages mp
      JOIN members m ON m.id = mp.member_id
      JOIN packages p ON p.id = mp.package_id
    `;

    const params = [];

    if (req.user.role === 'member') {

      sql += ' WHERE mp.member_id = ?';

      params.push(req.user.memberId);

    } else if (req.query.memberId) {

      sql += ' WHERE mp.member_id = ?';

      params.push(req.query.memberId);
    }

    sql += ' ORDER BY mp.end_date DESC';

    const [rows] = await pool.query(sql, params);

    res.json(rows);

  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/packages/enrollments
 */
router.post('/enrollments', async (req, res, next) => {
  try {

    const {
      packageId,
      startDate,
      method
    } = req.body;

    const memberId =
      req.user.role === 'member'
        ? req.user.memberId
        : req.body.memberId;

    if (!memberId || !packageId || !startDate || !method) {
      return res.status(400).json({
        message: 'Thiếu thông tin đăng ký gói.'
      });
    }

    const [pkgRows] = await pool.query(
      'SELECT * FROM packages WHERE id = ?',
      [packageId]
    );

    const pkg = pkgRows[0];

    if (!pkg) {
      return res.status(404).json({
        message: 'Không tìm thấy gói tập.'
      });
    }


    /* =========================
       CHUYỂN KHOẢN
    ========================= */

    if (method === 'Chuyển khoản') {

      const [memberRows] = await pool.query(
        'SELECT name FROM members WHERE id = ?',
        [memberId]
      );

      const memberName =
        memberRows[0]
          ? memberRows[0].name.replace(/\s+/g, '')
          : '';

      const note =
        `GYM ${memberName} ${pkg.name}`.slice(0, 50);

      const qrUrl =
        buildVietQRUrl(
          pkg.price,
          note
        );

      return res.json({
        requiresPayment: true,
        qrUrl,
        amount: pkg.price,
        note: stripDiacritics(note),
        bank: BANK_CONFIG,

        pendingEnrollment: {
          memberId,
          packageId,
          startDate,
          method
        }
      });
    }


    /* =========================
       THANH TOÁN TRỰC TIẾP
    ========================= */

    const enrollment =
      await finalizeEnrollment(
        memberId,
        packageId,
        startDate,
        method
      );

    res.status(201).json({
      requiresPayment: false,
      ...enrollment,
      message:
        'Đã đăng ký gói và ghi nhận thanh toán.'
    });

  } catch (err) {
    next(err);
  }
});


/**
 * POST /api/packages/enrollments/confirm-payment
 */
router.post(
  '/enrollments/confirm-payment',
  async (req, res, next) => {

    try {

      const {
        memberId,
        packageId,
        startDate,
        method
      } = req.body;

      if (
        req.user.role === 'member' &&
        Number(memberId) !== req.user.memberId
      ) {
        return res.status(403).json({
          message: 'Không hợp lệ.'
        });
      }

      const enrollment =
        await finalizeEnrollment(
          memberId,
          packageId,
          startDate,
          method || 'Chuyển khoản'
        );

      res.status(201).json({
        ...enrollment,
        message:
          'Đã xác nhận thanh toán và đăng ký gói.'
      });

    } catch (err) {
      next(err);
    }
  }
);


/**
 * Hoàn tất đăng ký
 */
async function finalizeEnrollment(
  memberId,
  packageId,
  startDate,
  method
) {

  const [pkgRows] = await pool.query(
    'SELECT * FROM packages WHERE id = ?',
    [packageId]
  );

  const pkg = pkgRows[0];

  if (!pkg) {
    throw new Error('Không tìm thấy gói tập.');
  }

  const endDate =
    addDays(
      startDate,
      pkg.duration_days
    );

  const [mpResult] = await pool.query(
    `
    INSERT INTO member_packages
    (
      member_id,
      package_id,
      start_date,
      end_date,
      status,
      paid
    )
    VALUES (?, ?, ?, ?, "active", ?)
    `,
    [
      memberId,
      packageId,
      startDate,
      endDate,
      pkg.price
    ]
  );


  await pool.query(
    `
    INSERT INTO payments
    (
      member_id,
      package_id,
      amount,
      date,
      method
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      memberId,
      packageId,
      pkg.price,
      startDate,
      method
    ]
  );


  return {
    enrollmentId: mpResult.insertId,
    endDate
  };
}


/* =========================================================
   THANH TOÁN
========================================================= */

/**
 * GET /api/packages/payments/list
 */
router.get('/payments/list', async (req, res, next) => {

  try {

    let sql = `
      SELECT
        pay.id,
        pay.member_id AS memberId,
        m.name AS memberName,
        pay.package_id AS packageId,
        p.name AS packageName,
        pay.amount,
        pay.date,
        pay.method
      FROM payments pay
      JOIN members m
        ON m.id = pay.member_id
      JOIN packages p
        ON p.id = pay.package_id
    `;

    const params = [];

    if (req.user.role === 'member') {

      sql += ' WHERE pay.member_id = ?';

      params.push(
        req.user.memberId
      );

    } else if (req.query.memberId) {

      sql += ' WHERE pay.member_id = ?';

      params.push(
        req.query.memberId
      );
    }

    sql += ' ORDER BY pay.date DESC';

    const [rows] =
      await pool.query(
        sql,
        params
      );

    res.json(rows);

  } catch (err) {
    next(err);
  }
});


module.exports = router;
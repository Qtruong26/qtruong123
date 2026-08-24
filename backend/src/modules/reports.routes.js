const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth, requireRole('admin', 'reception'));

/** GET /api/reports/summary — số liệu tổng quan cho Dashboard */
router.get('/summary', async (req, res, next) => {
  try {
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM members');
    const [[{ newThisMonth }]] = await pool.query(
      'SELECT COUNT(*) AS newThisMonth FROM members WHERE DATEDIFF(CURDATE(), join_date) <= 30'
    );
    const [[{ expiringSoon }]] = await pool.query(
      `SELECT COUNT(*) AS expiringSoon FROM member_packages
       WHERE DATEDIFF(end_date, CURDATE()) BETWEEN 0 AND 7`
    );
    const [[{ expired }]] = await pool.query(
      `SELECT COUNT(*) AS expired FROM member_packages WHERE DATEDIFF(end_date, CURDATE()) < 0`
    );
    const [[{ revenueMonth }]] = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS revenueMonth FROM payments
       WHERE DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`
    );
    const [[{ revenueTotal }]] = await pool.query('SELECT COALESCE(SUM(amount),0) AS revenueTotal FROM payments');
    const [[{ activeCount }]] = await pool.query(
      `SELECT COUNT(*) AS activeCount FROM member_packages WHERE DATEDIFF(end_date, CURDATE()) >= 0`
    );
    const retention = total ? Math.round((activeCount / total) * 100) : 0;

    const [revenueByPackage] = await pool.query(
      `SELECT p.name, COALESCE(SUM(pay.amount),0) AS total FROM packages p
       LEFT JOIN payments pay ON pay.package_id = p.id GROUP BY p.id ORDER BY total DESC`
    );

    const [upcomingSchedules] = await pool.query(
      `SELECT s.date, s.time, COALESCE(m.name, s.note, 'Lớp nhóm') AS who, t.name AS trainerName, s.type
       FROM schedules s LEFT JOIN members m ON m.id=s.member_id JOIN trainers t ON t.id=s.trainer_id
       WHERE s.date >= CURDATE() ORDER BY s.date, s.time LIMIT 5`
    );

    const [urgentRenewals] = await pool.query(
      `SELECT m.name AS memberName, p.name AS packageName, mp.end_date AS endDate,
              DATEDIFF(mp.end_date, CURDATE()) AS daysLeft
       FROM member_packages mp JOIN members m ON m.id=mp.member_id JOIN packages p ON p.id=mp.package_id
       WHERE DATEDIFF(mp.end_date, CURDATE()) <= 7 ORDER BY mp.end_date LIMIT 10`
    );

    res.json({
      total, newThisMonth, expiringSoon, expired, revenueMonth, revenueTotal, retention,
      revenueByPackage, upcomingSchedules, urgentRenewals,
    });
  } catch (err) { next(err); }
});

/** GET /api/reports/export/members — dữ liệu thô để FE tự chuyển thành CSV */
router.get('/export/members', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT name, phone, email, goal, join_date AS joinDate FROM members ORDER BY name');
    res.json(rows);
  } catch (err) { next(err); }
});

/** GET /api/reports/export/schedules */
router.get('/export/schedules', async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.date, s.time, COALESCE(m.name, s.note, 'Lớp nhóm') AS who, t.name AS trainerName, s.type, s.status
       FROM schedules s LEFT JOIN members m ON m.id=s.member_id JOIN trainers t ON t.id=s.trainer_id
       ORDER BY s.date, s.time`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;

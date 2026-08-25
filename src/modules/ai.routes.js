const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const ai = require('../utils/ai');

const router = express.Router();
router.use(requireAuth);

async function logAI(kind, input, output) {
  await pool.query('INSERT INTO ai_logs (kind, input_json, output_json) VALUES (?,?,?)', [kind, JSON.stringify(input), JSON.stringify(output)]);
}

/** POST /api/ai/suggest-plan  body: { goal, level, availability: ["T2","T4",...] } */
router.post('/suggest-plan', async (req, res, next) => {
  try {
    const { goal, level, availability } = req.body;
    const plan = ai.suggestPlan(goal, availability, level);
    await logAI('suggest_plan', { goal, level, availability }, plan);
    res.json({ plan });
  } catch (err) { next(err); }
});

/** GET /api/ai/reminder/:memberId — sinh 1 tin nhắn nhắc lịch/gia hạn cho 1 hội viên */
router.get('/reminder/:memberId', requireRole('admin', 'reception'), async (req, res, next) => {
  try {
    const [[member]] = await pool.query('SELECT * FROM members WHERE id = ?', [req.params.memberId]);
    if (!member) return res.status(404).json({ message: 'Không tìm thấy hội viên.' });
    const [pkgRows] = await pool.query(
      `SELECT mp.*, p.name AS packageName FROM member_packages mp JOIN packages p ON p.id=mp.package_id
       WHERE mp.member_id=? ORDER BY mp.end_date DESC LIMIT 1`, [req.params.memberId]
    );
    const mp = pkgRows[0] || null;
    const message = ai.suggestReminderMessage(member, mp, mp ? mp.packageName : null);
    await logAI('reminder', { memberId: req.params.memberId }, message);
    res.json({ message });
  } catch (err) { next(err); }
});

/** GET /api/ai/reminders/bulk — sinh tin nhắn cho mọi hội viên sắp/đã hết hạn (≤7 ngày) */
router.get('/reminders/bulk', requireRole('admin', 'reception'), async (req, res, next) => {
  try {
    const [members] = await pool.query('SELECT * FROM members');
    const results = [];
    for (const member of members) {
      const [pkgRows] = await pool.query(
        `SELECT mp.*, p.name AS packageName FROM member_packages mp JOIN packages p ON p.id=mp.package_id
         WHERE mp.member_id=? ORDER BY mp.end_date DESC LIMIT 1`, [member.id]
      );
      const mp = pkgRows[0] || null;
      const d = mp ? Math.round((new Date(mp.end_date) - new Date()) / 86400000) : -1;
      if (d <= 7) {
        const message = ai.suggestReminderMessage(member, mp, mp ? mp.packageName : null);
        results.push({ memberId: member.id, memberName: member.name, message });
      }
    }
    await logAI('reminder_bulk', {}, { count: results.length });
    res.json(results);
  } catch (err) { next(err); }
});

/** GET /api/ai/progress-summary/:memberId */
router.get('/progress-summary/:memberId', async (req, res, next) => {
  try {
    if (req.user.role === 'member' && Number(req.params.memberId) !== req.user.memberId) {
      return res.status(403).json({ message: 'Bạn chỉ xem được tiến độ của chính mình.' });
    }
    const [rows] = await pool.query('SELECT date, note FROM attendance WHERE member_id = ?', [req.params.memberId]);
    const summary = ai.summarizeProgress(rows);
    await logAI('progress_summary', { memberId: req.params.memberId }, summary);
    res.json(summary);
  } catch (err) { next(err); }
});

/** POST /api/ai/chat — chatbot hỏi đáp cho hội viên (chỉ role member) */
router.post('/chat', requireRole('member'), async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) return res.status(400).json({ message: 'Vui lòng nhập câu hỏi.' });

    const [[member]] = await pool.query('SELECT * FROM members WHERE id = ?', [req.user.memberId]);
    const [pkgRows] = await pool.query(
      `SELECT mp.*, p.name AS packageName FROM member_packages mp JOIN packages p ON p.id=mp.package_id
       WHERE mp.member_id=? ORDER BY mp.end_date DESC LIMIT 1`, [req.user.memberId]
    );
    const activePackage = pkgRows[0] || null;
    const [scheduleRows] = await pool.query(
      `SELECT s.date, s.time, s.type, t.name AS trainerName FROM schedules s JOIN trainers t ON t.id=s.trainer_id
       WHERE s.member_id=? AND s.date >= CURDATE() ORDER BY s.date, s.time LIMIT 1`, [req.user.memberId]
    );
    let trainerName = null;
    if (member.trainer_id) {
      const [[t]] = await pool.query('SELECT name FROM trainers WHERE id = ?', [member.trainer_id]);
      trainerName = t ? t.name : null;
    }

    const answer = ai.answerMemberQuestion(question, {
      member,
      activePackage,
      packageName: activePackage ? activePackage.packageName : null,
      nextSchedule: scheduleRows[0] || null,
      trainerName,
      hasTrainer: !!member.trainer_id,
    });

    await pool.query('INSERT INTO ai_chat_logs (member_id, sender, text) VALUES (?,"user",?)', [req.user.memberId, question]);
    await pool.query('INSERT INTO ai_chat_logs (member_id, sender, text) VALUES (?,"bot",?)', [req.user.memberId, answer]);
    await logAI('member_chat', { memberId: req.user.memberId, question }, answer);

    res.json({ answer });
  } catch (err) { next(err); }
});

/** GET /api/ai/chat/history — lịch sử hội thoại chatbot của hội viên hiện tại */
router.get('/chat/history', requireRole('member'), async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, sender, text, created_at AS date FROM ai_chat_logs WHERE member_id = ? ORDER BY created_at',
      [req.user.memberId]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;

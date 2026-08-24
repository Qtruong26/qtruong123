const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { todayStr } = require('../utils/dateUtils');

const router = express.Router();
router.use(requireAuth);

/** GET /api/lesson-plans — trainer thấy giáo án mình tạo; hội viên thấy giáo án được giao cho mình */
router.get('/', async (req, res, next) => {
  try {
    let sql = `SELECT lp.id, lp.trainer_id AS trainerId, t.name AS trainerName, lp.member_id AS memberId,
                      m.name AS memberName, lp.title, lp.goal, lp.created_date AS createdDate
               FROM lesson_plans lp
               JOIN trainers t ON t.id = lp.trainer_id
               JOIN members m ON m.id = lp.member_id`;
    const params = [];
    if (req.user.role === 'trainer') { sql += ' WHERE lp.trainer_id = ?'; params.push(req.user.trainerId); }
    else if (req.user.role === 'member') { sql += ' WHERE lp.member_id = ?'; params.push(req.user.memberId); }
    sql += ' ORDER BY lp.created_date DESC';
    const [plans] = await pool.query(sql, params);

    // Đếm số buổi tập cho mỗi giáo án (để hiển thị card danh sách mà không cần load chi tiết)
    for (const p of plans) {
      const [[{ cnt }]] = await pool.query('SELECT COUNT(*) AS cnt FROM lesson_plan_sessions WHERE plan_id = ?', [p.id]);
      p.sessionCount = cnt;
    }
    res.json(plans);
  } catch (err) { next(err); }
});

/** GET /api/lesson-plans/:id — chi tiết đầy đủ: buổi tập + bài tập trong từng buổi */
router.get('/:id', async (req, res, next) => {
  try {
    const [planRows] = await pool.query(
      `SELECT lp.id, lp.trainer_id AS trainerId, t.name AS trainerName, lp.member_id AS memberId,
              m.name AS memberName, lp.title, lp.goal, lp.created_date AS createdDate
       FROM lesson_plans lp JOIN trainers t ON t.id=lp.trainer_id JOIN members m ON m.id=lp.member_id
       WHERE lp.id = ?`, [req.params.id]
    );
    const plan = planRows[0];
    if (!plan) return res.status(404).json({ message: 'Không tìm thấy giáo án.' });

    const isOwnerTrainer = req.user.role === 'trainer' && plan.trainerId === req.user.trainerId;
    const isOwnerMember = req.user.role === 'member' && plan.memberId === req.user.memberId;
    if (!['admin'].includes(req.user.role) && !isOwnerTrainer && !isOwnerMember) {
      return res.status(403).json({ message: 'Bạn không có quyền xem giáo án này.' });
    }

    const [sessions] = await pool.query(
      'SELECT id, label FROM lesson_plan_sessions WHERE plan_id = ? ORDER BY sort_order, id', [req.params.id]
    );
    for (const s of sessions) {
      const [items] = await pool.query(
        `SELECT i.id, i.exercise_id AS exerciseId, e.name AS exerciseName, e.muscle_group AS muscleGroup,
                i.sets, i.reps, i.note
         FROM lesson_plan_items i JOIN exercises e ON e.id = i.exercise_id
         WHERE i.session_id = ?`, [s.id]
      );
      s.items = items;
    }
    res.json({ ...plan, sessions, canEdit: isOwnerTrainer });
  } catch (err) { next(err); }
});

/** POST /api/lesson-plans — trainer tạo giáo án mới cho học viên của mình */
router.post('/', requireRole('trainer'), async (req, res, next) => {
  try {
    const { memberId, title, goal } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ message: 'Vui lòng nhập tên giáo án.' });
    const [r] = await pool.query(
      'INSERT INTO lesson_plans (trainer_id, member_id, title, goal, created_date) VALUES (?,?,?,?,?)',
      [req.user.trainerId, memberId, title.trim(), goal || '', todayStr()]
    );
    res.status(201).json({ id: r.insertId, message: 'Đã tạo giáo án.' });
  } catch (err) { next(err); }
});

async function assertPlanOwner(req, res, planId) {
  const [rows] = await pool.query('SELECT trainer_id FROM lesson_plans WHERE id = ?', [planId]);
  if (!rows.length) { res.status(404).json({ message: 'Không tìm thấy giáo án.' }); return false; }
  if (rows[0].trainer_id !== req.user.trainerId) { res.status(403).json({ message: 'Bạn không có quyền sửa giáo án này.' }); return false; }
  return true;
}

/** POST /api/lesson-plans/:id/sessions — thêm buổi tập */
router.post('/:id/sessions', requireRole('trainer'), async (req, res, next) => {
  try {
    if (!(await assertPlanOwner(req, res, req.params.id))) return;
    const { label } = req.body;
    if (!label || !label.trim()) return res.status(400).json({ message: 'Vui lòng nhập tên buổi tập.' });
    const [r] = await pool.query('INSERT INTO lesson_plan_sessions (plan_id, label) VALUES (?,?)', [req.params.id, label.trim()]);
    res.status(201).json({ id: r.insertId, message: 'Đã thêm buổi tập.' });
  } catch (err) { next(err); }
});

/** DELETE /api/lesson-plans/:planId/sessions/:sessionId */
router.delete('/:planId/sessions/:sessionId', requireRole('trainer'), async (req, res, next) => {
  try {
    if (!(await assertPlanOwner(req, res, req.params.planId))) return;
    await pool.query('DELETE FROM lesson_plan_sessions WHERE id = ?', [req.params.sessionId]);
    res.json({ message: 'Đã xóa buổi tập.' });
  } catch (err) { next(err); }
});

/** POST /api/lesson-plans/:planId/sessions/:sessionId/items — thêm bài tập vào buổi */
router.post('/:planId/sessions/:sessionId/items', requireRole('trainer'), async (req, res, next) => {
  try {
    if (!(await assertPlanOwner(req, res, req.params.planId))) return;
    const { exerciseId, sets, reps, note } = req.body;
    if (!exerciseId) return res.status(400).json({ message: 'Vui lòng chọn bài tập.' });
    const [r] = await pool.query(
      'INSERT INTO lesson_plan_items (session_id, exercise_id, sets, reps, note) VALUES (?,?,?,?,?)',
      [req.params.sessionId, exerciseId, Number(sets) || 1, reps || '', note || '']
    );
    res.status(201).json({ id: r.insertId, message: 'Đã thêm bài tập vào buổi.' });
  } catch (err) { next(err); }
});

/** DELETE /api/lesson-plans/:planId/sessions/:sessionId/items/:itemId */
router.delete('/:planId/sessions/:sessionId/items/:itemId', requireRole('trainer'), async (req, res, next) => {
  try {
    if (!(await assertPlanOwner(req, res, req.params.planId))) return;
    await pool.query('DELETE FROM lesson_plan_items WHERE id = ?', [req.params.itemId]);
    res.json({ message: 'Đã xóa bài tập.' });
  } catch (err) { next(err); }
});

module.exports = router;

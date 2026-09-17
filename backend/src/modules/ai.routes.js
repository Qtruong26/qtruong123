const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const ai = require('../utils/ai');

const router = express.Router();

router.use(requireAuth);


/* =========================================================
   LOG AI
   ========================================================= */

async function logAI(kind, input, output) {
  await pool.query(
    'INSERT INTO ai_logs (kind, input_json, output_json) VALUES (?, ?, ?)',
    [
      kind,
      JSON.stringify(input),
      JSON.stringify(output)
    ]
  );
}


/* =========================================================
   POST /api/ai/suggest-plan
   Gợi ý lịch tập bằng Gemini
   ========================================================= */

router.post(
  '/suggest-plan',
  async (req, res, next) => {
    try {
      const {
        goal,
        level,
        availability
      } = req.body;

      if (!goal || !level) {
        return res.status(400).json({
          message:
            'Vui lòng cung cấp mục tiêu và mức độ.'
        });
      }

      if (
        !Array.isArray(availability) ||
        availability.length === 0
      ) {
        return res.status(400).json({
          message:
            'Vui lòng chọn ít nhất một ngày tập.'
        });
      }

      const plan =
        await ai.suggestPlan(
          goal,
          availability,
          level
        );

      await logAI(
        'suggest_plan',
        {
          goal,
          level,
          availability
        },
        plan
      );

      res.json({
        plan
      });

    } catch (err) {
      next(err);
    }
  }
);


/* =========================================================
   GET /api/ai/reminder/:memberId
   Tạo tin nhắn nhắc gia hạn
   ========================================================= */

router.get(
  '/reminder/:memberId',
  requireRole('admin', 'reception'),
  async (req, res, next) => {
    try {
      const memberId =
        Number(req.params.memberId);

      const [[member]] =
        await pool.query(
          'SELECT * FROM members WHERE id = ?',
          [memberId]
        );

      if (!member) {
        return res.status(404).json({
          message:
            'Không tìm thấy hội viên.'
        });
      }

      const [pkgRows] =
        await pool.query(
          `
          SELECT
            mp.*,
            p.name AS packageName
          FROM member_packages mp
          JOIN packages p
            ON p.id = mp.package_id
          WHERE mp.member_id = ?
          ORDER BY mp.end_date DESC
          LIMIT 1
          `,
          [memberId]
        );

      const mp =
        pkgRows[0] || null;

      const message =
        await ai.suggestReminderMessage(
          member,
          mp,
          mp ? mp.packageName : null
        );

      await logAI(
        'reminder',
        {
          memberId
        },
        message
      );

      res.json({
        message
      });

    } catch (err) {
      next(err);
    }
  }
);


/* =========================================================
   GET /api/ai/reminders/bulk
   Tạo tin nhắn cho hội viên cần gia hạn
   ========================================================= */

router.get(
  '/reminders/bulk',
  requireRole('admin', 'reception'),
  async (req, res, next) => {
    try {
      const [members] =
        await pool.query(
          'SELECT * FROM members'
        );

      const results = [];

      for (const member of members) {

        const [pkgRows] =
          await pool.query(
            `
            SELECT
              mp.*,
              p.name AS packageName
            FROM member_packages mp
            JOIN packages p
              ON p.id = mp.package_id
            WHERE mp.member_id = ?
            ORDER BY mp.end_date DESC
            LIMIT 1
            `,
            [member.id]
          );

        const mp =
          pkgRows[0] || null;

        let d = -1;

        if (mp && mp.end_date) {
          d = Math.round(
            (
              new Date(mp.end_date) -
              new Date()
            ) / 86400000
          );
        }

        /*
         * Chỉ tạo tin nhắn nếu:
         * - chưa có gói
         * - đã hết hạn
         * - hoặc còn <= 7 ngày
         */

        if (!mp || d <= 7) {

          const message =
            await ai.suggestReminderMessage(
              member,
              mp,
              mp
                ? mp.packageName
                : null
            );

          results.push({
            memberId: member.id,
            memberName: member.name,
            message
          });
        }
      }

      await logAI(
        'reminder_bulk',
        {},
        {
          count: results.length
        }
      );

      res.json(results);

    } catch (err) {
      next(err);
    }
  }
);


/* =========================================================
   GET /api/ai/progress-summary/:memberId
   Tóm tắt tiến độ bằng Gemini
   ========================================================= */

router.get(
  '/progress-summary/:memberId',
  async (req, res, next) => {
    try {

      const memberId =
        Number(req.params.memberId);

      /*
       * Member chỉ được xem chính mình.
       */

      if (
        req.user.role === 'member' &&
        memberId !==
          Number(req.user.memberId)
      ) {
        return res.status(403).json({
          message:
            'Bạn chỉ xem được tiến độ của chính mình.'
        });
      }

      const [rows] =
        await pool.query(
          `
          SELECT
            date,
            note
          FROM attendance
          WHERE member_id = ?
          ORDER BY date
          `,
          [memberId]
        );

      const summary =
        await ai.summarizeProgress(
          rows
        );

      await logAI(
        'progress_summary',
        {
          memberId
        },
        summary
      );

      res.json(summary);

    } catch (err) {
      next(err);
    }
  }
);


/* =========================================================
   POST /api/ai/chat
   Chatbot Gemini thật
   Chỉ dành cho member
   ========================================================= */

router.post(
  '/chat',
  requireRole('member'),
  async (req, res, next) => {

    try {

      const { question } =
        req.body;

      if (
        !question ||
        !String(question).trim()
      ) {
        return res.status(400).json({
          message:
            'Vui lòng nhập câu hỏi.'
        });
      }

      const memberId =
        Number(req.user.memberId);


      /* -----------------------------------------------------
         Lấy thông tin hội viên
         ----------------------------------------------------- */

      const [[member]] =
        await pool.query(
          `
          SELECT *
          FROM members
          WHERE id = ?
          `,
          [memberId]
        );

      if (!member) {
        return res.status(404).json({
          message:
            'Không tìm thấy thông tin hội viên.'
        });
      }


      /* -----------------------------------------------------
         Lấy gói tập hiện tại
         ----------------------------------------------------- */

      const [pkgRows] =
        await pool.query(
          `
          SELECT
            mp.*,
            p.name AS packageName
          FROM member_packages mp
          JOIN packages p
            ON p.id = mp.package_id
          WHERE mp.member_id = ?
          ORDER BY mp.end_date DESC
          LIMIT 1
          `,
          [memberId]
        );

      const activePackage =
        pkgRows[0] || null;


      /* -----------------------------------------------------
         Lấy lịch tập tiếp theo
         ----------------------------------------------------- */

      const [scheduleRows] =
        await pool.query(
          `
          SELECT
            s.date,
            s.time,
            s.type,
            t.name AS trainerName
          FROM schedules s
          JOIN trainers t
            ON t.id = s.trainer_id
          WHERE s.member_id = ?
            AND s.date >= CURDATE()
          ORDER BY
            s.date,
            s.time
          LIMIT 1
          `,
          [memberId]
        );


      /* -----------------------------------------------------
         Lấy HLV
         ----------------------------------------------------- */

      let trainerName = null;

      if (member.trainer_id) {

        const [[trainer]] =
          await pool.query(
            `
            SELECT name
            FROM trainers
            WHERE id = ?
            `,
            [member.trainer_id]
          );

        trainerName =
          trainer
            ? trainer.name
            : null;
      }


      /* -----------------------------------------------------
         Gửi câu hỏi + dữ liệu hệ thống cho Gemini
         ----------------------------------------------------- */

      const answer =
        await ai.answerMemberQuestion(
          question,
          {
            member,

            activePackage,

            packageName:
              activePackage
                ? activePackage.packageName
                : null,

            nextSchedule:
              scheduleRows[0] || null,

            trainerName,

            hasTrainer:
              !!member.trainer_id
          }
        );


      /* -----------------------------------------------------
         Lưu lịch sử chat
         ----------------------------------------------------- */

      await pool.query(
        `
        INSERT INTO ai_chat_logs
          (member_id, sender, text)
        VALUES
          (?, 'user', ?)
        `,
        [
          memberId,
          question
        ]
      );

      await pool.query(
        `
        INSERT INTO ai_chat_logs
          (member_id, sender, text)
        VALUES
          (?, 'bot', ?)
        `,
        [
          memberId,
          answer
        ]
      );


      /* -----------------------------------------------------
         Lưu log AI
         ----------------------------------------------------- */

      await logAI(
        'member_chat',
        {
          memberId,
          question
        },
        answer
      );


      /* -----------------------------------------------------
         Trả kết quả
         ----------------------------------------------------- */

      res.json({
        answer
      });

    } catch (err) {
      next(err);
    }
  }
);


/* =========================================================
   GET /api/ai/chat/history
   Lấy lịch sử chatbot
   ========================================================= */

router.get(
  '/chat/history',
  requireRole('member'),
  async (req, res, next) => {

    try {

      const [rows] =
        await pool.query(
          `
          SELECT
            id,
            sender,
            text,
            created_at AS date
          FROM ai_chat_logs
          WHERE member_id = ?
          ORDER BY created_at ASC
          `,
          [req.user.memberId]
        );

      res.json(rows);

    } catch (err) {
      next(err);
    }
  }
);


module.exports = router;
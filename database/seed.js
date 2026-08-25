/**
 * Nạp dữ liệu mẫu (demo) cho FitCore.
 * Chạy: npm run seed   (xem script trong package.json)
 *
 * Script này KHÔNG lưu mật khẩu dạng plaintext — mật khẩu demo "123456"
 * được băm bằng bcryptjs trước khi insert vào bảng users, đúng chuẩn bảo mật.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

async function seed() {
  const conn = await pool.getConnection();
  try {
    console.log('→ Xóa dữ liệu cũ (nếu có)...');
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const tables = [
      'ai_logs', 'ai_chat_logs', 'messages', 'progress_notes',
      'lesson_plan_items', 'lesson_plan_sessions', 'lesson_plans',
      'exercises', 'attendance', 'schedules', 'payments',
      'member_packages', 'users', 'members', 'trainers', 'packages',
    ];
    for (const t of tables) await conn.query(`TRUNCATE TABLE ${t}`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('→ Tạo huấn luyện viên...');
    const [t1] = await conn.query(
      `INSERT INTO trainers (name, phone, specialty, work_days) VALUES (?,?,?,?)`,
      ['Lê Huấn Luyện', '0901111222', 'Giảm cân, Cardio', 'T2,T4,T6']
    );
    const [t2] = await conn.query(
      `INSERT INTO trainers (name, phone, specialty, work_days) VALUES (?,?,?,?)`,
      ['Đỗ Sức Mạnh', '0902222333', 'Tăng cơ, Powerlifting', 'T3,T5,T7']
    );
    const trainerId1 = t1.insertId, trainerId2 = t2.insertId;

    console.log('→ Tạo hội viên...');
    const today = new Date();
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const daysFromNow = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

    const [m1] = await conn.query(
      `INSERT INTO members (name, phone, email, join_date, goal, level, trainer_id) VALUES (?,?,?,?,?,?,?)`,
      ['Phạm Hội Viên', '0912345678', 'hv1@mail.com', daysAgo(40), 'Giảm cân', 'Mới bắt đầu', trainerId1]
    );
    const [m2] = await conn.query(
      `INSERT INTO members (name, phone, email, join_date, goal, level, trainer_id) VALUES (?,?,?,?,?,?,?)`,
      ['Vũ Thanh Mai', '0913456789', 'mai@mail.com', daysAgo(10), 'Tăng cơ', 'Trung bình', trainerId1]
    );
    const [m3] = await conn.query(
      `INSERT INTO members (name, phone, email, join_date, goal, level, trainer_id) VALUES (?,?,?,?,?,?,?)`,
      ['Hoàng Tuấn Anh', '0914567890', 'tuananh@mail.com', daysAgo(200), 'Duy trì sức khỏe', 'Nâng cao', null]
    );
    const memberId1 = m1.insertId, memberId2 = m2.insertId, memberId3 = m3.insertId;

    console.log('→ Tạo tài khoản đăng nhập (mật khẩu demo: 123456)...');
    const passwordHash = await bcrypt.hash('Truong1234@', 10);
    await conn.query(
      `INSERT INTO users (username, password_hash, role, name, member_id, trainer_id, pending) VALUES
       (?,?,?,?,?,?,0), (?,?,?,?,?,?,0), (?,?,?,?,?,?,0), (?,?,?,?,?,?,0)`,
      [
        'admin', passwordHash, 'admin', 'Diep Quang Truong', null, null,
        'letan', passwordHash, 'reception', 'Trần Lễ Tân', null, null,
        'hlv1', passwordHash, 'trainer', 'Lê Huấn Luyện', null, trainerId1,
        'hv1', passwordHash, 'member', 'Phạm Hội Viên', memberId1, null,
      ]
    );

    console.log('→ Tạo gói tập...');
    const [p1] = await conn.query(`INSERT INTO packages (name, duration_days, price, description) VALUES (?,?,?,?)`,
      ['Gói 1 tháng', 30, 600000, 'Tập tự do, không PT']);
    const [p2] = await conn.query(`INSERT INTO packages (name, duration_days, price, description) VALUES (?,?,?,?)`,
      ['Gói 3 tháng', 90, 1500000, 'Tập tự do, không PT']);
    const [p3] = await conn.query(`INSERT INTO packages (name, duration_days, price, description) VALUES (?,?,?,?)`,
      ['Gói 6 tháng + PT', 180, 5400000, 'Kèm 12 buổi PT cá nhân']);
    await conn.query(`INSERT INTO packages (name, duration_days, price, description) VALUES (?,?,?,?)`,
      ['Gói 12 tháng VIP', 365, 9000000, 'Không giới hạn lớp nhóm + PT']);
    const packageId1 = p1.insertId, packageId2 = p2.insertId, packageId3 = p3.insertId;

    console.log('→ Đăng ký gói tập, thanh toán...');
    await conn.query(
      `INSERT INTO member_packages (member_id, package_id, start_date, end_date, status, paid) VALUES (?,?,?,?,?,?)`,
      [memberId1, packageId1, daysAgo(25), daysFromNow(5), 'active', 600000]
    );
    await conn.query(
      `INSERT INTO member_packages (member_id, package_id, start_date, end_date, status, paid) VALUES (?,?,?,?,?,?)`,
      [memberId2, packageId3, daysAgo(8), daysFromNow(172), 'active', 5400000]
    );
    await conn.query(
      `INSERT INTO member_packages (member_id, package_id, start_date, end_date, status, paid) VALUES (?,?,?,?,?,?)`,
      [memberId3, packageId2, daysAgo(95), daysAgo(5), 'expired', 1500000]
    );
    await conn.query(
      `INSERT INTO payments (member_id, package_id, amount, date, method) VALUES
       (?,?,?,?,?), (?,?,?,?,?), (?,?,?,?,?)`,
      [
        memberId1, packageId1, 600000, daysAgo(25), 'Tiền mặt',
        memberId2, packageId3, 5400000, daysAgo(8), 'Chuyển khoản',
        memberId3, packageId2, 1500000, daysAgo(95), 'Chuyển khoản',
      ]
    );

    console.log('→ Tạo lịch tập, điểm danh...');
    await conn.query(
      `INSERT INTO schedules (member_id, trainer_id, date, time, type, status, note) VALUES
       (?,?,?,?,?,?,NULL), (?,?,?,?,?,?,NULL), (NULL,?,?,?,?,?,?)`,
      [
        memberId1, trainerId1, daysFromNow(1), '18:00', 'Cá nhân', 'Đã đặt',
        memberId2, trainerId1, daysFromNow(2), '19:00', 'Cá nhân', 'Đã đặt',
        trainerId2, daysFromNow(1), '17:00', 'Nhóm', 'Đã đặt', 'Lớp HIIT nhóm',
      ]
    );
    await conn.query(
      `INSERT INTO attendance (member_id, date, time, note) VALUES
       (?,?,?,?), (?,?,?,?), (?,?,?,?), (?,?,?,?)`,
      [
        memberId1, daysAgo(1), '18:05', 'Tập cardio 40 phút',
        memberId1, daysAgo(3), '17:50', 'Tập tay + bụng',
        memberId2, daysAgo(1), '19:10', 'PT: squat, deadlift — tiến bộ tốt',
        memberId2, daysAgo(4), '19:00', 'PT: bench press, tăng tạ 5kg',
      ]
    );

    console.log('→ Tạo thư viện bài tập...');
    const exerciseRows = [
      ['Squat', 'Chân', 'Bài tập cơ bản cho đùi và mông', 4, '10-12'],
      ['Bench Press', 'Ngực', 'Đẩy tạ đòn cho ngực', 4, '8-10'],
      ['Deadlift', 'Lưng / Toàn thân', 'Bài tập tổng hợp sức mạnh', 3, '6-8'],
      ['Plank', 'Bụng / Core', 'Giữ tư thế plank tăng sức bền core', 3, '45-60 giây'],
      ['Pull-up', 'Lưng / Tay', 'Kéo xà đơn', 3, '6-10'],
      ['Chạy bộ (Cardio)', 'Tim mạch', 'Chạy nhẹ hoặc chạy bền', 1, '20-30 phút'],
    ];
    const exerciseIds = [];
    for (const row of exerciseRows) {
      const [r] = await conn.query(
        `INSERT INTO exercises (name, muscle_group, description, sets, reps) VALUES (?,?,?,?,?)`, row
      );
      exerciseIds.push(r.insertId);
    }

    console.log('→ Tạo giáo án mẫu...');
    const [plan] = await conn.query(
      `INSERT INTO lesson_plans (trainer_id, member_id, title, goal, created_date) VALUES (?,?,?,?,?)`,
      [trainerId1, memberId1, 'Giáo án giảm cân 4 tuần', 'Giảm cân', daysAgo(20)]
    );
    const [session] = await conn.query(
      `INSERT INTO lesson_plan_sessions (plan_id, label, sort_order) VALUES (?,?,0)`,
      [plan.insertId, 'Buổi 1 — Cardio & Core']
    );
    await conn.query(
      `INSERT INTO lesson_plan_items (session_id, exercise_id, sets, reps, note) VALUES (?,?,?,?,?), (?,?,?,?,?)`,
      [
        session.insertId, exerciseIds[5], 1, '25 phút', 'Giữ nhịp tim vừa phải',
        session.insertId, exerciseIds[3], 3, '45 giây', '',
      ]
    );

    console.log('→ Tạo ghi chú tiến độ, tin nhắn mẫu...');
    await conn.query(
      `INSERT INTO progress_notes (member_id, trainer_id, date, note) VALUES (?,?,?,?)`,
      [memberId1, trainerId1, daysAgo(3), 'Thể lực cải thiện rõ, có thể tăng cường độ cardio.']
    );
    await conn.query(
      `INSERT INTO messages (member_id, trainer_id, sender, text) VALUES (?,?,?,?), (?,?,?,?)`,
      [
        memberId1, trainerId1, 'trainer', 'Chào bạn, tuần này nhớ tập đủ 3 buổi nhé!',
        memberId1, trainerId1, 'member', 'Dạ vâng huấn luyện viên, em sẽ cố gắng ạ.',
      ]
    );

    console.log('✔ Nạp dữ liệu mẫu thành công!');
    console.log('  Tài khoản demo (mật khẩu: 123456): admin / letan / hlv1 / hv1');
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('✘ Lỗi khi nạp dữ liệu mẫu:', err);
  process.exit(1);
});

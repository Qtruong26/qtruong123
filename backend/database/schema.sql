-- =========================================================================
-- FitCore — Hệ thống quản lý trung tâm thể hình có tích hợp AI
-- Lược đồ cơ sở dữ liệu MySQL
-- =========================================================================
-- Chạy: mysql -u root -p < schema.sql
-- (hoặc: SOURCE schema.sql;  bên trong MySQL client sau khi đã USE đúng database)

CREATE DATABASE IF NOT EXISTS fitcore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE fitcore;

-- -------------------------------------------------------------------------
-- Huấn luyện viên
-- -------------------------------------------------------------------------
CREATE TABLE trainers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    specialty VARCHAR(255),
    work_days VARCHAR(50) DEFAULT '', -- vd: "T2,T4,T6"
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Hội viên
-- -------------------------------------------------------------------------
CREATE TABLE members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(120),
    join_date DATE NOT NULL,
    goal VARCHAR(60) DEFAULT 'Duy trì sức khỏe',
    level VARCHAR(30) DEFAULT 'Mới bắt đầu',
    trainer_id INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id) ON DELETE SET NULL
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Tài khoản đăng nhập (admin / reception / trainer / member)
-- -------------------------------------------------------------------------
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(60) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM(
        'admin',
        'reception',
        'trainer',
        'member'
    ) NOT NULL,
    name VARCHAR(120) NOT NULL,
    member_id INT NULL,
    trainer_id INT NULL,
    pending TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Gói tập
-- -------------------------------------------------------------------------
CREATE TABLE packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    duration_days INT NOT NULL,
    price DECIMAL(12, 0) NOT NULL,
    description VARCHAR(255)
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Đăng ký gói tập theo hội viên
-- -------------------------------------------------------------------------
CREATE TABLE member_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    package_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'expired') NOT NULL DEFAULT 'active',
    paid DECIMAL(12, 0) NOT NULL DEFAULT 0,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Thanh toán
-- -------------------------------------------------------------------------
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    package_id INT NOT NULL,
    amount DECIMAL(12, 0) NOT NULL,
    date DATE NOT NULL,
    method ENUM(
        'Tiền mặt',
        'Chuyển khoản',
        'Thẻ'
    ) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Lịch tập / lịch hẹn (cá nhân hoặc lớp nhóm)
-- -------------------------------------------------------------------------
CREATE TABLE schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NULL, -- NULL nếu là lớp nhóm không gắn 1 hội viên cụ thể
    trainer_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    type ENUM('Cá nhân', 'Nhóm') NOT NULL DEFAULT 'Cá nhân',
    status VARCHAR(30) NOT NULL DEFAULT 'Đã đặt',
    note VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Check-in / Check-out
-- -------------------------------------------------------------------------
CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    check_out_time TIME NULL,
    note VARCHAR(255),
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Thư viện bài tập
-- -------------------------------------------------------------------------
CREATE TABLE exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    muscle_group VARCHAR(80),
    description VARCHAR(255),
    sets INT DEFAULT 3,
    reps VARCHAR(40)
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Giáo án tập luyện (kèm buổi tập + bài tập trong từng buổi)
-- -------------------------------------------------------------------------
CREATE TABLE lesson_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    trainer_id INT NOT NULL,
    member_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    goal VARCHAR(60),
    created_date DATE NOT NULL,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE lesson_plan_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    label VARCHAR(150) NOT NULL,
    sort_order INT DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES lesson_plans (id) ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE lesson_plan_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    exercise_id INT NOT NULL,
    sets INT DEFAULT 3,
    reps VARCHAR(40),
    note VARCHAR(255),
    FOREIGN KEY (session_id) REFERENCES lesson_plan_sessions (id) ON DELETE CASCADE,
    FOREIGN KEY (exercise_id) REFERENCES exercises (id) ON DELETE RESTRICT
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Ghi chú tiến độ của PT dành cho học viên
-- -------------------------------------------------------------------------
CREATE TABLE progress_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    trainer_id INT NOT NULL,
    date DATE NOT NULL,
    note TEXT NOT NULL,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Tin nhắn trao đổi giữa HLV và học viên
-- -------------------------------------------------------------------------
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    trainer_id INT NOT NULL,
    sender ENUM('member', 'trainer') NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Nhật ký hỏi-đáp chatbot AI của hội viên
-- -------------------------------------------------------------------------
CREATE TABLE ai_chat_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    sender ENUM('user', 'bot') NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Nhật ký sử dụng các tính năng AI khác (gợi ý lịch tập, nhắc lịch, tóm tắt)
-- -------------------------------------------------------------------------
CREATE TABLE ai_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kind VARCHAR(60) NOT NULL,
    input_json JSON,
    output_json JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB;

-- -------------------------------------------------------------------------
-- Chỉ mục phục vụ truy vấn thường dùng
-- -------------------------------------------------------------------------
CREATE INDEX idx_member_packages_member ON member_packages (member_id);

CREATE INDEX idx_payments_member ON payments (member_id);

CREATE INDEX idx_schedules_member ON schedules (member_id);

CREATE INDEX idx_schedules_trainer ON schedules (trainer_id);

CREATE INDEX idx_attendance_member ON attendance (member_id);

CREATE INDEX idx_messages_pair ON messages (member_id, trainer_id);
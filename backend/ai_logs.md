# NHẬT KÝ SỬ DỤNG AI (AI LOGS)

- Dự án: FitCore Fullstack (Gym Management System)
- Sinh viên thực hiện: Diệp Quang Trường - Nguyễn Văn Hải
- Công cụ sử dụng: ChatGPT / GitHub Copilot / Google Gemini

---

## 1. Thiết kế cơ sở dữ liệu (Database Schema)

- **Công cụ:** ChatGPT
- **Prompt:** "Viết file MySQL schema tạo các bảng cho hệ thống quản lý phòng gym gồm members, trainers, packages, schedules, attendance, và bảng ai_logs lưu lịch sử gọi AI."
- **Mục đích:** Khởi tạo cấu trúc bảng trong `backend/database/schema.sql`.
- **Đánh giá & chỉnh sửa:** Đã chỉnh sửa lại kiểu dữ liệu ENUM và thêm khóa ngoại `FOREIGN KEY` liên kết giữa các bảng.

---

## 2. Xây dựng logic gọi AI gợi ý lịch tập (AI Module)

- **Công cụ:** Google Gemini
- **Prompt:** "Viết hàm JavaScript trong Node.js tích hợp API để nhận thông tin học viên (chiều cao, cân nặng, mục tiêu) và trả về lộ trình tập luyện dạng JSON."
- **Mục đích:** Xây dựng logic trong `backend/src/utils/ai.js` và `backend/src/modules/ai.routes.js`.
- **Đánh giá & chỉnh sửa:** Thêm kiểm tra điều kiện lỗi (error handling) và ghi lại toàn bộ prompt/response vào bảng `ai_logs` của database.

---

## 3. Viết Middleware & Tối ưu bảo mật

- **Công cụ:** GitHub Copilot
- **Prompt:** "Tạo middleware xác thực JWT token và phân quyền admin/staff/member cho Express.js."
- **Mục đích:** Hoàn thiện `backend/src/middleware/auth.js`.
- **Đánh giá & chỉnh sửa:** Bổ sung xử lý hết hạn token (`TokenExpiredError`).

---

## 4. Tự đánh giá mức độ đóng góp của AI

- AI hỗ trợ sinh khung boilerplate code và gợi ý cú pháp SQL.
- Thành viên nhóm trực tiếp kiểm thử, ghép nối API frontend - backend và xử lý logic nghiệp vụ.

# FitCore — Hệ thống quản lý trung tâm thể hình có tích hợp AI

Phiên bản **full-stack nhiều người dùng**: tách riêng **Frontend** (HTML/CSS/JS thuần)
và **Backend** (Node.js + Express + MySQL), giao tiếp qua REST API + JWT.
Khác với bản demo một-file trước đó (dữ liệu lưu `localStorage` riêng theo từng
trình duyệt), phiên bản này lưu dữ liệu tập trung trên **MySQL** — nhiều người
dùng ở nhiều máy khác nhau có thể đăng nhập và thao tác **cùng một dữ liệu thật**
cùng lúc, đúng như một web app thật.

```
fitcore-fullstack/
├── backend/                  # REST API (Node.js + Express + MySQL)
│   ├── server.js             # Điểm khởi chạy
│   ├── src/
│   │   ├── app.js            # Ráp toàn bộ route Express
│   │   ├── config/db.js      # Kết nối MySQL (connection pool)
│   │   ├── middleware/       # requireAuth, requireRole, errorHandler
│   │   ├── utils/            # jwt, dateUtils, vietqr, ai (rule-based)
│   │   └── modules/          # 1 file = 1 domain nghiệp vụ (route + controller)
│   ├── database/
│   │   ├── schema.sql        # Toàn bộ bảng + khóa ngoại
│   │   └── seed.js           # Nạp dữ liệu mẫu (mật khẩu băm bcrypt)
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
├── frontend/                 # Giao diện web (không cần build tool)
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── api.js            # Gọi API + gắn JWT
│       ├── ui.js             # toast, modal, hộp xác nhận
│       ├── auth.js           # đăng nhập / đăng ký / đăng xuất
│       ├── router.js         # điều hướng SPA + menu theo vai trò
│       └── views/*.js        # mỗi file 1 nhóm màn hình (theo domain)
├── docker-compose.yml         # Chạy nhanh MySQL + Backend (tùy chọn)
└── README.md
```

## 1. Kiến trúc

- **Frontend** chỉ chứa giao diện — không lưu dữ liệu nghiệp vụ cục bộ. Mọi thao
  tác đều gọi API (`fetch`) tới backend qua `js/api.js`.
- **Backend** là REST API thuần (không server-render HTML), xác thực bằng
  **JWT** (`Authorization: Bearer <token>`), mật khẩu băm bằng **bcrypt**.
- **MySQL** là nguồn dữ liệu duy nhất, dùng chung cho tất cả người dùng —
  nhiều Admin/Lễ tân/HLV/Hội viên ở nhiều thiết bị thao tác đồng thời, dữ liệu
  luôn nhất quán (khác hẳn bản localStorage cũ chỉ chạy được 1 người/1 trình duyệt).
- Phân quyền theo 4 vai trò: `admin`, `reception`, `trainer`, `member` — kiểm
  tra ở middleware `requireRole(...)` phía backend (không chỉ ẩn/hiện ở giao
  diện), nên an toàn kể cả khi người dùng tự gọi thẳng API.

## 2. Cài đặt & chạy (thủ công, không cần Docker)

### Bước 1 — Cài MySQL và tạo database

```bash
mysql -u root -p < backend/database/schema.sql
```

### Bước 2 — Cấu hình & cài backend

```bash
cd backend
cp .env.example .env
# Mở .env, điền đúng DB_PASSWORD (và các giá trị khác nếu cần)
npm install
npm run seed     # nạp dữ liệu mẫu — bắt buộc chạy 1 lần trước khi dùng
npm run dev       # hoặc: npm start
```

Backend chạy tại `http://localhost:4000`. Kiểm tra nhanh: mở
`http://localhost:4000/api/health` phải thấy `{"status":"ok"}`.

### Bước 3 — Chạy frontend

Frontend là HTML/CSS/JS tĩnh, chỉ cần một static server (không cần build).
Cách đơn giản nhất: mở `frontend/index.html` bằng **VS Code → extension
Live Server → "Open with Live Server"**, hoặc:

```bash
cd frontend
npx serve -l 5500
```

Mở `http://localhost:5500` (hoặc `127.0.0.1:5500`).

> Nếu backend chạy ở địa chỉ khác `http://localhost:4000`, sửa dòng
> `window.FITCORE_API_BASE_URL` trong `frontend/index.html`.
> Đồng thời sửa `CORS_ORIGIN` trong `backend/.env` khớp với địa chỉ frontend
> để trình duyệt không chặn request (CORS).

## 3. Chạy nhanh bằng Docker (tùy chọn)

```bash
docker compose up -d
docker compose exec backend npm run seed
```

Sau đó mở `frontend/index.html` bằng Live Server như Bước 3 ở trên
(frontend không nằm trong Docker vì không cần build — chỉ backend + MySQL
cần container hóa).

## 4. Tài khoản demo

Sau khi chạy `npm run seed`, mật khẩu của tất cả tài khoản demo là **123456**:

| Tên đăng nhập | Vai trò |
|---|---|
| `admin` | Quản lý |
| `letan` | Lễ tân |
| `hlv1`  | Huấn luyện viên |
| `hv1`   | Hội viên |

Người dùng mới có thể tự đăng ký qua tab "Đăng ký tài khoản". Hội viên được
kích hoạt ngay; Lễ tân/HLV cần Admin phê duyệt tại mục **Nhân viên**.

## 5. Thanh toán QR (VietQR)

Cấu hình tài khoản nhận tiền trong `backend/.env`:
`BANK_BIN`, `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME`. Khi hội viên chọn hình
thức "Chuyển khoản", backend sinh URL ảnh QR theo chuẩn VietQR/Napas 247 (qua
`img.vietqr.io`) — cần Internet để tải ảnh QR trên trình duyệt người dùng.

## 6. Tính năng AI

Các tính năng AI (`backend/src/utils/ai.js`) hiện triển khai theo luật
(rule-based), chạy hoàn toàn trên backend — dùng chung cho mọi người dùng
(khác bản cũ chạy client-side riêng từng trình duyệt):

- Gợi ý lịch tập tham khảo theo mục tiêu/thời gian rảnh/mức độ
- Sinh tin nhắn nhắc lịch/gia hạn
- Tóm tắt tiến độ tập luyện từ lịch sử điểm danh
- Chatbot hỏi-đáp cho hội viên (dò từ khóa)

**Điểm nối nâng cấp lên AI thật:** sửa nội dung các hàm trong `ai.js` thành
lệnh gọi OpenAI/Gemini/Claude/Hugging Face/Ollama — giữ nguyên chữ ký hàm nên
không cần sửa route/frontend.

## 7. Bảo mật đã áp dụng

- Mật khẩu băm bằng `bcryptjs`, không bao giờ lưu plaintext.
- Xác thực JWT, hết hạn sau `JWT_EXPIRES_IN` (mặc định 7 ngày).
- Phân quyền kiểm tra ở backend (middleware), không chỉ ẩn nút trên giao diện.
- Input cơ bản được validate ở từng route (tên, mật khẩu tối thiểu 6 ký tự...).
- CORS giới hạn theo `CORS_ORIGIN` trong `.env` (đặt đúng domain khi triển khai thật).

## 8. Việc cần làm khi triển khai lên production

- Đổi `JWT_SECRET` thành chuỗi ngẫu nhiên dài, không commit `.env` thật lên git.
- Bật HTTPS (dùng Nginx/Caddy reverse proxy phía trước backend).
- Giới hạn `CORS_ORIGIN` đúng domain frontend thật (không dùng `*`).
- Cân nhắc thêm rate-limiting (vd: `express-rate-limit`) cho `/api/auth/login`.
- Sao lưu định kỳ MySQL (`mysqldump`).

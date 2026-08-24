/**
 * Điều hướng SPA đơn giản. VIEWS[id] là hàm async trả về chuỗi HTML render
 * vào #viewRoot. Mỗi domain view đăng ký hàm của mình vào VIEWS ở file riêng
 * (js/views/*.js), được nạp trước file này trong index.html.
 */
const VIEWS = {}; // populated by js/views/*.js

const NAV_ITEMS = [
  { group: 'Tổng quan', items: [
    { id: 'dashboard', label: 'Bảng điều khiển', roles: ['admin', 'reception'] },
    { id: 'notifications', label: 'Thông báo', roles: ['member'] },
  ]},
  { group: 'Tài khoản của tôi', items: [
    { id: 'myProfile', label: 'Thông tin cá nhân', roles: ['member'] },
    { id: 'myPackages', label: 'Đăng ký / gia hạn gói', roles: ['member'] },
    { id: 'selfCheckin', label: 'Check-in', roles: ['member'] },
    { id: 'myPayments', label: 'Thanh toán', roles: ['member'] },
    { id: 'myProgress', label: 'Theo dõi quá trình tập luyện', roles: ['member'] },
  ]},
  { group: 'Vận hành phòng gym', items: [
    { id: 'members', label: 'Hội viên', roles: ['admin', 'reception'] },
    { id: 'packages', label: 'Gói tập & Thanh toán', roles: ['admin', 'reception'] },
    { id: 'trainers', label: 'Huấn luyện viên', roles: ['admin', 'reception'] },
    { id: 'schedule', label: 'Lịch tập / Lịch hẹn', roles: ['admin', 'reception', 'trainer', 'member'] },
    { id: 'attendance', label: 'Check-in / Check-out', roles: ['admin', 'reception', 'trainer'] },
    { id: 'reports', label: 'Báo cáo', roles: ['admin', 'reception'] },
  ]},
  { group: 'AI trợ lý', items: [
    { id: 'aiChatBot', label: 'Hỏi đáp AI', roles: ['member'] },
    { id: 'aiAssist', label: 'Gợi ý lịch tập AI', roles: ['admin', 'reception', 'trainer', 'member'] },
    { id: 'aiReminder', label: 'Nhắc lịch / gia hạn', roles: ['admin', 'reception'] },
    { id: 'aiProgress', label: 'Tóm tắt tiến độ', roles: ['admin', 'trainer', 'member'] },
  ]},
  { group: 'Công việc PT', items: [
    { id: 'myStudents', label: 'Học viên của tôi', roles: ['trainer'] },
    { id: 'acceptStudents', label: 'Nhận học viên', roles: ['trainer'] },
    { id: 'lessonPlans', label: 'Giáo án tập luyện', roles: ['trainer', 'member'] },
    { id: 'exerciseLibrary', label: 'Thư viện bài tập', roles: ['trainer', 'admin'] },
    { id: 'progressTracking', label: 'Theo dõi tiến độ', roles: ['trainer'] },
    { id: 'interact', label: 'Tương tác học viên', roles: ['trainer', 'member'] },
  ]},
  { group: 'Hệ thống', items: [
    { id: 'staff', label: 'Nhân viên', roles: ['admin'] },
  ]},
];

function buildNav() {
  const root = document.getElementById('navGroup');
  root.innerHTML = '';
  NAV_ITEMS.forEach((g) => {
    const visible = g.items.filter((it) => it.roles.includes(SESSION.role));
    if (!visible.length) return;
    const lab = document.createElement('div');
    lab.className = 'nav-label';
    lab.textContent = g.group;
    root.appendChild(lab);
    visible.forEach((it) => {
      const el = document.createElement('div');
      el.className = 'nav-item';
      el.id = 'nav_' + it.id;
      el.innerHTML = `<span class="dot"></span><span>${it.label}</span>`;
      el.onclick = () => navigate(it.id);
      root.appendChild(el);
    });
  });
}

async function navigate(viewId, params) {
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const navEl = document.getElementById('nav_' + viewId);
  if (navEl) navEl.classList.add('active');

  const renderer = VIEWS[viewId];
  const root = document.getElementById('viewRoot');
  if (!renderer) { root.innerHTML = '<div class="panel">Không tìm thấy trang.</div>'; return; }

  root.innerHTML = '<div class="panel"><div class="empty-state">Đang tải…</div></div>';
  try {
    root.innerHTML = await renderer(params);
  } catch (err) {
    root.innerHTML = `<div class="panel"><div class="empty-state">Lỗi tải dữ liệu: ${err.message}</div></div>`;
  }
  window.scrollTo(0, 0);

  if (viewId === 'interact' && SESSION.role === 'member' && typeof afterRenderInteractMember === 'function') {
    afterRenderInteractMember();
  }
  if (viewId === 'aiChatBot' && typeof renderAiChat === 'function') renderAiChat();
}

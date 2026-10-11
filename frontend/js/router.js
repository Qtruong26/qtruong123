/**
 * Điều hướng SPA đơn giản. VIEWS[id] là hàm async trả về chuỗi HTML render
 * vào #viewRoot. Mỗi domain view đăng ký hàm của mình vào VIEWS ở file riêng
 * (js/views/*.js), được nạp trước file này trong index.html.
 */
const VIEWS = {}; // populated by js/views/*.js

const NAV_ITEMS = [
  { group: 'Tổng quan', items: [
    { id: 'dashboard', label: 'Bảng điều khiển', roles: ['admin', 'reception'] },
    { id: 'notifications', label: 'Thông báo câu lạc bộ', roles: ['member'] },
  ]},
  { group: 'Cổng hội viên', items: [
    { id: 'myProfile', label: 'Hồ sơ cá nhân', roles: ['member'] },
    { id: 'myPackages', label: 'Thẻ tập & Gia hạn gói', roles: ['member'] },
    { id: 'selfCheckin', label: 'Mã Check-in vào phòng', roles: ['member'] },
    { id: 'myPayments', label: 'Lịch sử thanh toán', roles: ['member'] },
    { id: 'myProgress', label: 'Nhật ký InBody & Thể chất', roles: ['member'] },
  ]},
  { group: 'Vận hành phòng gym', items: [
    { id: 'members', label: 'Quản lý hội viên', roles: ['admin', 'reception'] },
    { id: 'packages', label: 'Gói tập & Thu ngân', roles: ['admin', 'reception'] },
    { id: 'trainers', label: 'Huấn luyện viên (PT)', roles: ['admin', 'reception'] },
    { id: 'attendance', label: 'Điểm danh ra / vào', roles: ['admin', 'reception', 'trainer'] },
    { id: 'schedule', label: 'Lịch tập & Lớp học', roles: ['admin', 'reception', 'trainer', 'member'] },
    { id: 'reports', label: 'Báo cáo doanh thu', roles: ['admin', 'reception'] },
    { id: 'aiReminder', label: 'Chăm sóc & Nhắc hạn thẻ', roles: ['admin', 'reception'] },
  ]},
  { group: 'Huấn luyện & Chuyên môn PT', items: [
    { id: 'myStudents', label: 'Học viên phụ trách', roles: ['trainer'] },
    { id: 'acceptStudents', label: 'Nhận học viên mới', roles: ['trainer'] },
    { id: 'lessonPlans', label: 'Giáo án huấn luyện', roles: ['trainer', 'member'] },
    { id: 'exerciseLibrary', label: 'Thư viện bài tập Gym', roles: ['trainer', 'admin'] },
    { id: 'progressTracking', label: 'Chỉ số InBody & Tiến độ', roles: ['trainer'] },
    { id: 'interact', label: 'Trao đổi học viên', roles: ['trainer', 'member'] },
  ]},
  { group: 'Tiện ích & Hỗ trợ', items: [
    { id: 'aiAssist', label: 'Thiết lập lịch tập mẫu', roles: ['admin', 'reception', 'trainer', 'member'] },
    { id: 'aiProgress', label: 'Báo cáo đánh giá thể chất', roles: ['admin', 'trainer', 'member'] },
    { id: 'aiChatBot', label: 'Tư vấn viên thể hình', roles: ['admin', 'reception', 'trainer', 'member'] },
  ]},
  { group: 'Hệ thống', items: [
    { id: 'staff', label: 'Quản lý nhân viên', roles: ['admin'] },
  ]},
];

/* Icon tối giản 1 nét (stroke) cho từng mục menu (24x24, stroke-width 1.8) */
const NAV_ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  notifications: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  myProfile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
  myPackages: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  selfCheckin: '<path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
  myPayments: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  myProgress: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  members: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><path d="M16.5 4.5c1.8.4 3 2 3 3.9 0 1.9-1.2 3.5-3 3.9"/><path d="M21.5 20c0-3-2-5.5-4.8-6.3"/>',
  packages: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10"/><path d="M7 12h6"/><circle cx="16" cy="16" r="2"/>',
  trainers: '<path d="M6.5 6.5 3 10l4 4 3.5-3.5"/><path d="M17.5 17.5 21 14l-4-4-3.5 3.5"/><path d="M9 15l6-6"/>',
  schedule: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 3v3"/><path d="M16 3v3"/><path d="M8 14h2"/>',
  attendance: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  reports: '<path d="M4 20V10"/><path d="M11 20V4"/><path d="M18 20v-7"/><path d="M2 20h20"/>',
  aiReminder: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M12 2v2"/>',
  myStudents: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><path d="M16.5 4.5c1.8.4 3 2 3 3.9 0 1.9-1.2 3.5-3 3.9"/><path d="M21.5 20c0-3-2-5.5-4.8-6.3"/>',
  acceptStudents: '<circle cx="8" cy="8" r="3.5"/><path d="M1.5 20c0-3.6 2.9-6.5 6.5-6.5 1.6 0 3 .6 4.1 1.5"/><path d="M17 8v6"/><path d="M14 11h6"/>',
  lessonPlans: '<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 1 4 17.5v-13Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/><path d="M8 7h8"/><path d="M8 10.5h5"/>',
  exerciseLibrary: '<path d="M6 9v6M18 9v6M3 11v2M21 11v2M6 12h12"/>',
  progressTracking: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  interact: '<path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1.1-5.1a8.4 8.4 0 0 1-1-4 8.4 8.4 0 0 1 8.9-8.4 8.5 8.5 0 0 1 9 8.4Z"/>',
  aiAssist: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 2v4"/><path d="M16 2v4"/><path d="M8 14h3"/><path d="M8 17h6"/>',
  aiProgress: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/><path d="M8 12h.01"/>',
  aiChatBot: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  staff: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/><path d="M17 6l1.8 1.8L22 4.5"/>',
};

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
      const iconPaths = NAV_ICONS[it.id] || '<circle cx="12" cy="12" r="3"/>';
      el.innerHTML = `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${iconPaths}</svg><span>${it.label}</span>`;
      el.onclick = () => navigate(it.id);
      root.appendChild(el);
    });
  });
}

/** Khung skeleton chờ tải — thay cho dòng chữ "Đang tải…" đơn điệu, cảm giác chuyên nghiệp hơn. */
function skeletonHTML() {
  return `
  <div class="topbar">
    <div><div class="skel skel-eyebrow"></div><div class="skel skel-title"></div></div>
  </div>
  <div class="grid grid-4" style="margin-bottom:20px;">
    ${[1,2,3,4].map(() => `<div class="panel"><div class="skel skel-line" style="width:60%;"></div><div class="skel skel-num"></div></div>`).join('')}
  </div>
  <div class="panel">
    ${[1,2,3,4,5].map(() => `<div class="skel skel-row"></div>`).join('')}
  </div>`;
}

async function navigate(viewId, params) {
  document.querySelectorAll('.nav-item').forEach((n) => n.classList.remove('active'));
  const navEl = document.getElementById('nav_' + viewId);
  if (navEl) navEl.classList.add('active');

  const renderer = VIEWS[viewId];
  const root = document.getElementById('viewRoot');
  if (!renderer) { root.innerHTML = '<div class="panel"><div class="empty-state">Không tìm thấy trang.</div></div>'; return; }

  root.classList.remove('view-enter');
  root.innerHTML = skeletonHTML();
  try {
    const html = await renderer(params);
    root.innerHTML = html;
    // Trigger animation lại từ đầu bằng cách ép reflow trước khi thêm class.
    void root.offsetWidth;
    root.classList.add('view-enter');
  } catch (err) {
    root.innerHTML = `<div class="panel"><div class="empty-state"><div class="empty-icon">⚠</div><div class="empty-title">Không tải được dữ liệu</div><div class="hint">${err.message}</div></div></div>`;
  }
  window.scrollTo(0, 0);

  if (viewId === 'interact' && SESSION.role === 'member' && typeof afterRenderInteractMember === 'function') {
    afterRenderInteractMember();
  }
  if (viewId === 'aiChatBot' && typeof renderAiChat === 'function') renderAiChat();
}

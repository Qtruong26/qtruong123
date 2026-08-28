/**
 * Tiện ích UI dùng chung: toast, modal, hộp xác nhận (không dùng confirm()
 * của trình duyệt vì có thể bị chặn trong một số khung xem trước/iframe).
 */
function fmtMoney(n) { return Number(n || 0).toLocaleString('vi-VN') + 'đ'; }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }

function toast(msg, isErr) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' toast-err' : ' toast-ok');
  const icon = isErr
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5"/></svg>';
  el.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => { el.classList.add('toast-out'); setTimeout(() => el.remove(), 250); }, 3200);
}

function openModal(html) {
  document.getElementById('modalBody').innerHTML = html;
  document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }

let _confirmCallback = null;
function confirmAction(message, onConfirm) {
  _confirmCallback = onConfirm;
  openModal(`
    <div class="modal-title">Xác nhận</div>
    <div style="font-size:14px;color:var(--chalk-dim);">${message}</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="_runConfirm()">Đồng ý</button>
    </div>`);
}
function _runConfirm() {
  closeModal();
  if (typeof _confirmCallback === 'function') _confirmCallback();
  _confirmCallback = null;
}

function pkgStatusBadge(status, daysLeft) {
  if (status === 'none' || !status) return `<span class="badge badge-mute">Chưa có gói</span>`;
  if (status === 'expired') return `<span class="badge badge-danger">Đã hết hạn</span>`;
  if (status === 'expiring') return `<span class="badge badge-warn">Sắp hết hạn${daysLeft != null ? ` (${daysLeft}n)` : ''}</span>`;
  return `<span class="badge badge-ok">Đang hoạt động</span>`;
}

/** Trạng thái rỗng có icon minh họa — dùng cho danh sách/bảng chưa có dữ liệu, thay cho dòng chữ đơn điệu. */
const EMPTY_ICONS = {
  calendar: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18"/><path d="M8 3v3"/><path d="M16 3v3"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 5-5"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5"/>',
  box: '<path d="M21 8 12 3 3 8l9 5 9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.6 8.6 0 0 1-3.9-.9L3 20l1.1-5.1a8.4 8.4 0 0 1-1-4 8.4 8.4 0 0 1 8.9-8.4 8.5 8.5 0 0 1 9 8.4Z"/>',
  inbox: '<path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 5h14l2 7v7H3v-7l2-7Z"/>',
};
function emptyState(type, text) {
  const paths = EMPTY_ICONS[type] || EMPTY_ICONS.inbox;
  return `<div class="empty-state"><svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths}</svg><div class="empty-title">${text}</div></div>`;
}

/** Hiển thị thông báo lỗi thân thiện khi 1 lời gọi API thất bại (dùng trong catch) */
function showApiError(err) {
  toast(err.message || 'Đã có lỗi xảy ra.', true);
}

/** Hiện/ẩn nội dung ô mật khẩu (nút "con mắt") */
function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.innerHTML = showing
    ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5 20 1 12 1 12a21.4 21.4 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.4 21.4 0 0 1-2.62 3.9M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') closeModal(); });
});

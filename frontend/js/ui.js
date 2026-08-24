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
  el.className = 'toast';
  if (isErr) el.style.borderLeftColor = 'var(--signal)';
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
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

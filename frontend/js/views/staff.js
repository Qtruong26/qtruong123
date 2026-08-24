VIEWS.staff = async function () {
  const data = await Api.get('/staff');
  const roleBadge = (r) => r === 'trainer' ? 'badge-info' : r === 'reception' ? 'badge-ok' : 'badge-mute';
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Hệ thống</div><div class="page-title">Nhân viên</div>
    <div class="page-desc">Phê duyệt yêu cầu tự đăng ký, thêm nhân viên mới, hoặc cho thôi việc nhân viên.</div></div>
    <button class="btn btn-primary" onclick="openAddStaffModal()">+ Thêm nhân viên</button>
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Phê duyệt nhân viên ${data.pending.length ? `<span class="badge badge-warn" style="margin-left:6px;">${data.pending.length} chờ duyệt</span>` : ''}</div></div>
    ${data.pending.length ? `<div class="table-wrap"><table><thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th></th></tr></thead>
      <tbody>${data.pending.map(u => `<tr><td>${u.name}</td><td class="mono">${u.username}</td><td><span class="badge ${roleBadge(u.role)}">${roleLabel(u.role)}</span></td>
        <td class="right">
          <button class="icon-btn" onclick="approveStaff(${u.id})" style="border-color:var(--volt);color:var(--volt);">✔ Phê duyệt</button>
          <button class="icon-btn danger" onclick="rejectStaff(${u.id})">Từ chối</button>
        </td></tr>`).join('')}</tbody></table></div>`
      : `<div class="empty-state">Không có yêu cầu đăng ký nào đang chờ phê duyệt.</div>`}
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Danh sách nhân viên (${data.staff.length})</div></div>
    <div class="table-wrap"><table><thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${data.staff.length ? data.staff.map(u => `<tr><td>${u.name}</td><td class="mono">${u.username}</td>
      <td><span class="badge ${roleBadge(u.role)}">${roleLabel(u.role)}</span></td><td><span class="badge badge-ok">Đang làm việc</span></td>
      <td class="right"><button class="icon-btn danger" onclick="fireStaff(${u.id})">Đuổi việc</button></td></tr>`).join('')
      : `<tr><td colspan="5"><div class="empty-state">Chưa có nhân viên nào.</div></td></tr>`}</tbody></table></div>
  </div>`;
};

function openAddStaffModal() {
  openModal(`
    <div class="modal-title">Thêm nhân viên mới</div>
    <div class="field"><label>Vai trò</label>
      <select id="sf_role"><option value="reception">Lễ tân</option><option value="trainer">Huấn luyện viên</option></select></div>
    <div class="field"><label>Họ tên</label><input id="sf_name" placeholder="Nguyễn Văn A"></div>
    <div class="field"><label>Số điện thoại</label><input id="sf_phone" placeholder="09xxxxxxxx"></div>
    <div class="field"><label>Tên đăng nhập</label><input id="sf_username" placeholder="Tên đăng nhập"></div>
    <div class="field"><label>Mật khẩu</label><input id="sf_password" type="password" placeholder="Tối thiểu 6 ký tự"></div>
    <div class="field-error" id="sf_error"></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveNewStaff()">Thêm nhân viên</button>
    </div>`);
}
async function saveNewStaff() {
  document.getElementById('sf_error').classList.remove('show');
  const body = {
    role: document.getElementById('sf_role').value, name: document.getElementById('sf_name').value.trim(),
    phone: document.getElementById('sf_phone').value.trim(), username: document.getElementById('sf_username').value.trim(),
    password: document.getElementById('sf_password').value,
  };
  try {
    await Api.post('/staff', body);
    toast('Đã thêm nhân viên mới.'); closeModal(); navigate('staff');
  } catch (err) { showFieldError('sf_error', err.message); }
}
function fireStaff(id) {
  confirmAction('Cho nhân viên này thôi việc? Tài khoản sẽ bị xóa và không thể đăng nhập nữa.', async () => {
    try { await Api.del(`/staff/${id}`); toast('Đã cho nhân viên thôi việc.'); navigate('staff'); } catch (err) { showApiError(err); }
  });
}
async function approveStaff(id) {
  try { await Api.post(`/staff/${id}/approve`); toast('Đã phê duyệt nhân viên.'); navigate('staff'); } catch (err) { showApiError(err); }
}
function rejectStaff(id) {
  confirmAction('Từ chối và xóa yêu cầu đăng ký này?', async () => {
    try { await Api.del(`/staff/${id}`); toast('Đã từ chối yêu cầu.'); navigate('staff'); } catch (err) { showApiError(err); }
  });
}

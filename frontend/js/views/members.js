VIEWS.members = async function () {
  const members = await Api.get('/members');
  const canManage = ['admin', 'reception'].includes(SESSION.role);
  
  const rows = members.map((m) => {
    // Escape tên để tránh lỗi vỡ cú pháp JavaScript khi tên chứa ký tự đặc biệt/dấu nháy
    const safeName = (m.name || '').replace(/'/g, "\\'");
    // Ưu tiên userId từ bảng users, nếu không có sẽ rơi về m.id
    const targetUserId = m.userId || m.id;

    return `
    <tr>
      <td>${m.name}</td>
      <td class="mono">${m.phone || ''}</td>
      <td>${m.goal || '—'}</td>
      <td>${m.joinDate}</td>
      <td>${m.activePackage ? m.activePackage.packageName : '—'}</td>
      <td>${pkgStatusBadge(m.packageStatus, m.activePackage ? daysBetween(todayStr(), m.activePackage.end_date) : null)}</td>
      <td class="right">
        ${SESSION.role === 'admin' ? `
          <button class="icon-btn" style="color: #3b82f6; font-weight: 600;" onclick="openPromoteModal(${targetUserId}, '${safeName}')">
            ⬆ HLV
          </button>
        ` : ''}
        ${canManage ? `<button class="icon-btn" onclick="editMember(${m.id})">Sửa</button>` : ''}
        ${SESSION.role === 'admin' ? `<button class="icon-btn danger" onclick="deleteMember(${m.id})">Xóa</button>` : ''}
      </td>
    </tr>`;
  }).join('');

  return `
  <div class="topbar">
    <div>
      <div class="page-eyebrow">Vận hành</div>
      <div class="page-title">Hội viên</div>
      <div class="page-desc">Quản lý hồ sơ hội viên và trạng thái gói tập hiện tại.</div>
    </div>
    ${canManage ? `<button class="btn btn-primary" onclick="editMember(null)">+ Thêm hội viên</button>` : ''}
  </div>
  <div class="panel">
    <div class="panel-head">
      <div class="toolbar"><input class="search-input" placeholder="Tìm theo tên / SĐT..." oninput="filterMembers(this.value)"></div>
      <div class="hint">${members.length} hội viên</div>
    </div>
    <div class="table-wrap">
      <table id="memberTable">
        <thead>
          <tr>
            <th>Họ tên</th>
            <th>SĐT</th>
            <th>Mục tiêu</th>
            <th>Ngày tham gia</th>
            <th>Gói hiện tại</th>
            <th>Trạng thái</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="7"><div class="empty-state">Chưa có hội viên nào.</div></td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
};

function filterMembers(q) {
  q = q.toLowerCase();
  document.querySelectorAll('#memberTable tbody tr').forEach((tr) => {
    tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function editMember(id) {
  let m = { name: '', phone: '', email: '', goal: 'Duy trì sức khỏe', level: 'Mới bắt đầu' };
  if (id) m = await Api.get(`/members/${id}`);
  openModal(`
    <div class="modal-title">${id ? 'Sửa hội viên' : 'Thêm hội viên'}</div>
    <div class="field"><label>Họ tên</label><input id="f_name" value="${m.name}"></div>
    <div class="form-row">
      <div class="field"><label>Số điện thoại</label><input id="f_phone" value="${m.phone || ''}"></div>
      <div class="field"><label>Email</label><input id="f_email" value="${m.email || ''}"></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Mục tiêu tập luyện</label>
        <select id="f_goal">${['Giảm cân', 'Tăng cơ', 'Tăng sức bền', 'Duy trì sức khỏe', 'Phục hồi chấn thương'].map(g => `<option ${m.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label>Mức độ hiện tại</label>
        <select id="f_level">${['Mới bắt đầu', 'Trung bình', 'Nâng cao'].map(g => `<option ${m.level === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveMember(${id || 'null'})">Lưu</button>
    </div>`);
}

async function saveMember(id) {
  const name = document.getElementById('f_name').value.trim();
  if (!name) { toast('Vui lòng nhập họ tên.', true); return; }
  const data = {
    name, 
    phone: document.getElementById('f_phone').value.trim(), 
    email: document.getElementById('f_email').value.trim(),
    goal: document.getElementById('f_goal').value, 
    level: document.getElementById('f_level').value,
  };
  try {
    if (id) await Api.put(`/members/${id}`, data); else await Api.post('/members', data);
    toast(id ? 'Đã cập nhật hội viên.' : 'Đã thêm hội viên mới.');
    closeModal(); 
    navigate('members');
  } catch (err) { showApiError(err); }
}

function deleteMember(id) {
  confirmAction('Xóa hội viên này? Toàn bộ lịch sử liên quan sẽ được giữ nguyên nhưng không hiển thị hồ sơ.', async () => {
    try { 
      await Api.del(`/members/${id}`); 
      toast('Đã xóa hội viên.'); 
      navigate('members'); 
    } catch (err) { showApiError(err); }
  });
}

/* ================= THĂNG CHỨC HỘI VIÊN LÊN HLV ================= */
function openPromoteModal(userId, userName) {
  if (!userId) {
    toast('Tài khoản này chưa liên kết với hệ thống User ID.', true);
    return;
  }

  openModal(`
    <div class="modal-title">Thăng chức lên Huấn Luyện Viên</div>
    <div style="font-size: 13px; margin-bottom: 16px; color: var(--chalk-dim, #94a3b8);">
      Tài khoản: <strong style="color: #fff;">${userName}</strong>
    </div>

    <div class="field" style="margin-bottom: 12px;">
      <label>Chuyên môn (Specialty)</label>
      <input id="promote_specialty" placeholder="vd: Gym, Yoga, PT 1-1, Cardio..." />
    </div>

    <div class="field" style="margin-bottom: 16px;">
      <label>Lịch làm việc (Work Days)</label>
      <input id="promote_workdays" placeholder="vd: T2 - T7 (08:00 - 17:00)" />
    </div>

    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" style="background:#c6ff3a; color:#12151a; font-weight:600;" onclick="submitPromote(${userId})">Xác nhận thăng chức</button>
    </div>
  `);
}

async function submitPromote(userId) {
  const specialty = document.getElementById('promote_specialty')?.value?.trim() || '';
  const workDays = document.getElementById('promote_workdays')?.value?.trim() || '';

  try {
    const res = await Api.post('/staff/promote-to-trainer', { userId, specialty, workDays });
    toast(res.message || 'Thăng chức thành công!');
    closeModal();
    navigate('members');
  } catch (err) {
    showApiError(err);
  }
}
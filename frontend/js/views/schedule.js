VIEWS.schedule = async function () {
  const list = await Api.get('/schedules');
  const canCancelAny = ['admin', 'reception'].includes(SESSION.role);
  const canCancel = (s) => canCancelAny
    || (SESSION.role === 'trainer' && s.trainerId === SESSION.trainerId)
    || (SESSION.role === 'member' && s.memberId === SESSION.memberId);

  const rows = list.map((s) => `
    <tr><td>${s.date}</td><td>${s.time}</td><td>${s.memberName || s.note || 'Lớp nhóm'}</td>
      <td>${s.trainerName}</td><td><span class="badge badge-info">${s.type}</span></td>
      <td><span class="badge ${s.status === 'Đã đặt' ? 'badge-ok' : 'badge-mute'}">${s.status}</span></td>
      <td class="right">${canCancel(s) ? `<button class="icon-btn danger" onclick="deleteSchedule(${s.id})">Hủy</button>` : ''}</td></tr>`).join('');

  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Vận hành</div><div class="page-title">Lịch tập</div>
    <div class="page-desc">Đăng ký lịch tập cá nhân/nhóm với huấn luyện viên.${SESSION.role === 'admin' ? ' Quản lý có toàn quyền thêm và hủy mọi lịch tập.' : ''}</div></div>
    <button class="btn btn-primary" onclick="openScheduleModal()">+ Đặt lịch</button>
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Ngày</th><th>Giờ</th><th>Hội viên / Lớp</th><th>HLV</th><th>Loại</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="7"><div class="empty-state">Chưa có lịch tập nào.</div></td></tr>`}</tbody></table>
  </div></div>`;
};

async function openScheduleModal() {
  const trainers = await Api.get('/trainers');
  const members = ['admin', 'reception', 'trainer'].includes(SESSION.role) ? await Api.get('/members') : [];
  openModal(`
    <div class="modal-title">Đặt lịch tập</div>
    <div class="field"><label>Loại lịch</label>
      <select id="sf_type" onchange="document.getElementById('sf_member_wrap').style.display=this.value==='Nhóm'?'none':'block'">
        <option value="Cá nhân">Cá nhân (1 hội viên)</option><option value="Nhóm">Lớp nhóm</option>
      </select></div>
    <div id="sf_member_wrap" class="field"><label>Hội viên</label>
      ${SESSION.role === 'member'
        ? `<input value="Bạn" disabled>`
        : `<select id="sf_member">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select>`}
    </div>
    <div class="field"><label>Ghi chú lớp (nếu là lớp nhóm)</label><input id="sf_note" placeholder="vd: Lớp Yoga buổi tối"></div>
    <div class="field"><label>Huấn luyện viên</label>
      <select id="sf_trainer">${trainers.map(t => `<option value="${t.id}">${t.name} — ${t.specialty || ''}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="field"><label>Ngày</label><input id="sf_date" type="date" value="${todayStr()}"></div>
      <div class="field"><label>Giờ</label><input id="sf_time" type="time" value="18:00"></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveSchedule()">Đặt lịch</button>
    </div>`);
}
async function saveSchedule() {
  const type = document.getElementById('sf_type').value;
  const memberSelect = document.getElementById('sf_member');
  const body = {
    type, date: document.getElementById('sf_date').value, time: document.getElementById('sf_time').value,
    trainerId: Number(document.getElementById('sf_trainer').value),
    memberId: type === 'Cá nhân' && memberSelect ? Number(memberSelect.value) : undefined,
    note: type === 'Nhóm' ? (document.getElementById('sf_note').value || 'Lớp nhóm') : undefined,
  };
  try {
    await Api.post('/schedules', body);
    toast('Đã đặt lịch tập.'); closeModal(); navigate('schedule');
  } catch (err) { showApiError(err); }
}
function deleteSchedule(id) {
  confirmAction('Hủy lịch tập này?', async () => {
    try { await Api.del(`/schedules/${id}`); toast('Đã hủy lịch.'); navigate('schedule'); } catch (err) { showApiError(err); }
  });
}

VIEWS.attendance = async function () {
  const list = await Api.get('/attendance');
  const rows = list.map((a) => `
    <tr><td>${a.date}</td><td class="mono">${a.time}</td><td class="mono">${a.checkOutTime || '—'}</td>
      <td>${a.memberName}</td><td>${a.note || '—'}</td>
      <td class="right">
        ${!a.checkOutTime ? `<button class="icon-btn" style="border-color:var(--volt);color:var(--volt);" onclick="doCheckout(${a.id})">Check-out</button>` : ''}
        <button class="icon-btn danger" onclick="deleteAttendance(${a.id})">Xóa</button>
      </td></tr>`).join('');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Vận hành</div><div class="page-title">Check-in / Check-out</div>
    <div class="page-desc">Ghi nhận giờ vào và giờ ra của hội viên tại phòng gym.</div></div>
    <button class="btn btn-primary" onclick="openCheckinModal()">+ Check-in</button>
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Hội viên</th><th>Ghi chú</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="6"><div class="empty-state">Chưa có lượt check-in nào.</div></td></tr>`}</tbody></table>
  </div></div>`;
};

async function doCheckout(id) {
  try { await Api.post(`/attendance/${id}/checkout`); toast('Đã check-out.'); navigate(SESSION.role === 'member' ? 'selfCheckin' : 'attendance'); }
  catch (err) { showApiError(err); }
}

async function openCheckinModal() {
  const members = await Api.get('/members');
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0'), mm = String(now.getMinutes()).padStart(2, '0');
  openModal(`
    <div class="modal-title">Check-in buổi tập</div>
    <div class="field"><label>Hội viên</label>
      <select id="cf_member">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="field"><label>Ngày</label><input id="cf_date" type="date" value="${todayStr()}"></div>
      <div class="field"><label>Giờ vào</label><input id="cf_time" type="time" value="${hh}:${mm}"></div>
    </div>
    <div class="field"><label>Ghi chú buổi tập (tùy chọn)</label><textarea id="cf_note" rows="2" placeholder="vd: Tập chân, tăng tạ 5kg"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveCheckin()">Xác nhận check-in</button>
    </div>`);
}
async function saveCheckin() {
  const memberId = Number(document.getElementById('cf_member').value);
  const date = document.getElementById('cf_date').value;
  const time = document.getElementById('cf_time').value;
  const note = document.getElementById('cf_note').value;
  try {
    await Api.post('/attendance', { memberId, date, time, note });
    toast('Đã check-in.'); closeModal(); navigate('attendance');
  } catch (err) { showApiError(err); }
}
function deleteAttendance(id) {
  confirmAction('Xóa lượt check-in này?', async () => {
    try { await Api.del(`/attendance/${id}`); toast('Đã xóa.'); navigate('attendance'); } catch (err) { showApiError(err); }
  });
}

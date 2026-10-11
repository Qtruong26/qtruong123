VIEWS.attendance = async function () {
  const list = await Api.get('/attendance');
  const today = todayStr();
  const todayList = list.filter(a => a.date === today);
  const inGymCount = list.filter(a => !a.checkOutTime).length;

  const rows = list.map((a) => `
    <tr>
      <td>${a.date}</td>
      <td class="mono" style="color:var(--volt);font-weight:600;">${a.time}</td>
      <td class="mono">${a.checkOutTime ? a.checkOutTime : `<span class="badge badge-ok">Đang tập</span>`}</td>
      <td><strong>${a.memberName}</strong></td>
      <td>${a.note || '<span style="color:var(--chalk-dim);">—</span>'}</td>
      <td class="right">
        ${!a.checkOutTime ? `<button class="icon-btn" style="border-color:var(--volt);color:var(--volt);font-weight:600;" onclick="doCheckout(${a.id})">Check-out</button>` : ''}
        <button class="icon-btn danger" onclick="deleteAttendance(${a.id})">Xóa</button>
      </td>
    </tr>`).join('');

  return `
  <div class="topbar">
    <div>
      <div class="page-eyebrow">Kiểm soát Ra / Vào</div>
      <div class="page-title">Trạm Check-in Phòng Gym</div>
      <div class="page-desc">Ghi nhận giờ vào, giờ ra và theo dõi số lượng hội viên đang có mặt tại phòng tập theo thời gian thực.</div>
    </div>
    <button class="btn btn-primary" onclick="openCheckinModal()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
      + Check-in lượt mới
    </button>
  </div>

  <div class="grid grid-3" style="margin-bottom:20px;">
    <div class="stat-tile">
      <div class="bar" style="background:var(--volt);"></div>
      <div class="stat-label">Đang có mặt tại phòng gym</div>
      <div class="stat-value" style="color:var(--volt);">${inGymCount} <span style="font-size:14px;color:var(--chalk-dim);font-weight:normal;">người</span></div>
      <div class="stat-sub">Hội viên chưa check-out</div>
    </div>
    <div class="stat-tile">
      <div class="bar" style="background:var(--steel);"></div>
      <div class="stat-label">Tổng lượt check-in hôm nay</div>
      <div class="stat-value">${todayList.length}</div>
      <div class="stat-sub">Tính từ 00:00 hôm nay</div>
    </div>
    <div class="stat-tile">
      <div class="bar" style="background:var(--amber);"></div>
      <div class="stat-label">Tổng lượt ghi nhận hệ thống</div>
      <div class="stat-value">${list.length}</div>
      <div class="stat-sub">Toàn bộ lịch sử điểm danh</div>
    </div>
  </div>

  <div class="panel">
    <div class="panel-head">
      <div class="panel-title">Lịch sử Check-in / Check-out</div>
      <div class="hint">Hiển thị các lượt ra vào gần nhất</div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ngày</th>
            <th>Giờ vào</th>
            <th>Giờ ra</th>
            <th>Hội viên</th>
            <th>Ghi chú buổi tập</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows || `<tr><td colspan="6"><div class="empty-state">Chưa có lượt check-in nào.</div></td></tr>`}</tbody>
      </table>
    </div>
  </div>`;
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

VIEWS.trainers = async function () {
  const trainers = await Api.get('/trainers');
  const canDelete = SESSION.role === 'admin';
  const rows = trainers.map((t) => `
    <tr><td>${t.name}</td><td class="mono">${t.phone || ''}</td><td>${t.specialty || ''}</td><td>${(t.workDays || []).join(', ')}</td>
      <td class="right"><button class="icon-btn" onclick="editTrainer(${t.id})">Sửa</button>
      ${canDelete ? `<button class="icon-btn danger" onclick="deleteTrainer(${t.id})">Xóa</button>` : ''}</td></tr>`).join('');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Vận hành</div><div class="page-title">Huấn luyện viên</div>
    <div class="page-desc">Xem và cập nhật hồ sơ, lịch làm việc của huấn luyện viên.</div></div>
    ${canDelete ? `<button class="btn btn-primary" onclick="editTrainer(null)">+ Thêm HLV</button>` : ''}
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Họ tên</th><th>SĐT</th><th>Chuyên môn</th><th>Ngày làm việc</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5"><div class="empty-state">Chưa có huấn luyện viên nào.</div></td></tr>`}</tbody></table>
  </div></div>`;
};

async function editTrainer(id) {
  let t = { name: '', phone: '', specialty: '', workDays: [] };
  if (id) { const list = await Api.get('/trainers'); t = list.find((x) => x.id === id); }
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
  openModal(`
    <div class="modal-title">${id ? 'Sửa' : 'Thêm'} huấn luyện viên</div>
    <div class="field"><label>Họ tên</label><input id="tf_name" value="${t.name}"></div>
    <div class="form-row">
      <div class="field"><label>SĐT</label><input id="tf_phone" value="${t.phone || ''}"></div>
      <div class="field"><label>Chuyên môn</label><input id="tf_spec" value="${t.specialty || ''}"></div>
    </div>
    <div class="field"><label>Ngày làm việc</label>
      <div class="tag-row">${days.map(d => `<span class="chip ${t.workDays.includes(d) ? 'selected' : ''}" onclick="this.classList.toggle('selected')" data-day="${d}">${d}</span>`).join('')}</div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveTrainer(${id || 'null'})">Lưu</button>
    </div>`);
}
async function saveTrainer(id) {
  const name = document.getElementById('tf_name').value.trim();
  if (!name) { toast('Vui lòng nhập họ tên.', true); return; }
  const workDays = Array.from(document.querySelectorAll('.chip.selected')).map((c) => c.dataset.day);
  const data = { name, phone: document.getElementById('tf_phone').value, specialty: document.getElementById('tf_spec').value, workDays };
  try {
    if (id) await Api.put(`/trainers/${id}`, data); else await Api.post('/trainers', data);
    toast(id ? 'Đã cập nhật HLV.' : 'Đã thêm HLV.'); closeModal(); navigate('trainers');
  } catch (err) { showApiError(err); }
}
function deleteTrainer(id) {
  confirmAction('Xóa huấn luyện viên này?', async () => {
    try { await Api.del(`/trainers/${id}`); toast('Đã xóa.'); navigate('trainers'); } catch (err) { showApiError(err); }
  });
}

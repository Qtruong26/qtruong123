/* ---- Học viên của tôi ---- */
VIEWS.myStudents = async function () {
  const students = await Api.get('/progress/students');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Học viên của tôi</div>
    <div class="page-desc">Danh sách hội viên bạn đang phụ trách huấn luyện cá nhân (PT).</div></div>
    <button class="btn btn-secondary" onclick="navigate('acceptStudents')">+ Nhận thêm học viên</button>
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Họ tên</th><th>SĐT</th><th>Mục tiêu</th><th>Mức độ</th><th></th></tr></thead>
    <tbody>${students.length ? students.map((m) => `
      <tr><td>${m.name}</td><td class="mono">${m.phone || ''}</td><td>${m.goal || '—'}</td><td>${m.level || '—'}</td>
        <td class="right">
          <button class="icon-btn" onclick="openStudentProgress(${m.id})">Tiến độ</button>
          <button class="icon-btn" onclick="openStudentChat(${m.id})">Nhắn tin</button>
          <button class="icon-btn danger" onclick="releaseStudent(${m.id})">Bỏ nhận</button>
        </td></tr>`).join('') : `<tr><td colspan="5"><div class="empty-state">Bạn chưa có học viên nào. Vào "Nhận học viên" để bắt đầu.</div></td></tr>`}</tbody></table>
  </div></div>`;
};
function releaseStudent(memberId) {
  confirmAction('Ngừng phụ trách học viên này?', async () => {
    try { await Api.post(`/progress/students/${memberId}/release`); toast('Đã bỏ nhận học viên.'); navigate('myStudents'); } catch (err) { showApiError(err); }
  });
}

/* ---- Nhận học viên ---- */
VIEWS.acceptStudents = async function () {
  const available = await Api.get('/progress/available-students');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Nhận học viên</div>
    <div class="page-desc">Chọn hội viên để nhận làm học viên PT của bạn.</div></div>
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Họ tên</th><th>SĐT</th><th>Mục tiêu</th><th>PT hiện tại</th><th></th></tr></thead>
    <tbody>${available.length ? available.map((m) => `
      <tr><td>${m.name}</td><td class="mono">${m.phone || ''}</td><td>${m.goal || '—'}</td>
        <td>${m.trainerName ? m.trainerName : `<span class="badge badge-mute">Chưa có PT</span>`}</td>
        <td class="right"><button class="icon-btn" style="border-color:var(--volt);color:var(--volt);" onclick="acceptStudent(${m.id})">Nhận làm học viên</button></td></tr>`).join('')
      : `<tr><td colspan="5"><div class="empty-state">Tất cả hội viên đều đã là học viên của bạn.</div></td></tr>`}</tbody></table>
  </div></div>`;
};
function acceptStudent(memberId) {
  confirmAction('Nhận hội viên này làm học viên PT của bạn?', async () => {
    try { await Api.post(`/progress/students/${memberId}/accept`); toast('Đã nhận học viên mới.'); navigate('myStudents'); } catch (err) { showApiError(err); }
  });
}

/* ---- Thư viện bài tập ---- */
VIEWS.exerciseLibrary = async function () {
  const exercises = await Api.get('/exercises');
  const rows = exercises.map((e) => `
    <tr><td>${e.name}</td><td>${e.muscleGroup || ''}</td><td>${e.sets} hiệp × ${e.reps || ''}</td><td>${e.description || '—'}</td>
      <td class="right"><button class="icon-btn" onclick="editExercise(${e.id})">Sửa</button>
      <button class="icon-btn danger" onclick="deleteExercise(${e.id})">Xóa</button></td></tr>`).join('');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Thư viện bài tập</div>
    <div class="page-desc">Quản lý danh sách bài tập dùng để xây dựng giáo án cho học viên.</div></div>
    <button class="btn btn-primary" onclick="editExercise(null)">+ Thêm bài tập</button>
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Tên bài tập</th><th>Nhóm cơ</th><th>Hiệp × Reps mặc định</th><th>Mô tả</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="5"><div class="empty-state">Chưa có bài tập nào.</div></td></tr>`}</tbody></table>
  </div></div>`;
};
async function editExercise(id) {
  let e = { name: '', muscleGroup: '', description: '', sets: 3, reps: '10-12' };
  if (id) { const list = await Api.get('/exercises'); e = list.find((x) => x.id === id); }
  openModal(`
    <div class="modal-title">${id ? 'Sửa' : 'Thêm'} bài tập</div>
    <div class="field"><label>Tên bài tập</label><input id="exf_name" value="${e.name}"></div>
    <div class="form-row">
      <div class="field"><label>Nhóm cơ</label><input id="exf_group" value="${e.muscleGroup || ''}"></div>
      <div class="field"><label>Số hiệp mặc định</label><input id="exf_sets" type="number" value="${e.sets}"></div>
    </div>
    <div class="field"><label>Reps / thời gian mặc định</label><input id="exf_reps" value="${e.reps || ''}"></div>
    <div class="field"><label>Mô tả / lưu ý kỹ thuật</label><textarea id="exf_desc" rows="2">${e.description || ''}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveExercise(${id || 'null'})">Lưu</button>
    </div>`);
}
async function saveExercise(id) {
  const name = document.getElementById('exf_name').value.trim();
  if (!name) { toast('Vui lòng nhập tên bài tập.', true); return; }
  const data = {
    name, muscleGroup: document.getElementById('exf_group').value, description: document.getElementById('exf_desc').value,
    sets: Number(document.getElementById('exf_sets').value), reps: document.getElementById('exf_reps').value,
  };
  try {
    if (id) await Api.put(`/exercises/${id}`, data); else await Api.post('/exercises', data);
    toast(id ? 'Đã cập nhật bài tập.' : 'Đã thêm bài tập.'); closeModal(); navigate('exerciseLibrary');
  } catch (err) { showApiError(err); }
}
function deleteExercise(id) {
  confirmAction('Xóa bài tập này khỏi thư viện?', async () => {
    try { await Api.del(`/exercises/${id}`); toast('Đã xóa.'); navigate('exerciseLibrary'); } catch (err) { showApiError(err); }
  });
}

/* ---- Giáo án tập luyện ---- */
let currentPlanId = null;
VIEWS.lessonPlans = async function () {
  const isTrainer = SESSION.role === 'trainer';
  const plans = await Api.get('/lesson-plans');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Giáo án tập luyện</div>
    <div class="page-desc">${isTrainer ? 'Xây dựng và quản lý giáo án tập luyện chi tiết cho từng học viên.' : 'Giáo án tập luyện huấn luyện viên đã thiết kế riêng cho bạn.'}</div></div>
    ${isTrainer ? `<button class="btn btn-primary" onclick="openNewPlanModal()">+ Tạo giáo án</button>` : ''}
  </div>
  <div class="grid grid-3">
    ${plans.length ? plans.map((p) => `
      <div class="panel" style="cursor:pointer;" onclick="openPlanDetail(${p.id})">
        <div class="panel-title" style="margin-bottom:8px;">${p.title}</div>
        <div class="hint" style="margin-bottom:10px;">Học viên: ${p.memberName} • Mục tiêu: ${p.goal || ''}</div>
        <div class="badge badge-info">${p.sessionCount} buổi tập</div>
      </div>`).join('') : `<div class="panel"><div class="empty-state">Chưa có giáo án nào.</div></div>`}
  </div>`;
};
async function openNewPlanModal() {
  const students = await Api.get('/progress/students');
  if (!students.length) { toast('Bạn chưa có học viên nào. Hãy "Nhận học viên" trước.', true); return; }
  openModal(`
    <div class="modal-title">Tạo giáo án mới</div>
    <div class="field"><label>Học viên</label>
      <select id="plf_member">${students.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
    <div class="field"><label>Tên giáo án</label><input id="plf_title" placeholder="vd: Giáo án tăng cơ 8 tuần"></div>
    <div class="field"><label>Mục tiêu</label>
      <select id="plf_goal">${['Giảm cân', 'Tăng cơ', 'Tăng sức bền', 'Duy trì sức khỏe', 'Phục hồi chấn thương'].map(g => `<option>${g}</option>`).join('')}</select></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveNewPlan()">Tạo giáo án</button>
    </div>`);
}
async function saveNewPlan() {
  const title = document.getElementById('plf_title').value.trim();
  if (!title) { toast('Vui lòng nhập tên giáo án.', true); return; }
  try {
    const { id } = await Api.post('/lesson-plans', {
      memberId: Number(document.getElementById('plf_member').value), title, goal: document.getElementById('plf_goal').value,
    });
    toast('Đã tạo giáo án.'); closeModal(); openPlanDetail(id);
  } catch (err) { showApiError(err); }
}
function openPlanDetail(id) { currentPlanId = id; navigate('lessonPlanDetail'); }
VIEWS.lessonPlanDetail = async function () {
  const p = await Api.get(`/lesson-plans/${currentPlanId}`);
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Giáo án</div><div class="page-title">${p.title}</div>
    <div class="page-desc">Học viên: ${p.memberName} • Mục tiêu: ${p.goal || ''} • Tạo ngày: ${p.createdDate}</div></div>
    <div class="toolbar">
      <button class="btn btn-secondary" onclick="navigate('lessonPlans')">← Danh sách giáo án</button>
      ${p.canEdit ? `<button class="btn btn-primary" onclick="openAddSessionModal()">+ Thêm buổi tập</button>` : ''}
    </div>
  </div>
  ${p.sessions.length ? p.sessions.map((s) => `
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">${s.label}</div>
        ${p.canEdit ? `<div class="toolbar">
          <button class="btn btn-secondary" style="padding:7px 12px;font-size:12.5px;" onclick="openAddItemModal(${s.id})">+ Thêm bài tập</button>
          <button class="icon-btn danger" onclick="deleteSession(${s.id})">Xóa buổi</button>
        </div>` : ''}
      </div>
      ${s.items.length ? `<div class="table-wrap"><table><thead><tr><th>Bài tập</th><th>Hiệp</th><th>Reps</th><th>Ghi chú</th>${p.canEdit ? '<th></th>' : ''}</tr></thead>
      <tbody>${s.items.map((it) => `<tr><td>${it.exerciseName}</td><td>${it.sets}</td><td>${it.reps}</td><td>${it.note || '—'}</td>
        ${p.canEdit ? `<td class="right"><button class="icon-btn danger" onclick="deleteItem(${s.id},${it.id})">Xóa</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`
      : `<div class="empty-state">Chưa có bài tập nào trong buổi này.</div>`}
    </div>`).join('') : `<div class="panel"><div class="empty-state">Giáo án chưa có buổi tập nào.</div></div>`}`;
};
function openAddSessionModal() {
  openModal(`
    <div class="modal-title">Thêm buổi tập</div>
    <div class="field"><label>Tên buổi tập</label><input id="sesf_label" placeholder="vd: Buổi 2 — Ngực & Tay sau"></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveSession()">Thêm</button></div>`);
}
async function saveSession() {
  const label = document.getElementById('sesf_label').value.trim();
  if (!label) { toast('Vui lòng nhập tên buổi tập.', true); return; }
  try {
    await Api.post(`/lesson-plans/${currentPlanId}/sessions`, { label });
    toast('Đã thêm buổi tập.'); closeModal(); navigate('lessonPlanDetail');
  } catch (err) { showApiError(err); }
}
function deleteSession(sessionId) {
  confirmAction('Xóa buổi tập này khỏi giáo án?', async () => {
    try { await Api.del(`/lesson-plans/${currentPlanId}/sessions/${sessionId}`); toast('Đã xóa buổi tập.'); navigate('lessonPlanDetail'); } catch (err) { showApiError(err); }
  });
}
let currentSessionId = null;
async function openAddItemModal(sessionId) {
  currentSessionId = sessionId;
  const exercises = await Api.get('/exercises');
  if (!exercises.length) { toast('Thư viện bài tập trống. Vào "Thư viện bài tập" để thêm trước.', true); return; }
  openModal(`
    <div class="modal-title">Thêm bài tập vào buổi</div>
    <div class="field"><label>Bài tập</label>
      <select id="itf_exercise" onchange="prefillItemDefaults()">${exercises.map(e => `<option value="${e.id}" data-sets="${e.sets}" data-reps="${e.reps}">${e.name} (${e.muscleGroup || ''})</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="field"><label>Số hiệp</label><input id="itf_sets" type="number" value="${exercises[0].sets}"></div>
      <div class="field"><label>Reps / thời gian</label><input id="itf_reps" value="${exercises[0].reps || ''}"></div>
    </div>
    <div class="field"><label>Ghi chú</label><input id="itf_note" placeholder="vd: Tăng tạ nếu hoàn thành dễ dàng"></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveItem()">Thêm bài tập</button></div>`);
}
function prefillItemDefaults() {
  const sel = document.getElementById('itf_exercise');
  const opt = sel.options[sel.selectedIndex];
  document.getElementById('itf_sets').value = opt.dataset.sets;
  document.getElementById('itf_reps').value = opt.dataset.reps;
}
async function saveItem() {
  try {
    await Api.post(`/lesson-plans/${currentPlanId}/sessions/${currentSessionId}/items`, {
      exerciseId: Number(document.getElementById('itf_exercise').value),
      sets: Number(document.getElementById('itf_sets').value),
      reps: document.getElementById('itf_reps').value, note: document.getElementById('itf_note').value,
    });
    toast('Đã thêm bài tập vào buổi.'); closeModal(); navigate('lessonPlanDetail');
  } catch (err) { showApiError(err); }
}
function deleteItem(sessionId, itemId) {
  Api.del(`/lesson-plans/${currentPlanId}/sessions/${sessionId}/items/${itemId}`)
    .then(() => { toast('Đã xóa bài tập.'); navigate('lessonPlanDetail'); })
    .catch(showApiError);
}

/* ---- Theo dõi tiến độ (trainer) ---- */
VIEWS.progressTracking = async function () {
  const students = await Api.get('/progress/students');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Theo dõi tiến độ</div>
    <div class="page-desc">Xem lịch sử điểm danh, tóm tắt AI và ghi chú tiến độ của từng học viên.</div></div>
  </div>
  <div class="panel"><div class="field mb-0"><label>Chọn học viên</label>
    <select id="pt_member" onchange="openStudentProgress(Number(this.value))">
      <option value="">— Chọn học viên —</option>
      ${students.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
    </select></div></div>
  <div id="pt_output"></div>`;
};
async function openStudentProgress(memberId) {
  navigate('progressTracking').then(async () => {
    const sel = document.getElementById('pt_member');
    if (sel) sel.value = memberId;
    const [summary, attendance, notes, member] = await Promise.all([
      Api.get(`/ai/progress-summary/${memberId}`),
      Api.get(`/attendance?memberId=${memberId}`),
      Api.get(`/progress/notes?memberId=${memberId}`),
      Api.get(`/members/${memberId}`),
    ]);
    const attTop = attendance.slice(0, 10);
    document.getElementById('pt_output').innerHTML = `
      <div class="panel ai-box"><div class="panel-title" style="margin-bottom:8px;">Tóm tắt AI — ${member.name}</div>
        <div class="ai-output">${summary.text}</div></div>
      <div class="panel"><div class="panel-head"><div class="panel-title">Lịch sử điểm danh gần đây</div></div>
        ${attTop.length ? `<table><thead><tr><th>Ngày</th><th>Giờ</th><th>Ghi chú</th></tr></thead>
        <tbody>${attTop.map(a => `<tr><td>${a.date}</td><td>${a.time}</td><td>${a.note || '—'}</td></tr>`).join('')}</tbody></table>`
        : `<div class="empty-state">Chưa có lượt điểm danh nào.</div>`}</div>
      <div class="panel"><div class="panel-head"><div class="panel-title">Ghi chú tiến độ của PT</div>
          <button class="btn btn-secondary" style="padding:7px 12px;font-size:12.5px;" onclick="openAddProgressNoteModal(${memberId})">+ Thêm ghi chú</button></div>
        ${notes.length ? notes.map(n => `<div class="ai-output" style="margin-top:0;margin-bottom:10px;"><b>${n.date}</b>\n${n.note}</div>`).join('')
        : `<div class="empty-state">Chưa có ghi chú nào.</div>`}</div>`;
  });
}
function openAddProgressNoteModal(memberId) {
  openModal(`
    <div class="modal-title">Thêm ghi chú tiến độ</div>
    <div class="field"><label>Nội dung ghi chú</label><textarea id="pnf_note" rows="3" placeholder="vd: Học viên tăng sức bền rõ rệt."></textarea></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="saveProgressNote(${memberId})">Lưu ghi chú</button></div>`);
}
async function saveProgressNote(memberId) {
  const note = document.getElementById('pnf_note').value.trim();
  if (!note) { toast('Vui lòng nhập nội dung ghi chú.', true); return; }
  try {
    await Api.post('/progress/notes', { memberId, note });
    toast('Đã lưu ghi chú tiến độ.'); closeModal(); openStudentProgress(memberId);
  } catch (err) { showApiError(err); }
}

/* ---- Tương tác với học viên ---- */
VIEWS.interact = async function () {
  const isTrainer = SESSION.role === 'trainer';
  if (isTrainer) {
    const students = await Api.get('/progress/students');
    return `
    <div class="topbar"><div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Tương tác với học viên</div>
      <div class="page-desc">Nhắn tin trao đổi trực tiếp với học viên bạn đang phụ trách.</div></div></div>
    <div class="panel"><div class="field mb-0"><label>Chọn học viên</label>
      <select id="chat_member" onchange="openStudentChat(Number(this.value))">
        <option value="">— Chọn học viên —</option>
        ${students.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
      </select></div></div>
    <div id="chat_output"></div>`;
  }
  const member = await Api.get(`/members/${SESSION.memberId}`);
  if (!member.trainerId) {
    return `<div class="topbar"><div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Tương tác với HLV</div>
      <div class="page-desc">Bạn chưa được huấn luyện viên nào nhận làm học viên PT.</div></div></div>
      <div class="panel"><div class="empty-state">Liên hệ lễ tân hoặc đăng ký gói có PT để được ghép huấn luyện viên.</div></div>`;
  }
  return `<div class="topbar"><div><div class="page-eyebrow">Công việc PT</div><div class="page-title">Tương tác với HLV</div>
    <div class="page-desc">Trao đổi trực tiếp với huấn luyện viên ${member.trainerName} của bạn.</div></div></div>
    <div id="chat_output"></div>`;
};
function afterRenderInteractMember() {
  Api.get(`/members/${SESSION.memberId}`).then((member) => {
    if (member.trainerId) openStudentChat(member.id);
  });
}
async function openStudentChat(memberId) {
  const chatEl = document.getElementById('chat_output');
  if (!chatEl) { await navigate('interact'); return openStudentChat(memberId); }
  const memberSelect = document.getElementById('chat_member');
  if (memberSelect) memberSelect.value = memberId;

  const member = await Api.get(`/members/${memberId}`);
  const trainerId = SESSION.role === 'trainer' ? SESSION.trainerId : member.trainerId;
  const thread = await Api.get(`/messages?memberId=${memberId}&trainerId=${trainerId}`);
  const title = SESSION.role === 'trainer' ? 'Trò chuyện với ' + member.name : 'Trò chuyện với ' + member.trainerName;

  document.getElementById('chat_output').innerHTML = `
    <div class="panel">
      <div class="panel-title" style="margin-bottom:12px;">${title}</div>
      <div class="chat-bubble-row">${thread.length ? thread.map((msg) => `
          <div style="align-self:${msg.sender === SESSION.role ? 'flex-end' : 'flex-start'};">
            <div class="chat-bubble" style="background:${msg.sender === SESSION.role ? 'var(--volt)' : 'var(--surface-2)'};color:${msg.sender === SESSION.role ? '#10130A' : 'var(--chalk)'};">${msg.text}</div>
          </div>`).join('') : `<div class="empty-state">Chưa có tin nhắn nào. Hãy bắt đầu trò chuyện!</div>`}</div>
      <div style="display:flex;gap:8px;">
        <input id="chat_input" placeholder="Nhập tin nhắn..." onkeydown="if(event.key==='Enter') sendChatMessage(${memberId},${trainerId})">
        <button class="btn btn-primary" onclick="sendChatMessage(${memberId},${trainerId})">Gửi</button>
      </div>
    </div>`;
}
async function sendChatMessage(memberId, trainerId) {
  const input = document.getElementById('chat_input');
  const text = input.value.trim();
  if (!text) return;
  try {
    await Api.post('/messages', { memberId, trainerId, text });
    openStudentChat(memberId);
  } catch (err) { showApiError(err); }
}

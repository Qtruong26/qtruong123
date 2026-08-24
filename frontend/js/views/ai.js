/* ---- Gợi ý lịch tập AI ---- */
VIEWS.aiAssist = async function () {
  const isMember = SESSION.role === 'member';
  let defaultMember = null;
  if (isMember) defaultMember = await Api.get(`/members/${SESSION.memberId}`);
  const members = !isMember ? await Api.get('/members') : [];

  return `
  <div class="topbar">
    <div><div class="page-eyebrow">AI trợ lý</div><div class="page-title">Gợi ý lịch tập AI</div>
    <div class="page-desc">AI gợi ý lịch tập tham khảo dựa trên mục tiêu, thời gian rảnh và mức độ hiện tại của hội viên.</div></div>
  </div>
  <div class="panel ai-box">
    <div class="panel-head"><div class="panel-title">Thông tin đầu vào</div></div>
    ${!isMember ? `<div class="field"><label>Chọn hội viên</label>
      <select id="ai_member" onchange="prefillAiMember()">${members.map(m => `<option value="${m.id}" data-goal="${m.goal}" data-level="${m.level}">${m.name}</option>`).join('')}</select></div>` : ''}
    <div class="form-row">
      <div class="field"><label>Mục tiêu</label>
        <select id="ai_goal">${['Giảm cân', 'Tăng cơ', 'Tăng sức bền', 'Duy trì sức khỏe', 'Phục hồi chấn thương'].map(g => `<option ${defaultMember && defaultMember.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label>Mức độ hiện tại</label>
        <select id="ai_level">${['Mới bắt đầu', 'Trung bình', 'Nâng cao'].map(g => `<option ${defaultMember && defaultMember.level === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    </div>
    <div class="field"><label>Thời gian rảnh trong tuần</label>
      <div class="tag-row" id="ai_days">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => `<span class="chip ${i % 2 === 0 ? 'selected' : ''}" onclick="this.classList.toggle('selected')" data-day="${d}">${d}</span>`).join('')}</div>
    </div>
    <button class="btn btn-primary" onclick="runAiSuggest()">Tạo gợi ý lịch tập</button>
    <div class="ai-disclaimer">⚠️ Đây là gợi ý tham khảo do AI tạo ra dựa trên dữ liệu bạn cung cấp, <b>không thay thế tư vấn y tế hoặc chuyên môn thể chất</b>. Vui lòng trao đổi với huấn luyện viên hoặc bác sĩ trước khi bắt đầu chương trình tập mới.</div>
    <div id="ai_output"></div>
  </div>`;
};
function prefillAiMember() {
  const sel = document.getElementById('ai_member');
  const opt = sel.options[sel.selectedIndex];
  document.getElementById('ai_goal').value = opt.dataset.goal || 'Duy trì sức khỏe';
  document.getElementById('ai_level').value = opt.dataset.level || 'Mới bắt đầu';
}
async function runAiSuggest() {
  const goal = document.getElementById('ai_goal').value;
  const level = document.getElementById('ai_level').value;
  const availability = Array.from(document.querySelectorAll('#ai_days .chip.selected')).map((c) => c.dataset.day);
  if (!availability.length) { toast('Vui lòng chọn ít nhất 1 ngày rảnh.', true); return; }
  try {
    const { plan } = await Api.post('/ai/suggest-plan', { goal, level, availability });
    document.getElementById('ai_output').innerHTML = `<div class="ai-output"><b>Lịch tập tham khảo — mục tiêu: ${goal} (mức độ: ${level})</b>\n` +
      plan.map((p) => `<span class="plan-day">${p.day}</span>${p.focus} — cường độ: ${p.intensity}`).join('\n') + '</div>';
    toast('Đã tạo gợi ý lịch tập.');
  } catch (err) { showApiError(err); }
}

/* ---- Nhắc lịch / gia hạn ---- */
VIEWS.aiReminder = async function () {
  const members = await Api.get('/members');
  const rows = members.map((m) => `
    <tr><td>${m.name}</td><td>${m.activePackage ? m.activePackage.packageName : '—'}</td>
      <td>${pkgStatusBadge(m.packageStatus)}</td>
      <td class="right"><button class="icon-btn" onclick="genReminder(${m.id})">Tạo tin nhắn AI</button></td></tr>`).join('');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">AI trợ lý</div><div class="page-title">Nhắc lịch / Gia hạn gói</div>
    <div class="page-desc">AI sinh tin nhắn nhắc lịch tập hoặc gia hạn gói tập, ưu tiên hội viên sắp/đã hết hạn.</div></div>
    <button class="btn btn-secondary" onclick="generateAllReminders()">Tạo tin nhắn cho tất cả hội viên cần gia hạn</button>
  </div>
  <div class="panel"><div class="table-wrap"><table><thead><tr><th>Hội viên</th><th>Gói</th><th>Trạng thái</th><th></th></tr></thead>
    <tbody>${rows}</tbody></table></div></div>
  <div id="reminder_output"></div>`;
};
async function genReminder(memberId) {
  try {
    const { message } = await Api.get(`/ai/reminder/${memberId}`);
    const members = await Api.get('/members');
    const m = members.find((x) => x.id === memberId);
    document.getElementById('reminder_output').innerHTML = `
      <div class="panel ai-box"><div class="panel-title" style="margin-bottom:10px;">Tin nhắn gợi ý cho ${m.name}</div>
      <div class="ai-output">${message}</div>
      <div class="hint">Bạn có thể sao chép và gửi qua SMS/Zalo/Email cho hội viên.</div></div>`;
  } catch (err) { showApiError(err); }
}
async function generateAllReminders() {
  try {
    const results = await Api.get('/ai/reminders/bulk');
    if (!results.length) {
      document.getElementById('reminder_output').innerHTML = `<div class="panel"><div class="empty-state">Không có hội viên nào cần nhắc gia hạn lúc này 🎉</div></div>`;
      return;
    }
    const html = results.map((r) => `<div class="ai-output"><b>${r.memberName}</b>\n${r.message}</div>`).join('');
    document.getElementById('reminder_output').innerHTML = `<div class="panel ai-box"><div class="panel-title" style="margin-bottom:10px;">Tin nhắn gợi ý (${results.length} hội viên)</div>${html}</div>`;
    toast(`Đã tạo ${results.length} tin nhắn nhắc gia hạn.`);
  } catch (err) { showApiError(err); }
}

/* ---- Tóm tắt tiến độ ---- */
VIEWS.aiProgress = async function () {
  const isMember = SESSION.role === 'member';
  const members = !isMember ? await Api.get('/members') : [];
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">AI trợ lý</div><div class="page-title">Tóm tắt tiến độ tập luyện</div>
    <div class="page-desc">AI tóm tắt tiến độ tập luyện của hội viên dựa trên lịch sử điểm danh.</div></div>
  </div>
  <div class="panel ai-box">
    ${!isMember ? `<div class="field"><label>Chọn hội viên</label>
      <select id="prog_member">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
      <button class="btn btn-primary" onclick="runProgress()">Tạo tóm tắt</button>` :
      `<button class="btn btn-primary" onclick="runProgress(${SESSION.memberId})">Xem tóm tắt tiến độ của tôi</button>`}
    <div class="ai-disclaimer">⚠️ Tóm tắt này do AI tạo tự động từ dữ liệu điểm danh, chỉ mang tính tham khảo và không thay thế đánh giá chuyên môn.</div>
    <div id="progress_output"></div>
  </div>`;
};
async function runProgress(fixedId) {
  const memberId = fixedId || Number(document.getElementById('prog_member').value);
  try {
    const result = await Api.get(`/ai/progress-summary/${memberId}`);
    const m = await Api.get(`/members/${memberId}`);
    document.getElementById('progress_output').innerHTML = `<div class="ai-output"><b>Tóm tắt tiến độ — ${m.name}</b>\n${result.text}</div>`;
  } catch (err) { showApiError(err); }
}

/* ---- Hỏi đáp chatbot cho hội viên ---- */
VIEWS.aiChatBot = async function () {
  const SUGGESTIONS = [
    'Gói tập của tôi còn bao nhiêu ngày?', 'Lịch tập tiếp theo của tôi là khi nào?',
    'Làm sao để gia hạn gói tập?', 'Huấn luyện viên của tôi là ai?', 'Làm sao để check-in?',
  ];
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">AI trợ lý</div><div class="page-title">Hỏi đáp AI</div>
    <div class="page-desc">Trợ lý AI trả lời nhanh các câu hỏi thường gặp về gói tập, lịch tập, huấn luyện viên và thanh toán.</div></div>
  </div>
  <div class="panel ai-box">
    <div id="aichat_output"></div>
    <div class="tag-row" style="margin-top:10px;margin-bottom:12px;">
      ${SUGGESTIONS.map(s => `<span class="chip" onclick="sendAiChatQuick('${s.replace(/'/g, "\\'")}')">${s}</span>`).join('')}
    </div>
    <div style="display:flex;gap:8px;">
      <input id="aichat_input" placeholder="Nhập câu hỏi của bạn..." onkeydown="if(event.key==='Enter') sendAiChatMessage()">
      <button class="btn btn-primary" onclick="sendAiChatMessage()">Gửi</button>
    </div>
    <div class="ai-disclaimer" style="margin-top:14px;">⚠️ Trợ lý AI này trả lời tự động, chỉ mang tính tham khảo. Với vấn đề khẩn cấp hoặc chuyên môn, vui lòng liên hệ lễ tân hoặc huấn luyện viên trực tiếp.</div>
  </div>`;
};
async function renderAiChat() {
  const el = document.getElementById('aichat_output');
  if (!el) return;
  const thread = await Api.get('/ai/chat/history');
  el.innerHTML = `<div class="chat-bubble-row">${thread.length ? thread.map((c) => `
      <div style="align-self:${c.sender === 'user' ? 'flex-end' : 'flex-start'};">
        <div class="chat-bubble" style="background:${c.sender === 'user' ? 'var(--volt)' : 'var(--surface-2)'};color:${c.sender === 'user' ? '#10130A' : 'var(--chalk)'};">${c.text}</div>
      </div>`).join('') : `<div class="empty-state">Chào bạn! Hãy đặt câu hỏi hoặc chọn gợi ý bên dưới để bắt đầu.</div>`}</div>`;
}
function sendAiChatQuick(text) { document.getElementById('aichat_input').value = text; sendAiChatMessage(); }
async function sendAiChatMessage() {
  const input = document.getElementById('aichat_input');
  const question = input.value.trim();
  if (!question) return;
  input.value = '';
  try {
    await Api.post('/ai/chat', { question });
    await renderAiChat();
  } catch (err) { showApiError(err); }
}

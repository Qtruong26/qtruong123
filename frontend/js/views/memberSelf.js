/* ---- Thông tin cá nhân ---- */
VIEWS.myProfile = async function () {
  const m = await Api.get(`/members/${SESSION.memberId}`);
  return `
  <div class="topbar"><div><div class="page-eyebrow">Tài khoản của tôi</div><div class="page-title">Thông tin cá nhân</div>
    <div class="page-desc">Xem và cập nhật thông tin liên hệ, mục tiêu tập luyện của bạn.</div></div></div>
  <div class="panel" style="max-width:520px;">
    <div class="field"><label>Họ tên</label><input id="mp_name" value="${m.name}"></div>
    <div class="form-row">
      <div class="field"><label>Số điện thoại</label><input id="mp_phone" value="${m.phone || ''}"></div>
      <div class="field"><label>Email</label><input id="mp_email" value="${m.email || ''}"></div>
    </div>
    <div class="form-row">
      <div class="field"><label>Mục tiêu tập luyện</label>
        <select id="mp_goal">${['Giảm cân', 'Tăng cơ', 'Tăng sức bền', 'Duy trì sức khỏe', 'Phục hồi chấn thương'].map(g => `<option ${m.goal === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
      <div class="field"><label>Mức độ hiện tại</label>
        <select id="mp_level">${['Mới bắt đầu', 'Trung bình', 'Nâng cao'].map(g => `<option ${m.level === g ? 'selected' : ''}>${g}</option>`).join('')}</select></div>
    </div>
    <div class="hint" style="margin-bottom:14px;">Ngày tham gia: ${m.joinDate} • Huấn luyện viên phụ trách: ${m.trainerName || 'Chưa có'}</div>
    <button class="btn btn-primary" onclick="saveMyProfile()">Lưu thay đổi</button>
  </div>`;
};
async function saveMyProfile() {
  const name = document.getElementById('mp_name').value.trim();
  if (!name) { toast('Vui lòng nhập họ tên.', true); return; }
  const data = {
    name, phone: document.getElementById('mp_phone').value.trim(), email: document.getElementById('mp_email').value.trim(),
    goal: document.getElementById('mp_goal').value, level: document.getElementById('mp_level').value,
  };
  try {
    await Api.put(`/members/${SESSION.memberId}`, data);
    SESSION.name = name; Auth.setSession(Auth.getToken(), SESSION);
    document.getElementById('userNameChip').textContent = name;
    document.getElementById('userNameChipMobile').textContent = name;
    document.getElementById('userAvatar').textContent = name[0];
    document.getElementById('userAvatarMobile').textContent = name[0];
    toast('Đã lưu thông tin cá nhân.');
  } catch (err) { showApiError(err); }
}

/* ---- Đăng ký / gia hạn gói tập (tự phục vụ) ---- */
VIEWS.myPackages = async function () {
  const [member, packages, history] = await Promise.all([
    Api.get(`/members/${SESSION.memberId}`), Api.get('/packages'), Api.get('/packages/enrollments/list'),
  ]);
  const mp = member.activePackage;
  return `
  <div class="topbar"><div><div class="page-eyebrow">Tài khoản của tôi</div><div class="page-title">Đăng ký / gia hạn gói tập</div>
    <div class="page-desc">Xem gói hiện tại và đăng ký gói mới hoặc gia hạn trực tiếp.</div></div></div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Gói hiện tại</div></div>
    ${mp ? `<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <div><b>${mp.packageName}</b><div class="hint">Hiệu lực: ${mp.start_date} → ${mp.end_date}</div></div>
      ${pkgStatusBadge(member.packageStatus, daysBetween(todayStr(), mp.end_date))}</div>` : `<div class="empty-state">Bạn chưa đăng ký gói tập nào.</div>`}
  </div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Các gói khả dụng</div></div>
    <div class="grid grid-2">${packages.map((p) => `
      <div class="panel" style="margin-bottom:0;">
        <div class="panel-title" style="margin-bottom:6px;">${p.name}</div>
        <div class="hint" style="margin-bottom:10px;">${p.description || ''} • ${p.durationDays} ngày</div>
        <div class="stat-value mono" style="font-size:18px;margin-bottom:12px;">${fmtMoney(p.price)}</div>
        <button class="btn btn-primary btn-block" onclick="openSelfEnrollModal(${p.id})">Đăng ký / Gia hạn</button>
      </div>`).join('')}</div>
  </div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Lịch sử gói tập</div></div>
    ${history.length ? `<table><thead><tr><th>Gói</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead>
    <tbody>${history.map((h) => `<tr><td>${h.packageName}</td><td>${h.startDate}</td><td>${h.endDate}</td>
      <td>${pkgStatusBadge(daysBetween(todayStr(), h.endDate) < 0 ? 'expired' : (daysBetween(todayStr(), h.endDate) <= 7 ? 'expiring' : 'active'))}</td></tr>`).join('')}</tbody></table>`
    : `<div class="empty-state">Chưa có lịch sử gói tập.</div>`}
  </div>`;
};
async function openSelfEnrollModal(packageId) {
  const packages = await Api.get('/packages');
  const pkg = packages.find((p) => p.id === packageId);
  openModal(`
    <div class="modal-title">Đăng ký: ${pkg.name}</div>
    <div class="hint" style="margin-bottom:14px;">${pkg.description || ''} • ${pkg.durationDays} ngày • ${fmtMoney(pkg.price)}</div>
    <div class="field"><label>Ngày bắt đầu</label><input id="sef_start" type="date" value="${todayStr()}"></div>
    <div class="field"><label>Hình thức thanh toán</label>
      <select id="sef_method"><option>Chuyển khoản</option><option>Tiền mặt</option><option>Thẻ</option></select></div>
    <div class="hint">Chọn "Chuyển khoản" để nhận mã QR thanh toán ngay.</div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="selfEnroll(${packageId}, document.getElementById('sef_start').value, document.getElementById('sef_method').value)">Tiếp tục</button></div>`);
}

/* ---- Check-in (tự phục vụ) ---- */
VIEWS.selfCheckin = async function () {
  const list = await Api.get('/attendance');
  const openSession = list.find((a) => !a.checkOutTime);
  return `
  <div class="topbar"><div><div class="page-eyebrow">Tài khoản của tôi</div><div class="page-title">Check-in</div>
    <div class="page-desc">Tự check-in khi đến phòng gym và check-out khi kết thúc buổi tập.</div></div>
    ${!openSession ? `<button class="btn btn-primary" onclick="selfCheckin()">+ Check-in ngay</button>`
      : `<button class="btn btn-primary" onclick="doCheckout(${openSession.id})">Check-out buổi hiện tại</button>`}
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Ghi chú</th></tr></thead>
    <tbody>${list.length ? list.map((a) => `<tr><td>${a.date}</td><td class="mono">${a.time}</td><td class="mono">${a.checkOutTime || '—'}</td><td>${a.note || '—'}</td></tr>`).join('')
      : `<tr><td colspan="4"><div class="empty-state">Chưa có lượt check-in nào.</div></td></tr>`}</tbody></table>
  </div></div>`;
};
async function selfCheckin() {
  try {
    const member = await Api.get(`/members/${SESSION.memberId}`);
    if (member.packageStatus === 'expired') {
      confirmAction('Gói tập của bạn đã hết hạn. Vẫn muốn check-in?', doSelfCheckinNow);
      return;
    }
    await doSelfCheckinNow();
  } catch (err) { showApiError(err); }
}
async function doSelfCheckinNow() {
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  try {
    await Api.post('/attendance', { date: todayStr(), time, note: '' });
    toast('Check-in thành công. Chúc bạn tập luyện hiệu quả!'); navigate('selfCheckin');
  } catch (err) { showApiError(err); }
}

/* ---- Thanh toán (lịch sử của tôi) ---- */
VIEWS.myPayments = async function () {
  const list = await Api.get('/packages/payments/list');
  const total = list.reduce((s, p) => s + Number(p.amount), 0);
  return `
  <div class="topbar"><div><div class="page-eyebrow">Tài khoản của tôi</div><div class="page-title">Thanh toán</div>
    <div class="page-desc">Lịch sử các khoản thanh toán gói tập của bạn.</div></div></div>
  <div class="grid grid-3" style="margin-bottom:20px;">
    <div class="stat-tile"><div class="bar" style="background:var(--volt);"></div><div class="stat-label">Tổng đã thanh toán</div><div class="stat-value" style="font-size:20px;">${fmtMoney(total)}</div></div>
    <div class="stat-tile"><div class="bar" style="background:var(--steel);"></div><div class="stat-label">Số giao dịch</div><div class="stat-value">${list.length}</div></div>
  </div>
  <div class="panel"><div class="table-wrap">
    <table><thead><tr><th>Ngày</th><th>Gói</th><th>Số tiền</th><th>Hình thức</th></tr></thead>
    <tbody>${list.length ? list.map((p) => `<tr><td>${p.date}</td><td>${p.packageName}</td><td>${fmtMoney(p.amount)}</td><td>${p.method}</td></tr>`).join('')
      : `<tr><td colspan="4"><div class="empty-state">Chưa có giao dịch nào.</div></td></tr>`}</tbody></table>
  </div></div>`;
};

/* ---- Theo dõi quá trình tập luyện (đầy đủ cho hội viên) ---- */
VIEWS.myProgress = async function () {
  const [summary, attendance, notes] = await Promise.all([
    Api.get(`/ai/progress-summary/${SESSION.memberId}`), Api.get('/attendance'), Api.get('/progress/notes'),
  ]);
  const attTop = attendance.slice(0, 15);
  return `
  <div class="topbar"><div><div class="page-eyebrow">Tài khoản của tôi</div><div class="page-title">Theo dõi quá trình tập luyện</div>
    <div class="page-desc">Tổng hợp lịch sử tập luyện, tóm tắt AI và ghi chú từ huấn luyện viên của bạn.</div></div></div>
  <div class="panel ai-box"><div class="panel-title" style="margin-bottom:8px;">Tóm tắt AI</div>
    <div class="ai-output">${summary.text}</div>
    <div class="ai-disclaimer">⚠️ Tóm tắt do AI tạo tự động từ lịch sử điểm danh, chỉ mang tính tham khảo.</div></div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Lịch sử tập luyện gần đây</div></div>
    ${attTop.length ? `<table><thead><tr><th>Ngày</th><th>Giờ vào</th><th>Giờ ra</th><th>Ghi chú</th></tr></thead>
    <tbody>${attTop.map(a => `<tr><td>${a.date}</td><td class="mono">${a.time}</td><td class="mono">${a.checkOutTime || '—'}</td><td>${a.note || '—'}</td></tr>`).join('')}</tbody></table>`
    : `<div class="empty-state">Chưa có lượt tập luyện nào.</div>`}</div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Ghi chú từ huấn luyện viên</div></div>
    ${notes.length ? notes.map(n => `<div class="ai-output" style="margin-top:0;margin-bottom:10px;"><b>${n.date}</b>\n${n.note}</div>`).join('')
    : `<div class="empty-state">Chưa có ghi chú nào từ huấn luyện viên.</div>`}</div>`;
};

/* ---- Thông báo ---- */
VIEWS.notifications = async function () {
  const member = await Api.get(`/members/${SESSION.memberId}`);
  const items = [];
  const mp = member.activePackage;
  if (mp) {
    const d = daysBetween(todayStr(), mp.end_date);
    if (d < 0) items.push({ type: 'danger', title: 'Gói tập đã hết hạn', desc: `Gói "${mp.packageName}" đã hết hạn ${Math.abs(d)} ngày trước. Gia hạn ngay để tiếp tục tập luyện.`, action: { label: 'Gia hạn ngay', view: 'myPackages' } });
    else if (d <= 7) items.push({ type: 'warn', title: 'Gói tập sắp hết hạn', desc: `Gói "${mp.packageName}" còn hiệu lực ${d} ngày (đến ${mp.end_date}).`, action: { label: 'Gia hạn ngay', view: 'myPackages' } });
  } else {
    items.push({ type: 'mute', title: 'Chưa có gói tập', desc: 'Bạn chưa đăng ký gói tập nào. Đăng ký ngay để bắt đầu tập luyện.', action: { label: 'Đăng ký gói', view: 'myPackages' } });
  }

  const schedules = await Api.get('/schedules');
  const upcoming = schedules.filter((s) => s.date >= todayStr() && daysBetween(todayStr(), s.date) <= 3);
  upcoming.forEach((s) => items.push({ type: 'info', title: 'Lịch tập sắp tới', desc: `${s.date} lúc ${s.time} với HLV ${s.trainerName}.`, action: { label: 'Xem lịch tập', view: 'schedule' } }));

  if (member.trainerId) {
    const msgs = await Api.get(`/messages?memberId=${SESSION.memberId}&trainerId=${member.trainerId}`);
    const lastFromTrainer = [...msgs].reverse().find((m) => m.sender === 'trainer');
    if (lastFromTrainer) items.push({ type: 'info', title: 'Tin nhắn từ huấn luyện viên', desc: lastFromTrainer.text, action: { label: 'Trả lời', view: 'interact' } });

    const notes = await Api.get('/progress/notes');
    if (notes[0]) items.push({ type: 'ok', title: 'Ghi chú tiến độ mới', desc: notes[0].note, action: { label: 'Xem tiến độ', view: 'myProgress' } });
  }

  const badgeClass = { danger: 'badge-danger', warn: 'badge-warn', info: 'badge-info', ok: 'badge-ok', mute: 'badge-mute' };
  const labelText = { danger: 'Khẩn cấp', warn: 'Nhắc nhở', info: 'Thông tin', ok: 'Cập nhật', mute: 'Gợi ý' };
  return `
  <div class="topbar"><div><div class="page-eyebrow">Tổng quan</div><div class="page-title">Thông báo</div>
    <div class="page-desc">Chào ${member.name}! Đây là các cập nhật mới nhất dành cho bạn.</div></div></div>
  ${items.length ? items.map((it) => `
    <div class="panel" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
      <div><span class="badge ${badgeClass[it.type]}" style="margin-bottom:8px;">${labelText[it.type]}</span>
        <div style="font-weight:600;margin:6px 0 3px;">${it.title}</div>
        <div class="hint" style="font-size:12.5px;">${it.desc}</div></div>
      <button class="btn btn-secondary" onclick="navigate('${it.action.view}')">${it.action.label}</button>
    </div>`).join('') : `<div class="panel"><div class="empty-state">Không có thông báo nào mới 🎉</div></div>`}`;
};

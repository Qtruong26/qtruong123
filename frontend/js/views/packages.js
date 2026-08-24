VIEWS.packages = async function () {
  const [packages, enrollments, payments] = await Promise.all([
    Api.get('/packages'), Api.get('/packages/enrollments/list'), Api.get('/packages/payments/list'),
  ]);

  const pkgRows = packages.map((p) => `
    <tr><td>${p.name}</td><td>${p.durationDays} ngày</td><td>${fmtMoney(p.price)}</td><td>${p.description || ''}</td>
      <td class="right">${SESSION.role === 'admin' ? `<button class="icon-btn danger" onclick="deletePackage(${p.id})">Xóa</button>` : ''}</td></tr>`).join('');

  const enrollRows = enrollments.map((e) => `
    <tr><td>${e.memberName}</td><td>${e.packageName}</td><td>${e.startDate}</td><td>${e.endDate}</td>
      <td>${pkgStatusBadge(daysBetween(todayStr(), e.endDate) < 0 ? 'expired' : (daysBetween(todayStr(), e.endDate) <= 7 ? 'expiring' : 'active'), daysBetween(todayStr(), e.endDate))}</td></tr>`).join('');

  const payRows = payments.map((p) => `
    <tr><td>${p.date}</td><td>${p.memberName}</td><td>${p.packageName}</td><td>${fmtMoney(p.amount)}</td><td>${p.method}</td></tr>`).join('');

  window.__packagesCache = packages; // dùng lại khi mở modal đăng ký

  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Vận hành</div><div class="page-title">Gói tập &amp; Thanh toán</div>
      <div class="page-desc">Quản lý các gói tập, đăng ký/gia hạn cho hội viên và lịch sử thanh toán.</div></div>
    ${SESSION.role === 'admin' ? `<button class="btn btn-secondary" onclick="openPackageModal()">+ Gói mới</button>` : ''}
  </div>
  <div class="panel"><div class="panel-head"><div class="panel-title">Danh sách gói tập</div></div>
    <div class="table-wrap"><table><thead><tr><th>Tên gói</th><th>Thời hạn</th><th>Giá</th><th>Mô tả</th><th></th></tr></thead>
    <tbody>${pkgRows}</tbody></table></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Đăng ký / Gia hạn gói cho hội viên</div>
      <button class="btn btn-primary" onclick="openEnrollModal()">+ Đăng ký gói</button></div>
    <div class="table-wrap"><table><thead><tr><th>Hội viên</th><th>Gói</th><th>Bắt đầu</th><th>Kết thúc</th><th>Trạng thái</th></tr></thead>
    <tbody>${enrollRows || `<tr><td colspan="5"><div class="empty-state">Chưa có đăng ký nào.</div></td></tr>`}</tbody></table></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Lịch sử thanh toán</div></div>
    <div class="table-wrap"><table><thead><tr><th>Ngày</th><th>Hội viên</th><th>Gói</th><th>Số tiền</th><th>Hình thức</th></tr></thead>
    <tbody>${payRows || `<tr><td colspan="5"><div class="empty-state">Chưa có giao dịch nào.</div></td></tr>`}</tbody></table></div>
  </div>`;
};

function openPackageModal() {
  openModal(`
    <div class="modal-title">Thêm gói tập</div>
    <div class="field"><label>Tên gói</label><input id="pf_name"></div>
    <div class="form-row">
      <div class="field"><label>Thời hạn (ngày)</label><input id="pf_days" type="number" value="30"></div>
      <div class="field"><label>Giá (VNĐ)</label><input id="pf_price" type="number" value="500000"></div>
    </div>
    <div class="field"><label>Mô tả</label><textarea id="pf_desc" rows="2"></textarea></div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="savePackage()">Lưu</button>
    </div>`);
}
async function savePackage() {
  const name = document.getElementById('pf_name').value.trim();
  if (!name) { toast('Vui lòng nhập tên gói.', true); return; }
  try {
    await Api.post('/packages', {
      name, durationDays: Number(document.getElementById('pf_days').value),
      price: Number(document.getElementById('pf_price').value), description: document.getElementById('pf_desc').value,
    });
    toast('Đã thêm gói tập.'); closeModal(); navigate('packages');
  } catch (err) { showApiError(err); }
}
function deletePackage(id) {
  confirmAction('Xóa gói tập này?', async () => {
    try { await Api.del(`/packages/${id}`); toast('Đã xóa gói.'); navigate('packages'); } catch (err) { showApiError(err); }
  });
}

async function openEnrollModal() {
  const members = await Api.get('/members');
  const packages = window.__packagesCache || await Api.get('/packages');
  openModal(`
    <div class="modal-title">Đăng ký / Gia hạn gói</div>
    <div class="field"><label>Hội viên</label>
      <select id="ef_member">${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
    <div class="field"><label>Gói tập</label>
      <select id="ef_package">${packages.map(p => `<option value="${p.id}">${p.name} — ${fmtMoney(p.price)}</option>`).join('')}</select></div>
    <div class="form-row">
      <div class="field"><label>Ngày bắt đầu</label><input id="ef_start" type="date" value="${todayStr()}"></div>
      <div class="field"><label>Hình thức thanh toán</label>
        <select id="ef_method"><option>Tiền mặt</option><option>Chuyển khoản</option><option>Thẻ</option></select></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="submitEnroll()">Xác nhận</button>
    </div>`);
}
async function submitEnroll() {
  const memberId = Number(document.getElementById('ef_member').value);
  const packageId = Number(document.getElementById('ef_package').value);
  const startDate = document.getElementById('ef_start').value;
  const method = document.getElementById('ef_method').value;
  try {
    const data = await Api.post('/packages/enrollments', { memberId, packageId, startDate, method });
    if (data.requiresPayment) showPaymentQrModal(data, { memberId, packageId, startDate, method });
    else { toast('Đã đăng ký gói và ghi nhận thanh toán.'); closeModal(); navigate('packages'); }
  } catch (err) { showApiError(err); }
}

/** Đăng ký tự phục vụ cho hội viên (gọi từ views/memberSelf.js) */
async function selfEnroll(packageId, startDate, method) {
  try {
    const data = await Api.post('/packages/enrollments', { packageId, startDate, method });
    if (data.requiresPayment) showPaymentQrModal(data, { memberId: SESSION.memberId, packageId, startDate, method });
    else { toast('Đã đăng ký gói và ghi nhận thanh toán.'); closeModal(); navigate('myPackages'); }
  } catch (err) { showApiError(err); }
}

function showPaymentQrModal(data, pending) {
  openModal(`
    <div class="modal-title">Quét mã QR để thanh toán</div>
    <div style="text-align:center;">
      <div id="qr_wrap" style="width:100%;max-width:280px;min-height:280px;margin:0 auto;border-radius:10px;border:1px solid var(--line);background:#fff;padding:10px;display:flex;align-items:center;justify-content:center;">
        <div id="qr_loading" style="color:#888;font-size:12.5px;">Đang tải mã QR…</div>
        <img id="qr_img" src="${data.qrUrl}" alt="Mã QR thanh toán VietQR" style="display:none;width:100%;border-radius:6px;"
          onload="document.getElementById('qr_loading').style.display='none'; this.style.display='block';"
          onerror="document.getElementById('qr_loading').innerHTML='⚠️ Không tải được hình ảnh mã QR.<br>Vui lòng dùng nút bên dưới hoặc chuyển khoản thủ công theo thông tin tài khoản.';">
      </div>
      <a href="${data.qrUrl}" target="_blank" rel="noopener" class="hint" style="display:inline-block;margin-top:8px;color:var(--steel);">↗ Mở mã QR trong tab mới</a>
      <div style="margin-top:14px;font-size:14px;">
        <div><b>${data.bank.accountName}</b> — ${data.bank.accountNumber}</div>
        <div class="hint" style="margin-top:2px;">Ngân hàng (mã BIN: ${data.bank.bin})</div>
      </div>
      <div style="margin-top:12px;padding:12px;background:var(--surface-2);border-radius:8px;">
        <div class="stat-label" style="margin-bottom:4px;">Số tiền cần thanh toán</div>
        <div class="stat-value mono" style="font-size:22px;">${fmtMoney(data.amount)}</div>
      </div>
      <div class="hint" style="margin-top:10px;">Nội dung chuyển khoản: ${data.note}</div>
    </div>
    <div class="ai-disclaimer" style="margin-top:16px;">⚠️ Vui lòng kiểm tra hệ thống ngân hàng đã nhận được tiền trước khi bấm xác nhận bên dưới.</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-primary" onclick="confirmPaymentDone(${pending.memberId}, ${pending.packageId}, '${pending.startDate}', '${pending.method}')">✔ Xác nhận đã thanh toán</button>
    </div>`);
}
async function confirmPaymentDone(memberId, packageId, startDate, method) {
  try {
    await Api.post('/packages/enrollments/confirm-payment', { memberId, packageId, startDate, method });
    toast('Đã xác nhận thanh toán và đăng ký gói.');
    closeModal();
    navigate(SESSION.role === 'member' ? 'myPackages' : 'packages');
  } catch (err) { showApiError(err); }
}

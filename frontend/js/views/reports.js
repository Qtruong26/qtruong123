VIEWS.reports = async function () {
  const s = await Api.get('/reports/summary');
  const maxRev = Math.max(1, ...s.revenueByPackage.map((r) => Number(r.total)));
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Vận hành</div><div class="page-title">Báo cáo</div>
    <div class="page-desc">Xuất báo cáo hội viên, lịch tập và doanh thu theo gói.</div></div>
    <div class="toolbar">
      <button class="btn btn-secondary" onclick="exportCSV('members')">Xuất CSV hội viên</button>
      <button class="btn btn-secondary" onclick="exportCSV('schedules')">Xuất CSV lịch tập</button>
    </div>
  </div>
  <div class="grid grid-3" style="margin-bottom:20px;">
    <div class="stat-tile"><div class="bar" style="background:var(--volt);"></div><div class="stat-label">Hội viên đang hoạt động</div><div class="stat-value">${s.total - s.expired}/${s.total}</div></div>
    <div class="stat-tile"><div class="bar" style="background:var(--signal);"></div><div class="stat-label">Gói đã hết hạn</div><div class="stat-value">${s.expired}</div></div>
    <div class="stat-tile"><div class="bar" style="background:var(--steel);"></div><div class="stat-label">Tổng doanh thu</div><div class="stat-value" style="font-size:20px;">${fmtMoney(s.revenueTotal)}</div></div>
  </div>
  <div class="panel">
    <div class="panel-head"><div class="panel-title">Doanh thu theo gói tập</div></div>
    ${s.revenueByPackage.map((r) => `
      <div style="margin-bottom:12px;">
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px;"><span>${r.name}</span><span class="mono">${fmtMoney(r.total)}</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${(r.total / maxRev * 100).toFixed(0)}%"></div></div>
      </div>`).join('')}
  </div>`;
};

async function exportCSV(kind) {
  const data = await Api.get(`/reports/export/${kind}`);
  let rows, filename;
  if (kind === 'members') {
    rows = [['Họ tên', 'SĐT', 'Email', 'Mục tiêu', 'Ngày tham gia']];
    data.forEach((m) => rows.push([m.name, m.phone, m.email || '', m.goal || '', m.joinDate]));
    filename = 'hoi_vien.csv';
  } else {
    rows = [['Ngày', 'Giờ', 'Hội viên', 'HLV', 'Loại', 'Trạng thái']];
    data.forEach((s) => rows.push([s.date, s.time, s.who, s.trainerName, s.type, s.status]));
    filename = 'lich_tap.csv';
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  toast('Đã xuất file ' + filename);
}

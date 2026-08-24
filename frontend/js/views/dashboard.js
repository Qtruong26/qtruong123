VIEWS.dashboard = async function () {
  const s = await Api.get('/reports/summary');
  return `
  <div class="topbar">
    <div><div class="page-eyebrow">Tổng quan</div><div class="page-title">Bảng điều khiển</div>
      <div class="page-desc">Theo dõi hội viên, tỷ lệ duy trì và doanh thu trung tâm theo thời gian thực.</div></div>
  </div>
  <div class="grid grid-4" style="margin-bottom:20px;">
    <div class="stat-tile"><div class="bar" style="background:var(--volt);"></div>
      <div class="stat-label">Tổng hội viên</div><div class="stat-value">${s.total}</div>
      <div class="stat-sub">+${s.newThisMonth} mới trong 30 ngày</div></div>
    <div class="stat-tile"><div class="bar" style="background:var(--steel);"></div>
      <div class="stat-label">Tỷ lệ duy trì</div><div class="stat-value">${s.retention}%</div>
      <div class="stat-sub">Hội viên còn gói hiệu lực</div></div>
    <div class="stat-tile"><div class="bar" style="background:var(--amber);"></div>
      <div class="stat-label">Sắp hết hạn (≤7 ngày)</div><div class="stat-value">${s.expiringSoon}</div>
      <div class="stat-sub">${s.expired} đã hết hạn — cần gia hạn</div></div>
    <div class="stat-tile"><div class="bar" style="background:var(--signal);"></div>
      <div class="stat-label">Doanh thu tháng này</div><div class="stat-value" style="font-size:20px;">${fmtMoney(s.revenueMonth)}</div>
      <div class="stat-sub">Tổng cộng: ${fmtMoney(s.revenueTotal)}</div></div>
  </div>
  <div class="grid grid-2">
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Lịch tập sắp tới</div></div>
      ${s.upcomingSchedules.length ? `<table><thead><tr><th>Ngày</th><th>Giờ</th><th>Hội viên</th><th>HLV</th><th>Loại</th></tr></thead><tbody>
        ${s.upcomingSchedules.map(x => `<tr><td>${x.date}</td><td>${x.time}</td><td>${x.who}</td><td>${x.trainerName}</td><td>${x.type}</td></tr>`).join('')}
      </tbody></table>` : `<div class="empty-state">Chưa có lịch tập nào sắp tới.</div>`}
    </div>
    <div class="panel">
      <div class="panel-head"><div class="panel-title">Hội viên cần gia hạn gấp</div></div>
      ${s.urgentRenewals.length ? `<table><thead><tr><th>Hội viên</th><th>Gói</th><th>Hết hạn</th><th>Trạng thái</th></tr></thead><tbody>
        ${s.urgentRenewals.map(x => `<tr><td>${x.memberName}</td><td>${x.packageName}</td><td>${x.endDate}</td><td>${pkgStatusBadge(x.daysLeft < 0 ? 'expired' : 'expiring', x.daysLeft)}</td></tr>`).join('')}
      </tbody></table>` : `<div class="empty-state">Không có hội viên nào cần gia hạn gấp 🎉</div>`}
    </div>
  </div>`;
};

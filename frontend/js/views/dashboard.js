VIEWS.dashboard = async function () {

  const [
    s,
    payments
  ] = await Promise.all([
    Api.get('/reports/summary'),
    Api.get('/packages/payments/list')
  ]);


  /* =====================================================
     TÍNH DOANH THU 6 THÁNG GẦN NHẤT
  ===================================================== */

  const now = new Date();

  const months = [];

  const revenueData = [];


  for (let i = 5; i >= 0; i--) {

    const d = new Date(
      now.getFullYear(),
      now.getMonth() - i,
      1
    );


    const year =
      d.getFullYear();

    const month =
      d.getMonth();


    const label =
      `T${month + 1}/${year}`;


    let total = 0;


    payments.forEach((p) => {

      if (!p.date) return;


      const paymentDate =
        new Date(p.date);


      if (
        paymentDate.getFullYear() === year &&
        paymentDate.getMonth() === month
      ) {

        total +=
          Number(p.amount) || 0;

      }

    });


    months.push(label);

    revenueData.push(total);

  }


  /* =====================================================
     GIAO DIỆN
  ===================================================== */

  const html = `

  <div class="topbar">
    <div>
      <div class="page-eyebrow">Trung tâm Vận hành FitCore</div>
      <div class="page-title">Bảng điều khiển Quản trị</div>
      <div class="page-desc">
        Kiểm soát lưu lượng hội viên, tỷ lệ gia hạn thẻ và doanh thu toàn câu lạc bộ theo thời gian thực.
      </div>
    </div>

    <div class="toolbar" style="gap:10px;">
      <button class="btn btn-primary" onclick="editMember(null)">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"/></svg>
        Thêm hội viên
      </button>
      <button class="btn btn-secondary" onclick="openCheckinModal()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
        Check-in
      </button>
      <button class="btn btn-secondary" onclick="navigate('packages')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
        Gói tập &amp; Thu
      </button>
      <button class="btn btn-secondary" onclick="openScheduleModal()">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        Lịch hẹn
      </button>
    </div>
  </div>

  <!-- =====================================
       THỐNG KÊ HOẠT ĐỘNG PHÒNG GYM
  ====================================== -->
  <div class="grid grid-4" style="margin-bottom:22px;">
    <div class="stat-tile">
      <div class="bar" style="background:var(--volt);"></div>
      <div class="stat-tile-top">
        <div class="stat-label">Tổng hội viên</div>
        <div class="stat-icon" style="color:var(--volt);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
      </div>
      <div class="stat-value">${s.total}</div>
      <div class="stat-sub">
        <span class="stat-delta up">+${s.newThisMonth}</span> hội viên mới trong 30 ngày
      </div>
    </div>

    <div class="stat-tile">
      <div class="bar" style="background:var(--steel);"></div>
      <div class="stat-tile-top">
        <div class="stat-label">Tỷ lệ duy trì thẻ</div>
        <div class="stat-icon" style="color:var(--steel);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        </div>
      </div>
      <div class="stat-value">${s.retention}%</div>
      <div class="stat-sub">Hội viên còn gói tập hiệu lực</div>
    </div>

    <div class="stat-tile">
      <div class="bar" style="background:var(--amber);"></div>
      <div class="stat-tile-top">
        <div class="stat-label">Cần gia hạn (≤7 ngày)</div>
        <div class="stat-icon" style="color:var(--amber);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
      </div>
      <div class="stat-value">${s.expiringSoon}</div>
      <div class="stat-sub">
        <span class="stat-delta down">${s.expired}</span> thẻ đã hết hạn
      </div>
    </div>

    <div class="stat-tile">
      <div class="bar" style="background:var(--signal);"></div>
      <div class="stat-tile-top">
        <div class="stat-label">Doanh thu tháng này</div>
        <div class="stat-icon" style="color:var(--signal);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
      </div>
      <div class="stat-value" style="font-size:22px;">${fmtMoney(s.revenueMonth)}</div>
      <div class="stat-sub">Tổng tích lũy: ${fmtMoney(s.revenueTotal)}</div>
    </div>
  </div>


  <!-- =====================================
       BIỂU ĐỒ DOANH THU
  ====================================== -->

  <div class="panel">

    <div class="panel-head">

      <div>

        <div class="panel-title">
          Doanh thu 6 tháng gần nhất
        </div>

        <div class="hint">
          Theo dõi xu hướng tăng / giảm doanh thu
        </div>

      </div>

    </div>


    <div
      style="
        position:relative;
        width:100%;
        height:340px;
      "
    >

      <canvas id="revenueChart"></canvas>

    </div>

  </div>


  <!-- =====================================
       LỊCH + GIA HẠN
  ====================================== -->

  <div class="grid grid-2">

    <div class="panel">

      <div class="panel-head">

        <div class="panel-title">
          Lịch tập sắp tới
        </div>

      </div>


      ${
        s.upcomingSchedules.length
          ? `

            <table>

              <thead>

                <tr>
                  <th>Ngày</th>
                  <th>Giờ</th>
                  <th>Hội viên</th>
                  <th>HLV</th>
                  <th>Loại</th>
                </tr>

              </thead>


              <tbody>

                ${s.upcomingSchedules.map(x => `

                  <tr>

                    <td>
                      ${x.date}
                    </td>

                    <td>
                      ${x.time}
                    </td>

                    <td>
                      ${x.who}
                    </td>

                    <td>
                      ${x.trainerName}
                    </td>

                    <td>
                      ${x.type}
                    </td>

                  </tr>

                `).join('')}

              </tbody>

            </table>

          `
          : `

            <div class="empty-state">
              Chưa có lịch tập nào sắp tới.
            </div>

          `
      }

    </div>


    <div class="panel">

      <div class="panel-head">

        <div class="panel-title">
          Hội viên cần gia hạn gấp
        </div>

      </div>


      ${
        s.urgentRenewals.length
          ? `

            <table>

              <thead>

                <tr>
                  <th>Hội viên</th>
                  <th>Gói</th>
                  <th>Hết hạn</th>
                  <th>Trạng thái</th>
                </tr>

              </thead>


              <tbody>

                ${s.urgentRenewals.map(x => `

                  <tr>

                    <td>
                      ${x.memberName}
                    </td>

                    <td>
                      ${x.packageName}
                    </td>

                    <td>
                      ${x.endDate}
                    </td>

                    <td>

                      ${pkgStatusBadge(
                        x.daysLeft < 0
                          ? 'expired'
                          : 'expiring',
                        x.daysLeft
                      )}

                    </td>

                  </tr>

                `).join('')}

              </tbody>

            </table>

          `
          : `

            <div class="empty-state">
              Không có hội viên nào cần gia hạn gấp 🎉
            </div>

          `
      }

    </div>

  </div>

  `;


  /* =====================================================
     VẼ BIỂU ĐỒ SAU KHI HTML ĐƯỢC RENDER
  ===================================================== */

  setTimeout(() => {

    const canvas =
      document.getElementById(
        'revenueChart'
      );


    if (!canvas) return;


    if (
      typeof Chart === 'undefined'
    ) {

      console.error(
        'Chart.js chưa được tải.'
      );

      return;
    }


    /* Nếu chart cũ tồn tại thì hủy */

    if (window.__revenueChart) {

      window.__revenueChart.destroy();

    }


    window.__revenueChart =
      new Chart(
        canvas,
        {

          type: 'line',

          data: {

            labels: months,

            datasets: [

              {

                label:
                  'Doanh thu',

                data:
                  revenueData,

                borderWidth: 3,

                tension: 0.35,

                fill: true,

                pointRadius: 5,

                pointHoverRadius: 7

              }

            ]

          },


          options: {

            responsive: true,

            maintainAspectRatio: false,


            interaction: {

              intersect: false,

              mode: 'index'

            },


            plugins: {

              legend: {

                display: false

              },


              tooltip: {

                callbacks: {

                  label: function(context) {

                    return (
                      'Doanh thu: ' +
                      new Intl.NumberFormat(
                        'vi-VN'
                      ).format(
                        context.raw
                      ) +
                      ' VNĐ'
                    );

                  }

                }

              }

            },


            scales: {

              y: {

                beginAtZero: true,

                ticks: {

                  callback: function(value) {

                    return (
                      new Intl.NumberFormat(
                        'vi-VN',
                        {
                          notation: 'compact'
                        }
                      ).format(value)
                      + ' ₫'
                    );

                  }

                }

              }

            }

          }

        }
      );

  }, 50);


  return html;

};
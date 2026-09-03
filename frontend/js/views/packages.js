VIEWS.packages = async function () {

  const [packages, enrollments, payments] = await Promise.all([
    Api.get('/packages'),
    Api.get('/packages/enrollments/list'),
    Api.get('/packages/payments/list')
  ]);

  window.__packagesCache = packages;


  /* =====================================================
     ẢNH MẶC ĐỊNH CHO GÓI
  ===================================================== */

  function getPackageImage(pkg) {

    if (pkg.imageUrl && pkg.imageUrl.trim()) {
      return pkg.imageUrl;
    }

    const name = pkg.name.toLowerCase();

    if (name.includes('1 tháng')) {
      return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop';
    }

    if (name.includes('3 tháng')) {
      return 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=900&auto=format&fit=crop';
    }

    if (name.includes('6 tháng')) {
      return 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=900&auto=format&fit=crop';
    }

    if (name.includes('12 tháng')) {
      return 'https://images.unsplash.com/photo-1579758629938-03607ccdbaba?q=80&w=900&auto=format&fit=crop';
    }

    return 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop';
  }


  /* =====================================================
     CARD GÓI TẬP
  ===================================================== */

  const packageCards = packages.map((p, index) => {

    const image = getPackageImage(p);

    return `
      <div class="package-card">

        <div class="package-image-wrap">

          <img
            src="${image}"
            alt="${p.name}"
            class="package-image"
            loading="lazy"
            onerror="this.src='https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=900&auto=format&fit=crop'"
          >

          <div class="package-number">
            ${String(index + 1).padStart(2, '0')}
          </div>

        </div>


        <div class="package-content">

          <div class="package-top">

            <div>
              <div class="package-name">
                ${p.name}
              </div>

              <div class="package-duration">
                ${p.durationDays} ngày
              </div>
            </div>

          </div>


          <div class="package-price">
            ${fmtMoney(p.price)}
          </div>


          <div class="package-description">
            ${p.description || 'Gói tập tiêu chuẩn tại FitCore'}
          </div>


          <div class="package-footer">

            <span class="package-tag">
              ${p.durationDays >= 365 ? 'VIP' :
                p.durationDays >= 180 ? 'PRO' :
                p.durationDays >= 90 ? 'STANDARD' :
                'BASIC'}
            </span>


            ${
              SESSION.role === 'admin'
                ? `
                  <button
                    class="icon-btn danger"
                    onclick="deletePackage(${p.id})"
                  >
                    Xóa
                  </button>
                `
                : ''
            }

          </div>

        </div>

      </div>
    `;

  }).join('');


  /* =====================================================
     LỊCH SỬ ĐĂNG KÝ
  ===================================================== */

  const enrollRows = enrollments.map((e) => `

    <tr>

      <td>${e.memberName}</td>

      <td>${e.packageName}</td>

      <td>${e.startDate}</td>

      <td>${e.endDate}</td>

      <td>
        ${pkgStatusBadge(
          daysBetween(todayStr(), e.endDate) < 0
            ? 'expired'
            : (
              daysBetween(todayStr(), e.endDate) <= 7
                ? 'expiring'
                : 'active'
            ),
          daysBetween(todayStr(), e.endDate)
        )}
      </td>

    </tr>

  `).join('');


  /* =====================================================
     LỊCH SỬ THANH TOÁN
  ===================================================== */

  const payRows = payments.map((p) => `

    <tr>

      <td>${p.date}</td>

      <td>${p.memberName}</td>

      <td>${p.packageName}</td>

      <td>${fmtMoney(p.amount)}</td>

      <td>${p.method}</td>

    </tr>

  `).join('');


  /* =====================================================
     GIAO DIỆN
  ===================================================== */

  return `

  <div class="topbar">

    <div>

      <div class="page-eyebrow">
        VẬN HÀNH
      </div>

      <div class="page-title">
        Gói tập & Thanh toán
      </div>

      <div class="page-desc">
        Quản lý các gói tập và đăng ký thành viên.
      </div>

    </div>


    ${
      SESSION.role === 'admin'
        ? `
          <button
            class="btn btn-secondary"
            onclick="openPackageModal()"
          >
            + Gói mới
          </button>
        `
        : ''
    }

  </div>


  <!-- =========================
       DANH SÁCH GÓI
  ========================== -->

  <div class="panel packages-panel">

    <div class="panel-head">

      <div>

        <div class="panel-title">
          CÁC GÓI TẬP
        </div>

        <div class="hint">
          ${packages.length} gói đang hoạt động
        </div>

      </div>

    </div>


    <div class="packages-grid">

      ${packageCards || `
        <div class="empty-state">
          Chưa có gói tập nào.
        </div>
      `}

    </div>

  </div>


  <!-- =========================
       ĐĂNG KÝ
  ========================== -->

  <div class="panel">

    <div class="panel-head">

      <div class="panel-title">
        Đăng ký / Gia hạn gói
      </div>

      <button
        class="btn btn-primary"
        onclick="openEnrollModal()"
      >
        + Đăng ký gói
      </button>

    </div>


    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Hội viên</th>
            <th>Gói</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Trạng thái</th>
          </tr>

        </thead>


        <tbody>

          ${
            enrollRows ||
            `
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  Chưa có đăng ký nào.
                </div>
              </td>
            </tr>
            `
          }

        </tbody>

      </table>

    </div>

  </div>


  <!-- =========================
       THANH TOÁN
  ========================== -->

  <div class="panel">

    <div class="panel-head">

      <div class="panel-title">
        Lịch sử thanh toán
      </div>

    </div>


    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Ngày</th>
            <th>Hội viên</th>
            <th>Gói</th>
            <th>Số tiền</th>
            <th>Hình thức</th>
          </tr>

        </thead>


        <tbody>

          ${
            payRows ||
            `
            <tr>
              <td colspan="5">
                <div class="empty-state">
                  Chưa có giao dịch nào.
                </div>
              </td>
            </tr>
            `
          }

        </tbody>

      </table>

    </div>

  </div>

  `;

};


/* =========================================================
   THÊM GÓI
========================================================= */

function openPackageModal() {

  openModal(`

    <div class="modal-title">
      Thêm gói tập
    </div>


    <div class="field">

      <label>
        Tên gói
      </label>

      <input
        id="pf_name"
        placeholder="Ví dụ: Gym Basic"
      >

    </div>


    <div class="form-row">

      <div class="field">

        <label>
          Thời hạn (ngày)
        </label>

        <input
          id="pf_days"
          type="number"
          value="30"
        >

      </div>


      <div class="field">

        <label>
          Giá (VNĐ)
        </label>

        <input
          id="pf_price"
          type="number"
          value="600000"
        >

      </div>

    </div>


    <div class="field">

      <label>
        Link hình ảnh
      </label>

      <input
        id="pf_image"
        type="url"
        placeholder="https://..."
      >

      <div class="hint">
        Có thể để trống, hệ thống sẽ tự chọn ảnh.
      </div>

    </div>


    <div class="field">

      <label>
        Mô tả
      </label>

      <textarea
        id="pf_desc"
        rows="3"
        placeholder="Mô tả gói tập..."
      ></textarea>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Hủy
      </button>


      <button
        class="btn btn-primary"
        onclick="savePackage()"
      >
        Lưu
      </button>

    </div>

  `);
}


/* =========================================================
   LƯU GÓI
========================================================= */

async function savePackage() {

  const name =
    document.getElementById('pf_name')
      .value
      .trim();

  const durationDays =
    Number(
      document.getElementById('pf_days').value
    );

  const price =
    Number(
      document.getElementById('pf_price').value
    );

  const description =
    document.getElementById('pf_desc')
      .value
      .trim();

  const imageUrl =
    document.getElementById('pf_image')
      .value
      .trim();


  if (!name) {

    toast(
      'Vui lòng nhập tên gói.',
      true
    );

    return;
  }


  try {

    await Api.post(
      '/packages',
      {
        name,
        durationDays,
        price,
        description,
        imageUrl
      }
    );


    toast(
      'Đã thêm gói tập.'
    );

    closeModal();

    navigate('packages');

  } catch (err) {

    showApiError(err);

  }

}


/* =========================================================
   XÓA GÓI
========================================================= */

function deletePackage(id) {

  confirmAction(
    'Xóa gói tập này?',
    async () => {

      try {

        await Api.del(
          `/packages/${id}`
        );

        toast(
          'Đã xóa gói.'
        );

        navigate('packages');

      } catch (err) {

        showApiError(err);

      }

    }
  );

}


/* =========================================================
   ĐĂNG KÝ GÓI
========================================================= */

async function openEnrollModal() {

  const members =
    await Api.get('/members');

  const packages =
    window.__packagesCache ||
    await Api.get('/packages');


  openModal(`

    <div class="modal-title">
      Đăng ký / Gia hạn gói
    </div>


    <div class="field">

      <label>
        Hội viên
      </label>

      <select id="ef_member">

        ${members.map(m => `
          <option value="${m.id}">
            ${m.name}
          </option>
        `).join('')}

      </select>

    </div>


    <div class="field">

      <label>
        Gói tập
      </label>

      <select id="ef_package">

        ${packages.map(p => `
          <option value="${p.id}">
            ${p.name} — ${fmtMoney(p.price)}
          </option>
        `).join('')}

      </select>

    </div>


    <div class="form-row">

      <div class="field">

        <label>
          Ngày bắt đầu
        </label>

        <input
          id="ef_start"
          type="date"
          value="${todayStr()}"
        >

      </div>


      <div class="field">

        <label>
          Hình thức thanh toán
        </label>

        <select id="ef_method">

          <option>
            Tiền mặt
          </option>

          <option>
            Chuyển khoản
          </option>

          <option>
            Thẻ
          </option>

        </select>

      </div>

    </div>


    <div class="modal-actions">

      <button
        class="btn btn-secondary"
        onclick="closeModal()"
      >
        Hủy
      </button>


      <button
        class="btn btn-primary"
        onclick="submitEnroll()"
      >
        Xác nhận
      </button>

    </div>

  `);
}


/* =========================================================
   SUBMIT ĐĂNG KÝ
========================================================= */

async function submitEnroll() {

  const memberId =
    Number(
      document.getElementById('ef_member').value
    );

  const packageId =
    Number(
      document.getElementById('ef_package').value
    );

  const startDate =
    document.getElementById('ef_start').value;

  const method =
    document.getElementById('ef_method').value;


  try {

    const data =
      await Api.post(
        '/packages/enrollments',
        {
          memberId,
          packageId,
          startDate,
          method
        }
      );


    if (data.requiresPayment) {

      showPaymentQrModal(
        data,
        {
          memberId,
          packageId,
          startDate,
          method
        }
      );

    } else {

      toast(
        'Đã đăng ký gói và ghi nhận thanh toán.'
      );

      closeModal();

      navigate('packages');

    }

  } catch (err) {

    showApiError(err);

  }

}

/* =========================================================
   ĐĂNG KÝ / GIA HẠN GÓI - HỘI VIÊN
========================================================= */

async function selfEnroll(packageId, startDate, method) {
  try {
    if (!packageId || !startDate || !method) {
      toast('Vui lòng nhập đầy đủ thông tin.', true);
      return;
    }

    // Đóng modal đăng ký hiện tại
    closeModal();

    // Gửi yêu cầu đăng ký lên API
    const result = await Api.post('/packages/enrollments', {
      packageId: Number(packageId),
      startDate,
      method
    });

    /* =====================================================
       THANH TOÁN CHUYỂN KHOẢN -> HIỆN QR
    ===================================================== */

    if (result.requiresPayment) {
      const pending = result.pendingEnrollment;

      openModal(`
        <div class="modal-title">Thanh toán gói tập</div>

        <div class="hint" style="margin-bottom:16px;">
          Vui lòng quét mã QR bên dưới để thanh toán.
        </div>

        <div style="
          text-align:center;
          background:#fff;
          border-radius:14px;
          padding:18px;
          margin-bottom:16px;
        ">
          <img
            src="${result.qrUrl}"
            alt="QR thanh toán"
            style="
              width:280px;
              max-width:100%;
              height:auto;
              display:block;
              margin:0 auto;
            "
          >
        </div>

        <div class="panel" style="margin-bottom:14px;">
          <div style="
            display:flex;
            justify-content:space-between;
            margin-bottom:8px;
          ">
            <span class="hint">Số tiền</span>
            <b style="
              color:var(--volt);
              font-size:18px;
            ">
              ${fmtMoney(result.amount)}
            </b>
          </div>

          <div style="
            display:flex;
            justify-content:space-between;
            gap:10px;
          ">
            <span class="hint">Nội dung</span>
            <b>${result.note}</b>
          </div>
        </div>

        <div class="hint" style="
          padding:12px;
          border-radius:10px;
          background:rgba(255,255,255,.04);
          margin-bottom:16px;
        ">
          Sau khi chuyển khoản thành công, hãy bấm
          <b>"Tôi đã thanh toán"</b> để xác nhận đăng ký.
        </div>

        <div class="modal-actions">
          <button
            class="btn btn-secondary"
            onclick="closeModal()">
            Hủy
          </button>

          <button
            class="btn btn-primary"
            onclick='confirmSelfPayment(${JSON.stringify(pending)})'>
            Tôi đã thanh toán
          </button>
        </div>
      `);

      return;
    }

    /* =====================================================
       THANH TOÁN TIỀN MẶT / THẺ
    ===================================================== */

    toast('Đăng ký gói thành công.');

    // Load lại trang gói
    navigate('myPackages');

  } catch (err) {
    console.error('selfEnroll error:', err);
    showApiError(err);
  }
}


/* =========================================================
   XÁC NHẬN ĐÃ THANH TOÁN QR
========================================================= */

async function confirmSelfPayment(pendingEnrollment) {
  try {
    if (!pendingEnrollment) {
      toast('Không tìm thấy thông tin đăng ký.', true);
      return;
    }

    const result = await Api.post(
      '/packages/enrollments/confirm-payment',
      {
        memberId: Number(pendingEnrollment.memberId),
        packageId: Number(pendingEnrollment.packageId),
        startDate: pendingEnrollment.startDate,
        method: pendingEnrollment.method || 'Chuyển khoản'
      }
    );

    closeModal();

    toast(
      result.message || 'Đã xác nhận thanh toán và đăng ký gói thành công.'
    );

    // Cập nhật lại giao diện
    navigate('myPackages');

  } catch (err) {
    console.error('confirmSelfPayment error:', err);
    showApiError(err);
  }
}


/* =========================================================
   ĐẢM BẢO ONCLICK HTML GỌI ĐƯỢC HÀM
========================================================= */

window.selfEnroll = selfEnroll;
window.confirmSelfPayment = confirmSelfPayment;
window.openSelfEnrollModal = openSelfEnrollModal;
/* =========================================================
   XÁC NHẬN THANH TOÁN
========================================================= */

async function confirmPaymentDone(
  memberId,
  packageId,
  startDate,
  method
) {

  try {

    await Api.post(
      '/packages/enrollments/confirm-payment',
      {
        memberId,
        packageId,
        startDate,
        method
      }
    );


    toast(
      'Đã xác nhận thanh toán và đăng ký gói.'
    );

    closeModal();

    navigate(
      SESSION.role === 'member'
        ? 'myPackages'
        : 'packages'
    );

  } catch (err) {

    showApiError(err);

  }

}
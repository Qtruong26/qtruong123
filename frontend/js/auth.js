/**
 * Đăng nhập / Đăng ký / Đăng xuất. Toàn bộ trạng thái phiên (JWT + user)
 * lưu qua Auth (js/api.js). SESSION là biến toàn cục frontend dùng đọc nhanh
 * trong lúc render các view, luôn đồng bộ với Auth.getUser().
 */
let SESSION = null;

function switchAuthTab(which) {
  const isLogin = which === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabRegister').classList.toggle('active', !isLogin);
  document.getElementById('loginPane').style.display = isLogin ? 'block' : 'none';
  document.getElementById('registerPane').style.display = isLogin ? 'none' : 'block';
  document.getElementById('loginError').classList.remove('show');
  document.getElementById('regError').classList.remove('show');
}
function showFieldError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.add('show');
}

async function doRegister() {
  document.getElementById('regError').classList.remove('show');
  const role = document.getElementById('regRole').value;
  const name = document.getElementById('regName').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPass').value;
  const pass2 = document.getElementById('regPass2').value;

  if (password !== pass2) { showFieldError('regError', 'Xác nhận mật khẩu không khớp.'); return; }

  try {
    // Số điện thoại được dùng làm tên đăng nhập — không cần người dùng tự đặt username riêng.
    const data = await Api.post('/auth/register', { role, name, phone, email, password });
    if (data.pending) {
      toast(data.message);
      switchAuthTab('login');
      document.getElementById('loginUser').value = data.username || phone;
    } else {
      toast('Đăng ký thành công! Đang đăng nhập...');
      Auth.setSession(data.token, data.user);
      enterApp(data.user);
    }
  } catch (err) {
    showFieldError('regError', err.message);
  }
}

async function doLogin() {
  document.getElementById('loginError').classList.remove('show');
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  try {
    const data = await Api.post('/auth/login', { username, password });
    Auth.setSession(data.token, data.user);
    enterApp(data.user);
  } catch (err) {
    showFieldError('loginError', err.message);
  }
}

function doLogout() {
  openModal(`
    <div class="modal-title">Đăng xuất</div>
    <div style="font-size:14px;color:var(--chalk-dim);">Bạn có chắc muốn đăng xuất khỏi FitCore không?</div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
      <button class="btn btn-danger" onclick="confirmLogout()">Đăng xuất</button>
    </div>`);
}
function confirmLogout() {
  closeModal();
  Auth.clearSession();
  SESSION = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  switchAuthTab('login');
  document.getElementById('loginPass').value = '';
  toast('Đã đăng xuất.');
}

// Gọi tự động bởi api.js khi backend trả 401 (token hết hạn / bị thu hồi)
window.onSessionExpired = function () {
  SESSION = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  toast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', true);
};

function roleLabel(r) {
  return { admin: 'Quản lý', reception: 'Lễ tân', trainer: 'Huấn luyện viên', member: 'Hội viên' }[r] || r;
}
function defaultViewForRole(r) {
  if (r === 'member') return 'notifications';
  if (r === 'trainer') return 'myStudents';
  return 'dashboard';
}

function enterApp(user) {
  SESSION = user;
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  document.getElementById('userAvatar').textContent = user.name[0];
  document.getElementById('userNameChip').textContent = user.name;
  document.getElementById('userRoleChip').textContent = roleLabel(user.role);
  document.getElementById('userAvatarMobile').textContent = user.name[0];
  document.getElementById('userNameChipMobile').textContent = user.name;
  document.getElementById('userRoleChipMobile').textContent = roleLabel(user.role);
  buildNav();
  navigate(defaultViewForRole(user.role));
}

/** Khôi phục phiên khi tải lại trang, nếu token còn hợp lệ (kiểm tra qua GET /auth/me) */
async function restoreSession() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await Api.get('/auth/me');
    enterApp(data.user);
  } catch (err) {
    Auth.clearSession();
  }
}

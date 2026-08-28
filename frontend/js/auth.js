/**
 * Đăng nhập / Đăng ký / Đăng xuất. Toàn bộ trạng thái phiên (JWT + user)
 * lưu qua Auth (js/api.js). SESSION là biến toàn cục frontend dùng đọc nhanh
 * trong lúc render các view, luôn đồng bộ với Auth.getUser().
 */
let SESSION = null;

// Chuyển tab Đăng nhập / Đăng ký (Có hiệu ứng mượt)
function switchAuthTab(which) {
  const isLogin = which === 'login';
  
  const tabLogin = document.getElementById('tab-login') || document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tab-register') || document.getElementById('tabRegister');
  const formLogin = document.getElementById('form-login') || document.getElementById('loginPane');
  const formRegister = document.getElementById('form-register') || document.getElementById('registerPane');

  if (tabLogin) tabLogin.classList.toggle('active', isLogin);
  if (tabRegister) tabRegister.classList.toggle('active', !isLogin);

  if (formLogin) {
    formLogin.classList.toggle('active', isLogin);
    if (!formLogin.classList.contains('auth-form')) {
      formLogin.style.display = isLogin ? 'block' : 'none';
    }
  }

  if (formRegister) {
    formRegister.classList.toggle('active', !isLogin);
    if (!formRegister.classList.contains('auth-form')) {
      formRegister.style.display = isLogin ? 'none' : 'block';
    }
  }

  const loginErr = document.getElementById('loginError');
  const regErr = document.getElementById('regError');
  if (loginErr) loginErr.classList.remove('show');
  if (regErr) regErr.classList.remove('show');
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = msg;
    el.classList.add('show');
  } else {
    alert(msg);
  }
}

// Xử lý Đăng Nhập
async function doLogin(event) {
  if (event) event.preventDefault();
  
  const loginErr = document.getElementById('loginError');
  if (loginErr) loginErr.classList.remove('show');

  const usernameInput = document.getElementById('login-phone') || document.getElementById('loginUser');
  const passwordInput = document.getElementById('login-password') || document.getElementById('loginPass');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    showFieldError('loginError', 'Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
    return;
  }

  try {
    // Xóa sạch phiên/token cũ trước khi login để tránh bị lỗi token hết hạn đè vào
    Auth.clearSession();

    const data = await Api.post('/auth/login', { username, password });
    Auth.setSession(data.token, data.user);
    enterApp(data.user);
  } catch (err) {
    showFieldError('loginError', err.message || 'Đăng nhập thất bại.');
  }
}

// Xử lý Đăng Ký
async function doRegister(event) {
  if (event) event.preventDefault();

  const regErr = document.getElementById('regError');
  if (regErr) regErr.classList.remove('show');

  const roleEl = document.getElementById('regRole');
  const role = roleEl ? roleEl.value : 'member';

  const nameInput = document.getElementById('reg-name') || document.getElementById('regName');
  const phoneInput = document.getElementById('reg-phone') || document.getElementById('regPhone');
  const emailInput = document.getElementById('reg-email') || document.getElementById('regEmail');
  const passInput = document.getElementById('reg-password') || document.getElementById('regPass');
  const pass2Input = document.getElementById('reg-confirm-password') || document.getElementById('regPass2');

  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  const pass2 = pass2Input ? pass2Input.value : '';

  if (password !== pass2) {
    showFieldError('regError', 'Xác nhận mật khẩu không khớp.');
    return;
  }

  try {
    const data = await Api.post('/auth/register', { role, name, phone, email, password });
    if (data.pending) {
      if (typeof toast === 'function') toast(data.message);
      switchAuthTab('login');
      const loginUserInput = document.getElementById('login-phone') || document.getElementById('loginUser');
      if (loginUserInput) loginUserInput.value = data.username || phone;
    } else {
      if (typeof toast === 'function') toast('Đăng ký thành công! Đang đăng nhập...');
      Auth.setSession(data.token, data.user);
      enterApp(data.user);
    }
  } catch (err) {
    showFieldError('regError', err.message || 'Đăng ký thất bại.');
  }
}

// Alias để khớp sự kiện onsubmit trong HTML nếu có
const handleLogin = doLogin;
const handleRegister = doRegister;

// Ẩn / Hiện mật khẩu
function togglePasswordVisibility(inputId, icon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (icon) icon.style.color = '#a3e635';
  } else {
    input.type = 'password';
    if (icon) icon.style.color = '#64748b';
  }
}

function doLogout() {
  if (typeof openModal === 'function') {
    openModal(`
      <div class="modal-title">Đăng xuất</div>
      <div style="font-size:14px;color:var(--chalk-dim);">Bạn có chắc muốn đăng xuất khỏi FitCore không?</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="closeModal()">Hủy</button>
        <button class="btn btn-danger" onclick="confirmLogout()">Đăng xuất</button>
      </div>`);
  } else {
    confirmLogout();
  }
}

function confirmLogout() {
  if (typeof closeModal === 'function') closeModal();
  Auth.clearSession();
  SESSION = null;

  // Ẩn Dashboard & hiện lại màn hình đăng nhập
  const appScreen = document.getElementById('app');
  if (appScreen) appScreen.style.setProperty('display', 'none', 'important');

  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) {
    loginScreen.style.setProperty('display', 'flex', 'important');
  }

  switchAuthTab('login');
  const pass = document.getElementById('login-password') || document.getElementById('loginPass');
  if (pass) pass.value = '';
  if (typeof toast === 'function') toast('Đã đăng xuất.');
}

window.onSessionExpired = function () {
  SESSION = null;
  const appScreen = document.getElementById('app');
  if (appScreen) appScreen.style.setProperty('display', 'none', 'important');

  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) {
    loginScreen.style.setProperty('display', 'flex', 'important');
  }

  if (typeof toast === 'function') toast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', true);
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

  // 1. Ẩn dứt điểm màn hình Login bằng display: none !important
  const loginScreen = document.getElementById('loginScreen');
  if (loginScreen) {
    loginScreen.style.setProperty('display', 'none', 'important');
  }

  // 2. Hiện giao diện chính Dashboard
  const appScreen = document.getElementById('app');
  if (appScreen) {
    appScreen.style.setProperty('display', 'block', 'important');
  }

  // 3. Cập nhật thông tin User hiển thị
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  const initial = user.name ? user.name[0].toUpperCase() : 'U';
  setEl('userAvatar', initial);
  setEl('userNameChip', user.name || '');
  setEl('userRoleChip', roleLabel(user.role));
  setEl('userAvatarMobile', initial);
  setEl('userNameChipMobile', user.name || '');
  setEl('userRoleChipMobile', roleLabel(user.role));

  if (typeof buildNav === 'function') buildNav();
  if (typeof navigate === 'function') navigate(defaultViewForRole(user.role));
}

async function restoreSession() {
  if (!Auth.isLoggedIn()) return;
  try {
    const data = await Api.get('/auth/me');
    enterApp(data.user);
  } catch (err) {
    Auth.clearSession();
  }
}
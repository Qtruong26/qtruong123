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

  // Lấy giá trị Username từ ô input
  const usernameInput = document.getElementById('login-username') || document.getElementById('login-phone') || document.getElementById('loginUser');
  const passwordInput = document.getElementById('login-password') || document.getElementById('loginPass');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) {
    showFieldError('loginError', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
    return;
  }

  try {
    // Xóa sạch phiên/token cũ trước khi login để tránh bị lỗi token hết hạn đè vào
    Auth.clearSession();

    const data = await Api.post('/auth/login', { username, password });

    // Lưu trạng thái Ghi nhớ đăng nhập
    const remEl = document.getElementById('rememberMe');
    if (remEl && remEl.checked) {
      localStorage.setItem('fitcore_remember_user', username);
      localStorage.setItem('fitcore_remember_me', 'true');
    } else {
      localStorage.removeItem('fitcore_remember_user');
      localStorage.removeItem('fitcore_remember_me');
    }

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

  const usernameInput = document.getElementById('reg-username') || document.getElementById('regUsername');
  const nameInput = document.getElementById('reg-name') || document.getElementById('regName');
  const phoneInput = document.getElementById('reg-phone') || document.getElementById('regPhone');
  const emailInput = document.getElementById('reg-email') || document.getElementById('regEmail');
  const passInput = document.getElementById('reg-password') || document.getElementById('regPass');
  const pass2Input = document.getElementById('reg-confirm-password') || document.getElementById('regPass2');

  const username = usernameInput ? usernameInput.value.trim() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  const pass2 = pass2Input ? pass2Input.value : '';

  if (!username) {
    showFieldError('regError', 'Vui lòng nhập Tên đăng nhập.');
    return;
  }

  if (password !== pass2) {
    showFieldError('regError', 'Xác nhận mật khẩu không khớp.');
    return;
  }

  try {
    const data = await Api.post('/auth/register', { username, role, name, phone, email, password });
    if (data.pending) {
      if (typeof toast === 'function') toast(data.message);
      switchAuthTab('login');
      const loginUserInput = document.getElementById('login-username') || document.getElementById('login-phone') || document.getElementById('loginUser');
      if (loginUserInput) loginUserInput.value = data.username || username;
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

// Ẩn / Hiện mật khẩu (Hỗ trợ cả icon thường và SVG hiện đại)
function togglePasswordVisibility(inputId, icon) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  if (icon) {
    if (icon.style) icon.style.color = isPass ? '#FF7700' : '#64748b';
    const openEye = icon.querySelector ? icon.querySelector('.eye-open') : null;
    const closedEye = icon.querySelector ? icon.querySelector('.eye-closed') : null;
    if (openEye && closedEye) {
      openEye.style.display = isPass ? 'none' : 'block';
      closedEye.style.display = isPass ? 'block' : 'none';
    }
  }
}

// Nạp nhanh tài khoản demo 1-chạm cho các vai trò CLB
function quickFillLogin(username, password, roleName) {
  switchAuthTab('login');
  const userInput = document.getElementById('login-username') || document.getElementById('login-phone') || document.getElementById('loginUser');
  const passInput = document.getElementById('login-password') || document.getElementById('loginPass');
  if (userInput) userInput.value = username;
  if (passInput) passInput.value = password;
  
  document.querySelectorAll('.demo-role-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-role') === username);
  });

  if (typeof toast === 'function') {
    toast(`Đã chọn tài khoản: ${roleName} (${username})`);
  }
}

// Mở modal tiện ích gym
function openGymModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

// Đóng modal tiện ích gym
function closeGymModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Mô phỏng quét mã QR Check-in hội viên mở cổng
function simulateQrScan() {
  const statusEl = document.querySelector('.scanner-status');
  if (statusEl) {
    statusEl.textContent = '⚡ Nhận diện thành công: HỘI VIÊN PHẠM HỘI VIÊN (HV1) — MỞ CỬA CÂU LẠC BỘ';
    statusEl.style.color = '#10B981';
  }
  setTimeout(() => {
    closeGymModal('gymQrModal');
    quickFillLogin('hv1', '123456', 'Hội viên');
    doLogin();
  }, 900);
}

// Đăng ký nhận vé tập thử 7 ngày VIP
function submitGymTrial(event) {
  if (event) event.preventDefault();
  const name = document.getElementById('trial-name') ? document.getElementById('trial-name').value.trim() : '';
  const phone = document.getElementById('trial-phone') ? document.getElementById('trial-phone').value.trim() : '';
  closeGymModal('gymTrialModal');
  if (typeof toast === 'function') {
    toast(`Chúc mừng ${name || 'Quý khách'}! Đã nhận mã vé VIP 7 ngày tập thử. Chuyên viên sẽ liên hệ ${phone || 'SĐT'} trong 15 phút.`);
  } else {
    alert(`Chúc mừng ${name || 'Quý khách'}! Đã nhận mã vé VIP 7 ngày tập thử.`);
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

// Khôi phục tên đăng nhập nếu người dùng đã tích "Ghi nhớ đăng nhập"
function initRememberMe() {
  try {
    const isRemembered = localStorage.getItem('fitcore_remember_me') === 'true';
    const savedUser = localStorage.getItem('fitcore_remember_user');
    const remEl = document.getElementById('rememberMe');
    const userEl = document.getElementById('login-username');
    if (isRemembered && savedUser && userEl) {
      userEl.value = savedUser;
      if (remEl) remEl.checked = true;
    }
  } catch (e) {
    console.warn('initRememberMe error:', e);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRememberMe);
} else {
  initRememberMe();
}
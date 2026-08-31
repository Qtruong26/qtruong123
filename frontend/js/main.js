document.addEventListener('keydown', (e) => {
  const loginVisible = document.getElementById('loginScreen').style.display !== 'none';
  if (e.key === 'Enter' && loginVisible) {
    const registerPaneVisible = document.getElementById('registerPane').style.display !== 'none';
    if (registerPaneVisible) doRegister(); else doLogin();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  restoreSession();
});
// Quản lý đóng/mở Mobile Sidebar Navigation
window.toggleMobileNav = function () {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileNavOverlay');
  if (!sidebar || !overlay) return;
  sidebar.classList.toggle('mobile-open');
  overlay.classList.toggle('show');
};

// Tự động đóng menu khi bấm vào mục điều hướng bất kỳ hoặc bấm ra lớp phủ ngoài
document.addEventListener('click', (e) => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('mobileNavOverlay');
  if (!sidebar || !overlay) return;

  // Nếu bấm vào các nút điều hướng bên trong sidebar
  if (
    e.target.closest('#navGroup button') ||
    e.target.closest('#navGroup a') ||
    e.target.closest('.nav-item') ||
    e.target.closest('.nav-btn') ||
    e.target.closest('.logout-link')
  ) {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
  }
});
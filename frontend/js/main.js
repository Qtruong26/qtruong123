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

/**
 * API client — bọc fetch() để tự gắn JWT token, base URL, và xử lý lỗi
 * thống nhất cho toàn bộ frontend. Đây là điểm DUY NHẤT giao tiếp với backend.
 */
const API_BASE_URL = 'https://qtruong123-production.up.railway.app';

const TOKEN_KEY = 'fitcore_token';
const USER_KEY = 'fitcore_user';

const Auth = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => JSON.parse(localStorage.getItem(USER_KEY) || 'null'),
  setSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn() { return !!Auth.getToken(); },
};

async function apiRequest(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const token = Auth.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error('Không thể kết nối tới máy chủ. Kiểm tra lại backend đã chạy chưa hoặc kết nối mạng.');
  }

  let data = null;
  try { data = await res.json(); } catch (_) { /* response rỗng, bỏ qua */ }

  if (res.status === 401) {
    Auth.clearSession();
    if (window.onSessionExpired) window.onSessionExpired();
  }
  if (!res.ok) {
    throw new Error((data && data.message) || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

const Api = {
  get: (path) => apiRequest('GET', path),
  post: (path, body) => apiRequest('POST', path, body),
  put: (path, body) => apiRequest('PUT', path, body),
  del: (path) => apiRequest('DELETE', path),
};

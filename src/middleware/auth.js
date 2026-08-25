const { verifyToken } = require('../utils/jwt');

/**
 * Xác thực JWT gửi kèm trong header: Authorization: Bearer <token>
 * Nếu hợp lệ, gắn thông tin người dùng vào req.user để các route sau dùng.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Thiếu token xác thực. Vui lòng đăng nhập lại.' });
  }
  try {
    req.user = verifyToken(token); // { id, username, role, name, memberId, trainerId }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

/**
 * Giới hạn route chỉ cho một số vai trò nhất định.
 * Dùng: router.get('/staff', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập chức năng này.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };

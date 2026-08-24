/**
 * Middleware xử lý lỗi tập trung. Mọi controller nên gọi next(err) khi
 * có lỗi bất ngờ (lỗi DB, lỗi hệ thống) thay vì tự try/catch rải rác.
 * Lỗi nghiệp vụ đã biết (validate, not found...) nên tự trả res.status(...).json(...)
 * trực tiếp trong controller để có thông báo tiếng Việt rõ ràng.
 */
function notFoundHandler(req, res) {
  res.status(404).json({ message: `Không tìm thấy endpoint: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || 'Đã có lỗi xảy ra phía máy chủ.',
  });
}

module.exports = { notFoundHandler, errorHandler };

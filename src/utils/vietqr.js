/**
 * Sinh URL ảnh mã QR thanh toán theo chuẩn VietQR / Napas 247.
 * Thông tin tài khoản nhận tiền cấu hình qua biến môi trường (.env),
 * không hard-code trong mã nguồn.
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../.env')
});

const BANK_CONFIG = {
  bin: process.env.BANK_BIN || '970422',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
  accountName: process.env.BANK_ACCOUNT_NAME || '',
};

// Bỏ dấu tiếng Việt — nội dung chuyển khoản ngân hàng chỉ chấp nhận ký tự không dấu
function stripDiacritics(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
}

function buildVietQRUrl(amount, note) {
  const safeNote = stripDiacritics(note).slice(0, 50);
  const encNote = encodeURIComponent(safeNote);
  const encName = encodeURIComponent(BANK_CONFIG.accountName);
  return `https://img.vietqr.io/image/${BANK_CONFIG.bin}-${BANK_CONFIG.accountNumber}-compact2.png?amount=${Math.round(amount)}&addInfo=${encNote}&accountName=${encName}`;
}

module.exports = { BANK_CONFIG, stripDiacritics, buildVietQRUrl };

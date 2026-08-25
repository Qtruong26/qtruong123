/**
 * Các tính năng "AI" của FitCore.
 *
 * Hiện triển khai theo luật (rule-based) chạy trên server — không gọi API
 * bên ngoài, không cần khóa API, phù hợp để demo/chạy offline nhưng vẫn
 * dùng chung một điểm nối cho toàn bộ người dùng (khác với bản localStorage
 * cũ chỉ chạy được cho từng trình duyệt riêng lẻ).
 *
 * ĐIỂM NỐI ĐỂ NÂNG CẤP LÊN AI THẬT:
 * Thay nội dung hàm bên dưới bằng lệnh gọi tới OpenAI / Gemini / Claude /
 * Hugging Face / Ollama, ví dụ:
 *
 *   const res = await fetch('https://api.anthropic.com/v1/messages', {
 *     method: 'POST',
 *     headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY, ... },
 *     body: JSON.stringify({ model: 'claude-...', messages: [...] })
 *   });
 *
 * Giữ nguyên chữ ký hàm (tham số đầu vào/đầu ra) để không phải sửa route.
 */
const { stripDiacritics } = require('./vietqr');
const { todayStr, daysBetween } = require('./dateUtils');

function suggestPlan(goal, availability, level) {
  const exLib = {
    'Giảm cân': ['Cardio 30-40p (đi bộ nhanh/xe đạp)', 'HIIT 20p', 'Core & bụng 15p', 'Bơi hoặc nhảy dây 25p'],
    'Tăng cơ': ['Ngực + tay sau (4 hiệp x 8-12 reps)', 'Lưng + tay trước', 'Chân + mông (squat, lunge)', 'Vai + core'],
    'Tăng sức bền': ['Chạy bền 25-35p', 'Đạp xe / rowing 30p', 'Bài tập vòng tròn (circuit) toàn thân', 'Bơi 30p'],
    'Duy trì sức khỏe': ['Toàn thân nhẹ 30p', 'Yoga / giãn cơ', 'Đi bộ nhanh 30p', 'Bài tập chức năng (functional)'],
    'Phục hồi chấn thương': ['Giãn cơ nhẹ nhàng', 'Bài tập phục hồi theo hướng dẫn chuyên môn', 'Đi bộ nhẹ', 'Bơi nhẹ (nếu được cho phép)'],
  };
  const pool = exLib[goal] || exLib['Duy trì sức khỏe'];
  const intensity = level === 'Mới bắt đầu' ? 'nhẹ – trung bình' : level === 'Nâng cao' ? 'trung bình – cao' : 'trung bình';
  const days = availability && availability.length ? availability : ['T2', 'T4', 'T6'];
  return days.map((d, i) => ({ day: d, focus: pool[i % pool.length], intensity }));
}

function suggestReminderMessage(member, activePackage, packageName) {
  const d = activePackage ? daysBetween(todayStr(), activePackage.end_date) : null;
  if (!activePackage) {
    return `Chào ${member.name}, bạn hiện chưa có gói tập nào đang hoạt động. Ghé lễ tân để được tư vấn gói phù hợp nhé!`;
  }
  if (d < 0) {
    return `Chào ${member.name}, gói "${packageName}" của bạn đã hết hạn ${Math.abs(d)} ngày. Gia hạn ngay hôm nay để tiếp tục lịch tập và giữ vững thành quả nhé!`;
  }
  if (d <= 7) {
    return `Chào ${member.name}, gói tập của bạn sẽ hết hạn sau ${d} ngày (${activePackage.end_date}). Đăng ký gia hạn sớm để không gián đoạn lịch tập nhé!`;
  }
  return `Chào ${member.name}, đừng quên buổi tập sắp tới của bạn! Gói "${packageName}" còn hiệu lực đến ${activePackage.end_date}.`;
}

function summarizeProgress(attendanceRows) {
  if (!attendanceRows.length) {
    return { text: 'Chưa có dữ liệu điểm danh để tóm tắt tiến độ.', count: 0, last30: 0 };
  }
  const sorted = [...attendanceRows].sort((a, b) => a.date.localeCompare(b.date));
  const last30 = sorted.filter((a) => daysBetween(a.date, todayStr()) <= 30);
  const notesWithContent = sorted.filter((a) => a.note && a.note.trim().length > 0);

  let text = `Trong 30 ngày gần nhất, hội viên đã tập ${last30.length} buổi (tổng cộng ${sorted.length} buổi trong lịch sử). `;
  text += last30.length >= 8
    ? 'Tần suất tập luyện đều đặn, duy trì tốt. '
    : last30.length >= 4
      ? 'Tần suất tập ở mức khá, có thể tăng thêm 1-2 buổi/tuần để đạt mục tiêu nhanh hơn. '
      : 'Tần suất tập còn thấp, nên khuyến khích hội viên quay lại lịch tập đều đặn hơn. ';
  if (notesWithContent.length) {
    text += `Ghi chú gần đây từ HLV/hệ thống: "${notesWithContent[notesWithContent.length - 1].note}". `;
  }
  text += 'Đây là tóm tắt tham khảo dựa trên lịch sử điểm danh, không thay thế đánh giá chuyên môn của huấn luyện viên.';
  return { text, count: sorted.length, last30: last30.length };
}

/**
 * Chatbot hỏi-đáp cho hội viên — dò từ khóa (rule-based).
 * ctx: { member, activePackage, packageName, nextSchedule, trainerName, hasTrainer }
 */
function answerMemberQuestion(rawQuestion, ctx) {
  const q = stripDiacritics(rawQuestion).toLowerCase();
  const has = (...kws) => kws.some((k) => q.includes(k));
  const { member, activePackage, packageName, nextSchedule, trainerName, hasTrainer } = ctx;

  if (has('xin chao', 'hello', 'hi ', 'chao ban', 'chao fitcore') || q.trim() === 'hi' || q.trim() === 'chao') {
    return `Chào ${member.name}! Tôi là trợ lý AI của FitCore. Tôi có thể giúp bạn tra cứu gói tập, lịch tập, huấn luyện viên, hoặc hướng dẫn thanh toán/check-in. Bạn cần hỗ trợ gì?`;
  }
  if (has('cam on', 'thanks', 'thank you')) {
    return 'Không có gì! Nếu cần thêm hỗ trợ, bạn cứ hỏi tôi hoặc liên hệ lễ tân/huấn luyện viên nhé.';
  }
  if (has('goi tap', 'goi cua toi', 'het han', 'con lai bao nhieu', 'con bao nhieu ngay', 'goi con hieu luc')) {
    if (!activePackage) return 'Bạn hiện chưa đăng ký gói tập nào. Vào mục "Đăng ký / gia hạn gói" để chọn gói phù hợp nhé!';
    const d = daysBetween(todayStr(), activePackage.end_date);
    if (d < 0) return `Gói "${packageName}" của bạn đã hết hạn ${Math.abs(d)} ngày (${activePackage.end_date}). Vào mục "Đăng ký / gia hạn gói" để gia hạn ngay nhé!`;
    return `Gói "${packageName}" của bạn còn hiệu lực đến ${activePackage.end_date} (còn ${d} ngày).`;
  }
  if (has('lich tap', 'lich hen', 'buoi tap tiep theo', 'khi nao tap', 'lich pt')) {
    if (!nextSchedule) return 'Bạn chưa có lịch tập nào sắp tới. Vào mục "Lịch tập" để đặt lịch với huấn luyện viên nhé!';
    return `Buổi tập tiếp theo của bạn: ${nextSchedule.date} lúc ${nextSchedule.time}, huấn luyện viên ${nextSchedule.trainerName} (${nextSchedule.type}).`;
  }
  if (has('gia han', 'dang ky goi', 'mua goi', 'thanh toan', 'chuyen khoan', 'qr')) {
    return 'Để đăng ký hoặc gia hạn gói tập, vào mục "Đăng ký / gia hạn gói", chọn gói phù hợp rồi bấm "Đăng ký / Gia hạn". Nếu chọn hình thức "Chuyển khoản", hệ thống sẽ hiện mã QR để bạn quét thanh toán ngay.';
  }
  if (has('check-in', 'checkin', 'check in', 'check-out', 'checkout', 'check out', 'diem danh')) {
    return 'Vào mục "Check-in", bấm "Check-in ngay" khi bạn đến phòng gym. Khi tập xong, quay lại mục này và bấm "Check-out" để ghi nhận giờ ra.';
  }
  if (has('hlv', 'huan luyen vien', 'pt cua toi', 'trainer')) {
    if (hasTrainer) return `Huấn luyện viên phụ trách của bạn là ${trainerName}. Bạn có thể nhắn tin trực tiếp qua mục "Tương tác học viên".`;
    return 'Bạn hiện chưa được ghép huấn luyện viên PT. Vui lòng liên hệ lễ tân hoặc đăng ký gói có kèm PT để được hỗ trợ nhé.';
  }
  if (has('giao an', 'bai tap cua toi')) {
    return 'Giáo án tập luyện do huấn luyện viên thiết kế riêng cho bạn (nếu có) nằm ở mục "Giáo án tập luyện". Nếu bạn muốn AI gợi ý lịch tập tham khảo ngay, hãy vào mục "Gợi ý lịch tập AI".';
  }
  if (has('tien do', 'ket qua tap luyen', 'theo doi qua trinh')) {
    return 'Bạn có thể xem lịch sử tập luyện, tóm tắt AI và ghi chú của huấn luyện viên tại mục "Theo dõi quá trình tập luyện".';
  }
  if (has('gio mo cua', 'dia chi', 'o dau', 'so dien thoai', 'lien he')) {
    return 'Về giờ mở cửa, địa chỉ hoặc thông tin liên hệ cụ thể của phòng gym, vui lòng hỏi trực tiếp lễ tân — tôi chưa được cung cấp dữ liệu này.';
  }
  if (has('doi mat khau', 'quen mat khau', 'thong tin ca nhan', 'sua thong tin')) {
    return 'Bạn có thể xem và cập nhật thông tin liên hệ, mục tiêu tập luyện tại mục "Thông tin cá nhân".';
  }
  return 'Xin lỗi, tôi chưa hiểu rõ câu hỏi này. Bạn có thể hỏi tôi về: gói tập, lịch tập, huấn luyện viên, cách gia hạn/thanh toán, check-in/check-out, hoặc tiến độ tập luyện. Với các vấn đề khác, vui lòng liên hệ lễ tân trực tiếp nhé!';
}

module.exports = { suggestPlan, suggestReminderMessage, summarizeProgress, answerMemberQuestion };

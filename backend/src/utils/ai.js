const { GoogleGenAI } = require('@google/genai');
/**
 * 
 * FitCore AI - Gemini thật
 *
 * Sử dụng Google Gemini API.
 * API key lấy từ:
 *   GEMINI_API_KEY
 *
 * Model mặc định:
 *   gemini-2.5-pro
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

const gemini = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    })
  : null;

/* =========================================================
   HÀM GỌI GEMINI
========================================================= */

async function askGemini(prompt, options = {}) {
  if (!gemini) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên server.'
    );
  }

  const response = await gemini.models.generateContent({
    model: options.model || GEMINI_MODEL,
    contents: prompt,
    config: {
      temperature:
        options.temperature !== undefined
          ? options.temperature
          : 0.7,

      maxOutputTokens:
        options.maxOutputTokens || 2048,

      systemInstruction:
        options.systemInstruction ||
        `
Bạn là trợ lý AI của hệ thống quản lý phòng gym FitCore.

Quy tắc:
- Trả lời bằng tiếng Việt.
- Trả lời rõ ràng, dễ hiểu.
- Không bịa dữ liệu của hội viên.
- Nếu dữ liệu hệ thống không có thì nói rõ là chưa có dữ liệu.
- Không đưa ra chẩn đoán y tế.
- Với vấn đề chấn thương hoặc sức khỏe nghiêm trọng, khuyên người dùng hỏi bác sĩ hoặc chuyên gia.
- Ưu tiên câu trả lời ngắn gọn, thực tế.
        `
    }
  });

  return response.text || '';
}


/* =========================================================
   GỢI Ý LỊCH TẬP
========================================================= */

async function suggestPlan(goal, availability, level) {

  const days =
    availability && availability.length
      ? availability
      : ['T2', 'T4', 'T6'];

  const prompt = `
Hãy xây dựng lịch tập gym tham khảo cho hội viên FitCore.

Mục tiêu:
${goal}

Mức độ:
${level}

Các ngày có thể tập:
${days.join(', ')}

Yêu cầu:

1. Mỗi ngày chỉ có một nội dung tập chính.
2. Phù hợp với mục tiêu và trình độ.
3. Không đưa bài tập quá nguy hiểm.
4. Không cần giải thích dài.
5. Trả về JSON hợp lệ theo đúng cấu trúc:

[
  {
    "day": "T2",
    "focus": "Ngực + tay sau",
    "intensity": "trung bình"
  }
]

Chỉ trả về JSON, không thêm markdown.
`;

  try {

    const text = await askGemini(prompt, {
      temperature: 0.6,
      maxOutputTokens: 1200
    });

    const clean = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const result = JSON.parse(clean);

    if (Array.isArray(result)) {
      return result;
    }

  } catch (err) {

    console.error(
      'Gemini suggestPlan error:',
      err.message
    );

  }

  // Fallback nếu Gemini lỗi
  const fallback = {
    'Giảm cân': [
      'Cardio 30 phút',
      'HIIT nhẹ + Core',
      'Toàn thân + Cardio'
    ],

    'Tăng cơ': [
      'Ngực + tay sau',
      'Lưng + tay trước',
      'Chân + vai'
    ],

    'Tăng sức bền': [
      'Chạy bộ',
      'Đạp xe',
      'Circuit toàn thân'
    ],

    'Duy trì sức khỏe': [
      'Toàn thân nhẹ',
      'Cardio nhẹ + giãn cơ',
      'Functional training'
    ],

    'Phục hồi chấn thương': [
      'Giãn cơ nhẹ',
      'Đi bộ nhẹ',
      'Bài tập phục hồi theo hướng dẫn chuyên môn'
    ]
  };

  const exercises =
    fallback[goal] ||
    fallback['Duy trì sức khỏe'];

  const intensity =
    level === 'Mới bắt đầu'
      ? 'nhẹ – trung bình'
      : level === 'Nâng cao'
        ? 'trung bình – cao'
        : 'trung bình';

  return days.map((day, index) => ({
    day,
    focus: exercises[index % exercises.length],
    intensity
  }));
}


/* =========================================================
   NHẮC GIA HẠN
========================================================= */

async function suggestReminderMessage(
  member,
  activePackage,
  packageName
) {

  const d = activePackage
    ? daysBetween(
        todayStr(),
        activePackage.end_date
      )
    : null;

  const prompt = `
Hãy viết một tin nhắn chăm sóc hội viên phòng gym FitCore.

Tên hội viên:
${member.name}

Gói tập:
${packageName || 'Chưa có gói'}

Ngày hết hạn:
${activePackage?.end_date || 'Không có'}

Số ngày còn lại:
${d === null ? 'Không có' : d}

Yêu cầu:
- Tiếng Việt.
- Thân thiện.
- Ngắn gọn.
- Không quá quảng cáo.
- Nếu hết hạn thì nhắc gia hạn.
- Nếu sắp hết hạn thì nhắc nhẹ nhàng.
- Nếu chưa có gói thì mời đăng ký.
- Chỉ trả về nội dung tin nhắn.
`;

  try {

    return await askGemini(prompt, {
      temperature: 0.7,
      maxOutputTokens: 500
    });

  } catch (err) {

    console.error(
      'Gemini reminder error:',
      err.message
    );

    if (!activePackage) {
      return `Chào ${member.name}, bạn hiện chưa có gói tập nào đang hoạt động. Hãy liên hệ lễ tân để được tư vấn gói phù hợp nhé!`;
    }

    if (d < 0) {
      return `Chào ${member.name}, gói "${packageName}" của bạn đã hết hạn ${Math.abs(d)} ngày. Bạn có thể gia hạn để tiếp tục tập luyện nhé!`;
    }

    if (d <= 7) {
      return `Chào ${member.name}, gói "${packageName}" của bạn sẽ hết hạn sau ${d} ngày. Bạn có thể gia hạn sớm để không gián đoạn việc tập luyện nhé!`;
    }

    return `Chào ${member.name}, đừng quên duy trì lịch tập của mình nhé!`;
  }
}


/* =========================================================
   TÓM TẮT TIẾN ĐỘ
========================================================= */

async function summarizeProgress(attendanceRows) {

  if (!attendanceRows || !attendanceRows.length) {
    return {
      text: 'Chưa có dữ liệu điểm danh để tóm tắt tiến độ.',
      count: 0,
      last30: 0
    };
  }

  const sorted = [...attendanceRows].sort(
    (a, b) =>
      a.date.localeCompare(b.date)
  );

  const last30 = sorted.filter(
    (a) =>
      daysBetween(
        a.date,
        todayStr()
      ) <= 30
  );

  const notesWithContent =
    sorted.filter(
      (a) =>
        a.note &&
        a.note.trim().length > 0
    );

  const prompt = `
Bạn là AI phân tích tiến độ tập luyện của FitCore.

Dữ liệu điểm danh:

${JSON.stringify(
  sorted,
  null,
  2
)}

Số buổi trong 30 ngày:
${last30.length}

Tổng số buổi:
${sorted.length}

Ghi chú:
${JSON.stringify(notesWithContent)}

Hãy viết một đoạn tóm tắt tiến độ bằng tiếng Việt.

Yêu cầu:
- Đánh giá tần suất tập.
- Nhận xét xu hướng chung.
- Nếu có ghi chú HLV thì đề cập.
- Đưa ra 1-2 lời khuyên đơn giản.
- Không chẩn đoán y tế.
- Không bịa dữ liệu.
- Khoảng 100-150 từ.
`;

  try {

    const text =
      await askGemini(prompt, {
        temperature: 0.5,
        maxOutputTokens: 700
      });

    return {
      text,
      count: sorted.length,
      last30: last30.length
    };

  } catch (err) {

    console.error(
      'Gemini progress error:',
      err.message
    );

    let text =
      `Trong 30 ngày gần nhất, hội viên đã tập ${last30.length} buổi, tổng cộng ${sorted.length} buổi trong lịch sử. `;

    text +=
      last30.length >= 8
        ? 'Tần suất tập luyện khá đều đặn.'
        : last30.length >= 4
          ? 'Tần suất tập luyện ở mức khá.'
          : 'Tần suất tập luyện còn thấp.';

    if (notesWithContent.length) {
      text += ` Ghi chú gần đây: "${notesWithContent[notesWithContent.length - 1].note}".`;
    }

    return {
      text,
      count: sorted.length,
      last30: last30.length
    };
  }
}


/* =========================================================
   CHATBOT HỎI ĐÁP
========================================================= */

async function answerMemberQuestion(
  rawQuestion,
  ctx
) {

  const {
    member,
    activePackage,
    packageName,
    nextSchedule,
    trainerName,
    hasTrainer
  } = ctx;

  const prompt = `
Bạn là chatbot AI của hệ thống quản lý phòng gym FitCore.

Hội viên hiện tại:

${JSON.stringify(
  {
    name: member?.name,
    phone: member?.phone,
    email: member?.email,
    goal: member?.goal,
    level: member?.level
  },
  null,
  2
)}

Gói tập hiện tại:

${JSON.stringify(
  activePackage
    ? {
        packageName,
        startDate: activePackage.start_date,
        endDate: activePackage.end_date,
        status: activePackage.status
      }
    : null,
  null,
  2
)}

Lịch tập tiếp theo:

${JSON.stringify(
  nextSchedule,
  null,
  2
)}

Huấn luyện viên:

${trainerName || 'Chưa có'}

Có huấn luyện viên:
${hasTrainer ? 'Có' : 'Không'}

Câu hỏi của hội viên:

"${rawQuestion}"

Hãy trả lời câu hỏi.

QUY TẮC:

1. Trả lời bằng tiếng Việt.
2. Ưu tiên sử dụng dữ liệu được cung cấp.
3. Không được tự bịa thông tin cá nhân.
4. Nếu dữ liệu không có, hãy nói rõ.
5. Nếu hỏi về gói tập thì sử dụng thông tin gói hiện tại.
6. Nếu hỏi về lịch thì sử dụng lịch được cung cấp.
7. Nếu hỏi về HLV thì sử dụng tên HLV được cung cấp.
8. Nếu hỏi về thanh toán/gia hạn/check-in thì hướng dẫn theo hệ thống FitCore.
9. Không đưa ra chẩn đoán y tế.
10. Nếu câu hỏi ngoài phạm vi FitCore, hãy trả lời ngắn gọn và hướng người dùng tới lễ tân/HLV.
11. Không nói rằng bạn là ChatGPT.
12. Hãy xưng là "trợ lý AI FitCore".
`;

  try {

    const answer =
      await askGemini(prompt, {
        temperature: 0.65,
        maxOutputTokens: 1000
      });

    return answer.trim();

  } catch (err) {

    console.error(
      'Gemini chatbot error:',
      err.message
    );

    // Fallback cơ bản nếu Gemini lỗi
    return fallbackChatAnswer(
      rawQuestion,
      ctx
    );
  }
}


/* =========================================================
   FALLBACK CHATBOT
========================================================= */

function fallbackChatAnswer(
  rawQuestion,
  ctx
) {

  const q =
    stripDiacritics(
      rawQuestion
    ).toLowerCase();

  const has = (...kws) =>
    kws.some(
      (k) => q.includes(k)
    );

  const {
    member,
    activePackage,
    packageName,
    nextSchedule,
    trainerName,
    hasTrainer
  } = ctx;

  if (
    has(
      'xin chao',
      'hello',
      'chao ban'
    ) ||
    q.trim() === 'hi' ||
    q.trim() === 'chao'
  ) {
    return `Chào ${member.name}! Tôi là trợ lý AI FitCore. Tôi có thể giúp bạn về gói tập, lịch tập, huấn luyện viên, thanh toán và check-in.`;
  }

  if (
    has(
      'goi tap',
      'goi cua toi',
      'het han',
      'con bao nhieu ngay'
    )
  ) {

    if (!activePackage) {
      return 'Bạn hiện chưa có gói tập nào.';
    }

    const d =
      daysBetween(
        todayStr(),
        activePackage.end_date
      );

    if (d < 0) {
      return `Gói "${packageName}" đã hết hạn ${Math.abs(d)} ngày.`;
    }

    return `Gói "${packageName}" còn hiệu lực đến ${activePackage.end_date}, còn ${d} ngày.`;
  }

  if (
    has(
      'lich tap',
      'lich hen',
      'buoi tap tiep theo'
    )
  ) {

    if (!nextSchedule) {
      return 'Bạn chưa có lịch tập sắp tới.';
    }

    return `Buổi tập tiếp theo của bạn là ${nextSchedule.date} lúc ${nextSchedule.time} với HLV ${nextSchedule.trainerName}.`;
  }

  if (
    has(
      'hlv',
      'huan luyen vien',
      'trainer'
    )
  ) {

    if (hasTrainer) {
      return `Huấn luyện viên phụ trách của bạn là ${trainerName}.`;
    }

    return 'Bạn hiện chưa được ghép huấn luyện viên.';
  }

  if (
    has(
      'gia han',
      'dang ky goi',
      'thanh toan',
      'chuyen khoan',
      'qr'
    )
  ) {
    return 'Bạn vào mục "Đăng ký / gia hạn gói", chọn gói và hình thức thanh toán. Nếu chọn chuyển khoản, hệ thống sẽ hiển thị QR thanh toán.';
  }

  if (
    has(
      'check-in',
      'checkin',
      'check in',
      'diem danh'
    )
  ) {
    return 'Bạn vào mục "Check-in" và bấm "Check-in ngay" khi đến phòng gym.';
  }

  return 'Xin lỗi, hiện tại tôi chưa thể trả lời câu hỏi này. Bạn có thể hỏi về gói tập, lịch tập, HLV, thanh toán hoặc check-in.';
}


/* =========================================================
   EXPORT
========================================================= */

module.exports = {
  suggestPlan,
  suggestReminderMessage,
  summarizeProgress,
  answerMemberQuestion
};
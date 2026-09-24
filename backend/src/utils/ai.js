/**
 * FitCore AI - Gemini thật
 *
 * File: backend/src/utils/ai.js
 *
 * Dùng Google Gemini API.
 * API key lấy từ:
 *   GEMINI_API_KEY
 *
 * Model:
 *   GEMINI_MODEL
 */

const { todayStr, daysBetween } = require('./dateUtils');

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.7-flash';

let geminiClient = null;

/* =========================================================
   GEMINI CLIENT
   Dùng dynamic import để tránh lỗi CommonJS/ESM
   ========================================================= */

async function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình GEMINI_API_KEY trên server.'
    );
  }

  if (geminiClient) {
    return geminiClient;
  }

  const module = await import('@google/genai');
  const GoogleGenAI = module.GoogleGenAI;

  if (!GoogleGenAI) {
    throw new Error(
      'Không thể tải GoogleGenAI từ @google/genai.'
    );
  }

  geminiClient = new GoogleGenAI({
    apiKey: apiKey
  });

  return geminiClient;
}


/* =========================================================
   HÀM BỎ DẤU TIẾNG VIỆT
   Không phụ thuộc vietqr.js
   ========================================================= */

function stripDiacritics(text = '') {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}


/* =========================================================
   HÀM GỌI GEMINI
   ========================================================= */

async function askGemini(prompt, options = {}) {
  const gemini = await getGemini();

  const response =
    await gemini.models.generateContent({
      model: options.model || GEMINI_MODEL,

      contents: prompt,

      config: {
        temperature:
          options.temperature !== undefined
            ? options.temperature
            : 0.7,

        // Gemini 3 tính cả token "thinking" vào maxOutputTokens,
        // nên cộng thêm 2048 để phần trả lời không bị cắt giữa câu.
        maxOutputTokens:
          (options.maxOutputTokens || 2048) + 2048,

        systemInstruction:
          options.systemInstruction ||
          `
Bạn là trợ lý AI của hệ thống quản lý phòng gym FitCore.

Quy tắc:

- Trả lời bằng tiếng Việt.
- Trả lời rõ ràng, dễ hiểu.
- Ưu tiên sử dụng dữ liệu FitCore được cung cấp.
- Không được bịa dữ liệu hội viên.
- Nếu dữ liệu hệ thống không có thì phải nói rõ.
- Không tiết lộ API key hoặc thông tin bảo mật.
- Không đưa ra chẩn đoán y tế.
- Với chấn thương hoặc vấn đề sức khỏe nghiêm trọng,
  khuyên người dùng hỏi bác sĩ hoặc chuyên gia.
- Câu trả lời nên thực tế và dễ hiểu.
          `
      }
    });

  const text =
    typeof response.text === 'function'
      ? response.text()
      : response.text;

  if (!text || !String(text).trim()) {
    throw new Error(
      'Gemini trả về câu trả lời rỗng.'
    );
  }

  return String(text).trim();
}


/* =========================================================
   GỢI Ý LỊCH TẬP
   ========================================================= */

async function suggestPlan(
  goal,
  availability,
  level
) {
  const days =
    availability && availability.length
      ? availability
      : ['T2', 'T4', 'T6'];

  const prompt = `
Hãy xây dựng lịch tập gym tham khảo cho hội viên
của hệ thống FitCore.

Mục tiêu:
${goal}

Mức độ:
${level}

Các ngày có thể tập:
${days.join(', ')}

Yêu cầu:

1. Chỉ tạo lịch cho những ngày được cung cấp.
2. Mỗi ngày chỉ có một nội dung tập chính.
3. Phù hợp với mục tiêu.
4. Phù hợp với trình độ.
5. Không đưa bài tập quá nguy hiểm.
6. Nếu mục tiêu là phục hồi chấn thương,
   chỉ đưa gợi ý nhẹ và nhắc tham khảo chuyên gia.
7. Trả về JSON hợp lệ.
8. Không thêm markdown.

Cấu trúc JSON:

[
  {
    "day": "T2",
    "focus": "Ngực + tay sau",
    "intensity": "trung bình"
  }
]
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

    throw new Error(
      'Gemini không trả về danh sách lịch tập hợp lệ.'
    );
  } catch (err) {
    console.error(
      'Gemini suggestPlan error:',
      err.message
    );

    /*
     * Fallback để hệ thống vẫn hoạt động
     * nếu Gemini tạm thời lỗi.
     */

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
      focus:
        exercises[index % exercises.length],
      intensity
    }));
  }
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
Hãy viết một tin nhắn chăm sóc hội viên
của phòng gym FitCore.

Tên hội viên:
${member?.name || 'Hội viên'}

Gói tập:
${packageName || 'Chưa có gói'}

Ngày hết hạn:
${activePackage?.end_date || 'Không có'}

Số ngày còn lại:
${d === null ? 'Không có' : d}

Yêu cầu:

- Viết bằng tiếng Việt.
- Thân thiện.
- Ngắn gọn.
- Không quá quảng cáo.
- Nếu gói đã hết hạn thì nhắc gia hạn.
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

async function summarizeProgress(
  attendanceRows
) {
  if (
    !attendanceRows ||
    !attendanceRows.length
  ) {
    return {
      text:
        'Chưa có dữ liệu điểm danh để tóm tắt tiến độ.',
      count: 0,
      last30: 0
    };
  }

  const sorted = [...attendanceRows].sort(
    (a, b) =>
      String(a.date).localeCompare(
        String(b.date)
      )
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
        String(a.note).trim().length > 0
    );

  const prompt = `
Bạn là AI phân tích tiến độ tập luyện
của hệ thống FitCore.

Dữ liệu điểm danh:

${JSON.stringify(
  sorted,
  null,
  2
)}

Số buổi trong 30 ngày gần nhất:
${last30.length}

Tổng số buổi:
${sorted.length}

Ghi chú:
${JSON.stringify(
  notesWithContent,
  null,
  2
)}

Hãy viết một đoạn tóm tắt tiến độ
bằng tiếng Việt.

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

    if (last30.length >= 8) {
      text +=
        'Tần suất tập luyện khá đều đặn.';
    } else if (last30.length >= 4) {
      text +=
        'Tần suất tập luyện ở mức khá.';
    } else {
      text +=
        'Tần suất tập luyện còn thấp.';
    }

    if (notesWithContent.length) {
      const latest =
        notesWithContent[
          notesWithContent.length - 1
        ];

      text +=
        ` Ghi chú gần đây: "${latest.note}".`;
    }

    return {
      text,
      count: sorted.length,
      last30: last30.length
    };
  }
}


/* =========================================================
   CHATBOT HỎI ĐÁP - GEMINI THẬT
   ========================================================= */

async function answerMemberQuestion(
  rawQuestion,
  ctx = {}
) {
  const question =
    String(rawQuestion || '').trim();

  if (!question) {
    throw new Error(
      'Câu hỏi không được để trống.'
    );
  }

  const {
    member,
    activePackage,
    packageName,
    nextSchedule,
    trainerName,
    hasTrainer
  } = ctx;

  const prompt = `
Bạn là chatbot AI của hệ thống quản lý
phòng gym FitCore.

THÔNG TIN HỘI VIÊN:

${JSON.stringify(
  {
    name: member?.name || null,
    phone: member?.phone || null,
    email: member?.email || null,
    goal: member?.goal || null,
    level: member?.level || null
  },
  null,
  2
)}

GÓI TẬP HIỆN TẠI:

${JSON.stringify(
  activePackage
    ? {
        packageName:
          packageName || null,

        startDate:
          activePackage.start_date,

        endDate:
          activePackage.end_date,

        status:
          activePackage.status
      }
    : null,
  null,
  2
)}

LỊCH TẬP TIẾP THEO:

${JSON.stringify(
  nextSchedule || null,
  null,
  2
)}

HUẤN LUYỆN VIÊN:

${trainerName || 'Chưa có'}

CÓ HUẤN LUYỆN VIÊN:

${hasTrainer ? 'Có' : 'Không'}

CÂU HỎI CỦA HỘI VIÊN:

${question}

QUY TẮC TRẢ LỜI:

1. Trả lời bằng tiếng Việt.
2. Ưu tiên dữ liệu được cung cấp ở trên.
3. Không tự bịa thông tin cá nhân.
4. Nếu dữ liệu không có thì nói rõ.
5. Nếu hỏi về gói tập thì dùng thông tin gói tập.
6. Nếu hỏi về lịch thì dùng lịch được cung cấp.
7. Nếu hỏi về HLV thì dùng tên HLV được cung cấp.
8. Nếu hỏi về thanh toán, gia hạn hoặc check-in,
   hướng dẫn theo hệ thống FitCore.
9. Không đưa ra chẩn đoán y tế.
10. Với chấn thương hoặc vấn đề sức khỏe nghiêm trọng,
    khuyên người dùng hỏi bác sĩ hoặc chuyên gia.
11. Có thể trả lời câu hỏi tự do liên quan đến
    việc sử dụng FitCore và tập luyện.
12. Nếu câu hỏi hoàn toàn ngoài phạm vi FitCore,
    trả lời ngắn gọn và hướng người dùng tới
    lễ tân hoặc HLV.
13. Không nói rằng bạn là ChatGPT.
14. Xưng là "trợ lý AI FitCore".
15. Trả lời tự nhiên, không cần liệt kê quy tắc.
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

    return fallbackChatAnswer(
      question,
      ctx
    );
  }
}


/* =========================================================
   FALLBACK CHATBOT
   Chỉ chạy khi Gemini bị lỗi
   ========================================================= */

function fallbackChatAnswer(
  rawQuestion,
  ctx = {}
) {
  const q =
    stripDiacritics(
      rawQuestion
    ).toLowerCase();

  const has = (...keywords) =>
    keywords.some(
      (keyword) =>
        q.includes(keyword)
    );

  const {
    member,
    activePackage,
    packageName,
    nextSchedule,
    trainerName,
    hasTrainer
  } = ctx;

  const memberName =
    member?.name || 'bạn';

  /* Chào hỏi */

  if (
    has(
      'xin chao',
      'hello',
      'chao ban'
    ) ||
    q.trim() === 'hi' ||
    q.trim() === 'chao'
  ) {
    return `Chào ${memberName}! Tôi là trợ lý AI FitCore. Tôi có thể giúp bạn về gói tập, lịch tập, huấn luyện viên, thanh toán và check-in.`;
  }

  /* Gói tập */

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

  /* Lịch tập */

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

    return `Buổi tập tiếp theo của bạn là ${nextSchedule.date} lúc ${nextSchedule.time} với HLV ${nextSchedule.trainerName || trainerName || 'chưa xác định'}.`;
  }

  /* HLV */

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

  /* Thanh toán / gia hạn */

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

  /* Check-in */

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

  return 'Xin lỗi, Gemini hiện không phản hồi được. Bạn có thể thử lại sau hoặc liên hệ lễ tân/HLV FitCore.';
}


/* =========================================================
   EXPORT
   ========================================================= */

module.exports = {
  askGemini,
  suggestPlan,
  suggestReminderMessage,
  summarizeProgress,
  answerMemberQuestion
};
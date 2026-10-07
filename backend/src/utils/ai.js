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

/* =========================================================
   HÀM GỌI GEMINI (Hỗ trợ đa model & dự phòng thông minh)
   ========================================================= */

async function askGemini(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên server.');
  }

  const primaryModel = options.model || process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const candidateModels = [
    primaryModel,
    'gemini-3.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.7-flash'
  ];
  const uniqueModels = [...new Set(candidateModels.filter(Boolean))];

  const defaultSystemInstruction = `
Bạn là trợ lý AI FitCore thông minh, chu đáo và thân thiện.
Quy tắc:
- Trả lời bằng tiếng Việt, trình bày Markdown sáng sủa, đẹp mắt.
- Khi người dùng hỏi về trung tâm thể hình FitCore (gói tập, lịch tập, check-in, PT...), sử dụng dữ liệu được cung cấp.
- Khi người dùng hỏi về kiến thức tập luyện, dinh dưỡng, sức khỏe: giải thích khoa học, thiết thực và dễ áp dụng.
- KHI NGƯỜI DÙNG HỎI CÂU HỎI NGOÀI LỀ (đời sống, khoa học, học tập, công nghệ, tâm sự, kiến thức tổng hợp...): luôn sẵn sàng lắng nghe và trả lời nhiệt tình, thông minh, sâu sắc, KHÔNG từ chối hay né tránh.
- Không bịa thông tin cá nhân hay thông tin tài khoản nếu hệ thống chưa có.
- Không đưa ra chẩn đoán y tế nguy hiểm thay thế bác sĩ.
`;

  const systemInstruction = options.systemInstruction || defaultSystemInstruction;

  let lastError = null;

  for (const model of uniqueModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemInstruction }]
            },
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              temperature: options.temperature !== undefined ? options.temperature : 0.7,
              maxOutputTokens: (options.maxOutputTokens || 2048) + 2048
            }
          })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message || `HTTP ${response.status} from ${model}`);
      }

      const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim();
      if (text) {
        return text;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[FitCore AI] Model ${model} gặp sự cố (${err.message}), đang chuyển sang model tiếp theo...`);
    }
  }

  // Nếu REST fetch gặp lỗi, thử lại qua thư viện SDK @google/genai
  try {
    const gemini = await getGemini();
    const sdkRes = await gemini.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: options.temperature !== undefined ? options.temperature : 0.7,
        maxOutputTokens: (options.maxOutputTokens || 2048) + 2048
      }
    });
    const sdkText = typeof sdkRes.text === 'function' ? sdkRes.text() : sdkRes.text;
    if (sdkText && String(sdkText).trim()) {
      return String(sdkText).trim();
    }
  } catch (sdkErr) {
    console.warn('[FitCore AI] SDK fallback cũng không thành công:', sdkErr.message);
  }

  throw lastError || new Error('Không thể nhận phản hồi từ Gemini AI.');
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

/* =========================================================
   TRẢ LỜI CÂU HỎI HỘI VIÊN & CÂU HỎI NGOÀI LỀ (GEMINI)
   ========================================================= */

async function answerMemberQuestion(rawQuestion, ctx = {}) {
  const question = String(rawQuestion || '').trim();
  if (!question) {
    throw new Error('Câu hỏi không được để trống.');
  }

  const {
    member,
    activePackage,
    packageName,
    nextSchedule,
    trainerName,
    hasTrainer,
    role = 'member',
    name = '',
    history = []
  } = ctx;

  const displayName = member?.name || name || 'bạn';

  // Lịch sử trao đổi gần nhất
  const historySnippet = Array.isArray(history) && history.length > 0
    ? history.map(h => `${h.sender === 'user' ? 'Người dùng' : 'Trợ lý AI'}: ${h.text}`).join('\n')
    : '(Chưa có cuộc trò chuyện trước đó)';

  const prompt = `
Bạn là "FitCore AI Assistant" — Trợ lý AI thông minh, nhiệt tình và am hiểu của hệ thống phòng gym FitCore.

NHIỆM VỤ VÀ PHẠM VI HỎI ĐÁP:
1. VỀ HỆ THỐNG PHÒNG GYM FITCORE:
   - Trả lời các thắc mắc về gói tập, lịch tập, check-in, thanh toán, huấn luyện viên, nội quy trung tâm dựa trên dữ liệu thực tế bên dưới.
   - Nếu hội viên chưa có gói tập hoặc chưa có lịch tập, thông báo nhẹ nhàng và hướng dẫn cách đăng ký/đặt lịch trong ứng dụng.

2. VỀ KIẾN THỨC THỂ HÌNH, DINH DƯỠNG & SỨC KHỎE:
   - Hướng dẫn bài tập, kỹ thuật, nhóm cơ, gợi ý thực đơn, chế độ ăn tăng cơ/giảm cân, thời gian nghỉ ngơi khoa học, hữu ích.

3. ĐẶC BIỆT: HỎI ĐÁP CÂU HỎI NGOÀI LỀ (ĐỜI SỐNG, KHOA HỌC, HỌC TẬP, CÔNG NGHỆ, TÂM SỰ...):
   - Bạn HOÀN TOÀN CỞI MỞ VÀ SẴN SÀNG trả lời mọi câu hỏi ngoài lề của người dùng!
   - TUYỆT ĐỐI KHÔNG từ chối câu hỏi ngoài lề hay bảo người dùng "liên hệ lễ tân/HLV" khi họ hỏi về chuyện đời sống, học tập, công việc, khoa học hay trò chuyện phiếm.
   - Trả lời thông minh, thân thiện, có chiều sâu, ân cần và hài hước khi thích hợp.

DỮ LIỆU NGƯỜI DÙNG HIỆN TẠI:
- Tên: ${displayName}
- Vai trò: ${role}
- Mục tiêu: ${member?.goal || 'Duy trì sức khỏe và vóc dáng'}
- Trình độ: ${member?.level || 'Tự do'}

DỮ LIỆU TẬP LUYỆN (Nếu người dùng hỏi thông tin phòng tập):
- Gói tập: ${activePackage ? `${packageName || 'Gói tập'} (hiệu lực ${activePackage.start_date} -> ${activePackage.end_date}, trạng thái: ${activePackage.status})` : 'Chưa đăng ký gói nào'}
- Lịch tập tiếp theo: ${nextSchedule ? `${nextSchedule.date} lúc ${nextSchedule.time} (${nextSchedule.type || 'Cá nhân'}, HLV: ${nextSchedule.trainerName || trainerName || 'Chưa rõ'})` : 'Chưa có lịch sắp tới'}
- HLV phụ trách: ${trainerName || (hasTrainer ? 'Đã có HLV' : 'Chưa có HLV')}

LỊCH SỬ TRÒ CHUYỆN GẦN ĐÂY:
${historySnippet}

CÂU HỎI MỚI CỦA NGƯỜI DÙNG:
"${question}"

HƯỚNG DẪN TRÌNH BÀY:
- Trả lời bằng tiếng Việt.
- Dùng Markdown đẹp (in đậm từ khóa, gạch đầu dòng rõ ràng, icon sinh động).
- Xưng hô thân thiện, lịch thiệp ("mình" / "tôi" và "bạn"). Trả lời trực tiếp, đầy đủ và bổ ích nhất.
`;

  try {
    const answer = await askGemini(prompt, {
      temperature: 0.7,
      maxOutputTokens: 1500
    });
    return answer.trim();
  } catch (err) {
    console.error('Gemini chatbot error:', err.message);
    return fallbackChatAnswer(question, ctx);
  }
}


/* =========================================================
   FALLBACK CHATBOT
   Chỉ chạy khi kết nối Gemini hoàn toàn bị mất
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
    hasTrainer,
    name = ''
  } = ctx;

  const memberName =
    member?.name || name || 'bạn';

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
    return `Chào ${memberName}! Tôi là trợ lý AI FitCore. Tôi có thể giúp bạn giải đáp mọi thắc mắc về phòng gym cũng như trò chuyện, trao đổi kiến thức cùng bạn!`;
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

  return `Chào ${memberName}! Kết nối tới máy chủ Gemini AI hiện đang bị gián đoạn hoặc quá tải tạm thời nên mình chưa thể phân tích chi tiết câu hỏi này. Bạn hãy thử gửi lại sau vài giây nhé!`;
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
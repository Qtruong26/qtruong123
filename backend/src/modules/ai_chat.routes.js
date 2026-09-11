const express = require('express');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Model có thể đổi bằng biến môi trường.
// Để mặc định Gemini 3.7 Flash theo API hiện tại.
const GEMINI_MODEL =
  process.env.GEMINI_MODEL || 'gemini-3.7-flash';

/*
  POST /api/ai-chat

  Body:
  {
    "message": "Tôi nên tập ngực mấy buổi một tuần?",
    "history": []
  }
*/
router.post('/', async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        message: 'Chưa cấu hình GEMINI_API_KEY trên server.'
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        message: 'Vui lòng nhập câu hỏi.'
      });
    }

    /*
      Chỉ lấy một lượng lịch sử vừa phải
      để tránh request quá lớn.
    */
    const safeHistory = Array.isArray(history)
      ? history.slice(-10)
      : [];

    const contents = [];

    for (const item of safeHistory) {
      if (!item || !item.role || !item.text) continue;

      contents.push({
        role: item.role === 'assistant'
          ? 'model'
          : 'user',
        parts: [
          {
            text: String(item.text)
          }
        ]
      });
    }

    contents.push({
      role: 'user',
      parts: [
        {
          text: message.trim()
        }
      ]
    });

    const systemInstruction = `
Bạn là FitCore AI Assistant, chatbot hỗ trợ người dùng
của hệ thống quản lý phòng gym FitCore.

Nhiệm vụ:
- Trả lời câu hỏi về tập luyện.
- Hỗ trợ kiến thức cơ bản về dinh dưỡng.
- Giải thích các bài tập.
- Gợi ý lịch tập phù hợp ở mức tham khảo.
- Hỗ trợ người dùng hiểu các chức năng của hệ thống FitCore.
- Trả lời bằng tiếng Việt.
- Trả lời rõ ràng, dễ hiểu, ngắn gọn.
- Không giả vờ là bác sĩ hoặc huấn luyện viên chuyên môn.
- Với vấn đề y tế, chấn thương hoặc triệu chứng nghiêm trọng,
  khuyến nghị người dùng gặp bác sĩ/chuyên gia phù hợp.
- Không bịa dữ liệu cá nhân của hội viên.
- Không tự khẳng định thông tin tài khoản, gói tập hoặc thanh toán
  nếu hệ thống chưa cung cấp dữ liệu đó.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },

        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemInstruction
              }
            ]
          },

          contents,

          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);

      return res.status(502).json({
        message:
          data?.error?.message ||
          'Không thể kết nối với Gemini AI.'
      });
    }

    const answer =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || '')
        .join('')
        .trim();

    if (!answer) {
      return res.status(502).json({
        message: 'Gemini không trả về nội dung.'
      });
    }

    res.json({
      success: true,
      answer
    });

  } catch (err) {
    console.error('AI CHAT ERROR:', err);
    next(err);
  }
});

module.exports = router;
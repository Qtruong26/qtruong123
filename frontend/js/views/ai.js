/* =========================================================
   AI TRỢ LÝ - FITCORE
   ========================================================= */


/* =========================================================
   1. GỢI Ý LỊCH TẬP AI
   ========================================================= */

VIEWS.aiAssist = async function () {
  const isMember = SESSION.role === 'member';

  let defaultMember = null;

  if (isMember) {
    defaultMember = await Api.get(
      `/members/${SESSION.memberId}`
    );
  }

  const members = !isMember
    ? await Api.get('/members')
    : [];

  const goals = [
    'Giảm cân',
    'Tăng cơ',
    'Tăng sức bền',
    'Duy trì sức khỏe',
    'Phục hồi chấn thương'
  ];

  const levels = [
    'Mới bắt đầu',
    'Trung bình',
    'Nâng cao'
  ];

  const days = [
    'T2',
    'T3',
    'T4',
    'T5',
    'T6',
    'T7',
    'CN'
  ];

  return `
    <div class="topbar">
      <div>
        <div class="page-eyebrow">AI trợ lý</div>

        <div class="page-title">
          Gợi ý lịch tập AI
        </div>

        <div class="page-desc">
          AI gợi ý lịch tập tham khảo dựa trên mục tiêu,
          thời gian rảnh và mức độ hiện tại của hội viên.
        </div>
      </div>
    </div>

    <div class="panel ai-box">

      <div class="panel-head">
        <div class="panel-title">
          Thông tin đầu vào
        </div>
      </div>

      ${
        !isMember
          ? `
            <div class="field">
              <label>Chọn hội viên</label>

              <select
                id="ai_member"
                onchange="prefillAiMember()"
              >
                ${
                  members
                    .map(
                      (m) => `
                        <option
                          value="${m.id}"
                          data-goal="${m.goal || ''}"
                          data-level="${m.level || ''}"
                        >
                          ${m.name}
                        </option>
                      `
                    )
                    .join('')
                }
              </select>
            </div>
          `
          : ''
      }

      <div class="form-row">

        <div class="field">
          <label>Mục tiêu</label>

          <select id="ai_goal">
            ${
              goals
                .map(
                  (g) => `
                    <option
                      ${
                        defaultMember &&
                        defaultMember.goal === g
                          ? 'selected'
                          : ''
                      }
                    >
                      ${g}
                    </option>
                  `
                )
                .join('')
            }
          </select>
        </div>


        <div class="field">
          <label>Mức độ hiện tại</label>

          <select id="ai_level">
            ${
              levels
                .map(
                  (g) => `
                    <option
                      ${
                        defaultMember &&
                        defaultMember.level === g
                          ? 'selected'
                          : ''
                      }
                    >
                      ${g}
                    </option>
                  `
                )
                .join('')
            }
          </select>
        </div>

      </div>


      <div class="field">

        <label>
          Thời gian rảnh trong tuần
        </label>

        <div
          class="tag-row"
          id="ai_days"
        >
          ${
            days
              .map(
                (d, i) => `
                  <span
                    class="chip ${
                      i % 2 === 0
                        ? 'selected'
                        : ''
                    }"
                    onclick="
                      this.classList.toggle('selected')
                    "
                    data-day="${d}"
                  >
                    ${d}
                  </span>
                `
              )
              .join('')
          }
        </div>

      </div>


      <button
        class="btn btn-primary"
        onclick="runAiSuggest()"
      >
        Tạo gợi ý lịch tập
      </button>


      <div class="ai-disclaimer">
        ⚠️ Đây là gợi ý tham khảo do AI tạo ra dựa trên
        dữ liệu bạn cung cấp,
        <b>
          không thay thế tư vấn y tế hoặc chuyên môn thể chất
        </b>.
        Vui lòng trao đổi với huấn luyện viên hoặc bác sĩ
        trước khi bắt đầu chương trình tập mới.
      </div>


      <div id="ai_output"></div>

    </div>
  `;
};


/* =========================================================
   Chọn hội viên → tự điền mục tiêu + level
   ========================================================= */

function prefillAiMember() {

  const sel =
    document.getElementById('ai_member');

  if (!sel) return;

  const opt =
    sel.options[sel.selectedIndex];

  const goal =
    document.getElementById('ai_goal');

  const level =
    document.getElementById('ai_level');

  if (goal) {
    goal.value =
      opt.dataset.goal ||
      'Duy trì sức khỏe';
  }

  if (level) {
    level.value =
      opt.dataset.level ||
      'Mới bắt đầu';
  }
}


/* =========================================================
   Gọi API tạo lịch tập
   ========================================================= */

async function runAiSuggest() {

  const goal =
    document.getElementById('ai_goal')?.value;

  const level =
    document.getElementById('ai_level')?.value;

  const availability =
    Array.from(
      document.querySelectorAll(
        '#ai_days .chip.selected'
      )
    ).map(
      (c) => c.dataset.day
    );


  if (!availability.length) {

    toast(
      'Vui lòng chọn ít nhất 1 ngày rảnh.',
      true
    );

    return;
  }


  try {

    const result =
      await Api.post(
        '/ai/suggest-plan',
        {
          goal,
          level,
          availability
        }
      );


    const plan =
      Array.isArray(result.plan)
        ? result.plan
        : [];


    document.getElementById(
      'ai_output'
    ).innerHTML = `

      <div class="ai-output"><b>Lịch tập tham khảo — mục tiêu: ${goal} (mức độ: ${level})</b>${
      plan.length
        ? plan.map((p) => `<div style="margin-bottom:10px;"><span class="plan-day">${p.day || ''}</span>${p.focus || ''}${p.intensity ? ` — cường độ: ${p.intensity}` : ''}</div>`).join('')
        : `<div class="empty-state">AI chưa tạo được lịch tập.</div>`
    }</div>`;


    toast(
      'Đã tạo gợi ý lịch tập.'
    );

  } catch (err) {

    showApiError(err);

  }
}


/* =========================================================
   2. NHẮC LỊCH / GIA HẠN
   ========================================================= */

VIEWS.aiReminder = async function () {

  const members =
    await Api.get('/members');


  const rows =
    members
      .map(
        (m) => `
          <tr>

            <td>
              ${m.name}
            </td>

            <td>
              ${
                m.activePackage
                  ? m.activePackage.packageName
                  : '—'
              }
            </td>

            <td>
              ${pkgStatusBadge(
                m.packageStatus
              )}
            </td>

            <td class="right">

              <button
                class="icon-btn"
                onclick="genReminder(${m.id})"
              >
                Tạo tin nhắn AI
              </button>

            </td>

          </tr>
        `
      )
      .join('');


  return `

    <div class="topbar">

      <div>

        <div class="page-eyebrow">
          AI trợ lý
        </div>

        <div class="page-title">
          Nhắc lịch / Gia hạn gói
        </div>

        <div class="page-desc">
          AI sinh tin nhắn nhắc lịch tập hoặc gia hạn
          gói tập, ưu tiên hội viên sắp/đã hết hạn.
        </div>

      </div>


      <button
        class="btn btn-secondary"
        onclick="generateAllReminders()"
      >
        Tạo tin nhắn cho tất cả hội viên cần gia hạn
      </button>

    </div>


    <div class="panel">

      <div class="table-wrap">

        <table>

          <thead>

            <tr>
              <th>Hội viên</th>
              <th>Gói</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>

          </thead>

          <tbody>
            ${rows}
          </tbody>

        </table>

      </div>

    </div>


    <div id="reminder_output"></div>

  `;
};


/* =========================================================
   Tạo một tin nhắn nhắc gia hạn
   ========================================================= */

async function genReminder(memberId) {

  try {

    const {
      message
    } =
      await Api.get(
        `/ai/reminder/${memberId}`
      );


    const members =
      await Api.get('/members');


    const member =
      members.find(
        (x) => x.id === memberId
      );


    document.getElementById(
      'reminder_output'
    ).innerHTML = `

      <div class="panel ai-box">

        <div
          class="panel-title"
          style="margin-bottom:10px;"
        >
          Tin nhắn gợi ý cho
          ${member ? member.name : 'hội viên'}
        </div>


        <div class="ai-output">${message}</div>


        <div class="hint">
          Bạn có thể sao chép và gửi qua
          SMS/Zalo/Email cho hội viên.
        </div>

      </div>

    `;

  } catch (err) {

    showApiError(err);

  }
}


/* =========================================================
   Tạo tin nhắn cho tất cả hội viên cần gia hạn
   ========================================================= */

async function generateAllReminders() {

  try {

    const results =
      await Api.get(
        '/ai/reminders/bulk'
      );


    if (!results.length) {

      document.getElementById(
        'reminder_output'
      ).innerHTML = `

        <div class="panel">

          <div class="empty-state">
            Không có hội viên nào cần
            nhắc gia hạn lúc này 🎉
          </div>

        </div>

      `;

      return;
    }


    const html =
      results
        .map(
          (r) => `<div class="ai-output" style="margin-bottom:12px;"><b>${r.memberName}</b>
${r.message}</div>`
        )
        .join('');


    document.getElementById(
      'reminder_output'
    ).innerHTML = `

      <div class="panel ai-box">

        <div
          class="panel-title"
          style="margin-bottom:10px;"
        >
          Tin nhắn gợi ý
          (${results.length} hội viên)
        </div>

        ${html}

      </div>

    `;


    toast(
      `Đã tạo ${results.length} tin nhắn nhắc gia hạn.`
    );

  } catch (err) {

    showApiError(err);

  }
}


/* =========================================================
   3. TÓM TẮT TIẾN ĐỘ
   ========================================================= */

VIEWS.aiProgress = async function () {

  const isMember =
    SESSION.role === 'member';


  const members =
    !isMember
      ? await Api.get('/members')
      : [];


  return `

    <div class="topbar">

      <div>

        <div class="page-eyebrow">
          AI trợ lý
        </div>

        <div class="page-title">
          Tóm tắt tiến độ tập luyện
        </div>

        <div class="page-desc">
          AI tóm tắt tiến độ tập luyện của hội viên
          dựa trên lịch sử điểm danh.
        </div>

      </div>

    </div>


    <div class="panel ai-box">

      ${
        !isMember
          ? `

            <div class="field">

              <label>
                Chọn hội viên
              </label>

              <select id="prog_member">

                ${
                  members
                    .map(
                      (m) => `
                        <option
                          value="${m.id}"
                        >
                          ${m.name}
                        </option>
                      `
                    )
                    .join('')
                }

              </select>

            </div>


            <button
              class="btn btn-primary"
              onclick="runProgress()"
            >
              Tạo tóm tắt
            </button>

          `
          : `

            <button
              class="btn btn-primary"
              onclick="
                runProgress(${SESSION.memberId})
              "
            >
              Xem tóm tắt tiến độ của tôi
            </button>

          `
      }


      <div class="ai-disclaimer">

        ⚠️ Tóm tắt này do AI tạo tự động từ dữ liệu
        điểm danh, chỉ mang tính tham khảo và không
        thay thế đánh giá chuyên môn.

      </div>


      <div id="progress_output"></div>

    </div>

  `;
};


/* =========================================================
   Chạy tóm tắt tiến độ
   ========================================================= */

async function runProgress(fixedId) {

  const memberId =
    fixedId ||
    Number(
      document.getElementById(
        'prog_member'
      )?.value
    );


  if (!memberId) {

    toast(
      'Không xác định được hội viên.',
      true
    );

    return;
  }


  try {

    const result =
      await Api.get(
        `/ai/progress-summary/${memberId}`
      );


    const member =
      await Api.get(
        `/members/${memberId}`
      );


    document.getElementById(
      'progress_output'
    ).innerHTML = `

      <div class="ai-output"><b>Tóm tắt tiến độ — ${member.name}</b>

${result.text || result.summary || 'Chưa có dữ liệu tiến độ.'}</div>

    `;

  } catch (err) {

    showApiError(err);

  }
}


/* =========================================================
   4. CHATBOT AI GEMINI
   ========================================================= */

/* =========================================================
   4. CHATBOT AI GEMINI TOÀN DIỆN (HỎI ĐÁP CẢ NGOÀI LỀ)
   ========================================================= */

VIEWS.aiChatBot = async function () {
  const FITCORE_SUGGESTIONS = [
    'Gói tập của tôi còn bao nhiêu ngày?',
    'Lịch tập tiếp theo của tôi là khi nào?',
    'Làm sao để gia hạn gói tập hoặc check-in?',
    'Huấn luyện viên phụ trách của tôi là ai?'
  ];

  const GENERAL_SUGGESTIONS = [
    'Làm sao để duy trì thói quen tập khi bận rộn?',
    'Gợi ý thực đơn ăn uống lành mạnh dễ nấu cho người đi làm?',
    'Cho tôi vài lời khuyên giảm stress sau ngày làm việc mệt mỏi?',
    'Giải thích hiện tượng đau nhức cơ sau khi tập (DOMS)?',
    'Nên uống bao nhiêu nước mỗi ngày và cách phân bổ hợp lý?'
  ];

  return `
    <div class="topbar">
      <div>
        <div class="page-eyebrow">AI Trợ Lý Đa Năng</div>
        <div class="page-title">Hỏi đáp AI Toàn diện</div>
        <div class="page-desc">
          Trợ lý thông minh hỗ trợ giải đáp mọi thông tin FitCore (gói tập, lịch tập, PT, check-in, thanh toán) 
          <strong>và sẵn sàng trò chuyện, trả lời bất kỳ câu hỏi đời sống, khoa học, kiến thức ngoài lề nào</strong> cùng bạn.
        </div>
      </div>
    </div>

    <div class="panel ai-box">
      <!-- Lịch sử hội thoại -->
      <div id="aichat_output" style="max-height: 480px; min-height: 240px; overflow-y: auto; padding-right: 6px;">
        <div class="empty-state">
          Đang tải lịch sử hội thoại...
        </div>
      </div>

      <!-- Khung gợi ý câu hỏi -->
      <div style="margin-top: 14px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          🏋️ Về FitCore & Phòng tập:
        </div>
        <div class="tag-row" style="margin-bottom: 10px;">
          ${FITCORE_SUGGESTIONS.map(s => `
            <span class="chip" onclick="sendAiChatQuick('${s.replace(/'/g, "\\'")}')">
              ${s}
            </span>
          `).join('')}
        </div>

        <div style="font-size: 12px; font-weight: 600; color: var(--volt); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          💡 Câu hỏi ngoài lề, đời sống & kiến thức:
        </div>
        <div class="tag-row">
          ${GENERAL_SUGGESTIONS.map(s => `
            <span class="chip" style="border-color: rgba(198, 255, 58, 0.25);" onclick="sendAiChatQuick('${s.replace(/'/g, "\\'")}')">
              ${s}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Ô nhập câu hỏi tự do -->
      <div style="display: flex; gap: 8px; align-items: center; margin-top: 12px;">
        <input
          id="aichat_input"
          type="text"
          placeholder="Hỏi bất kỳ điều gì (về gym, lịch tập hoặc câu hỏi ngoài lề, kiến thức, đời sống...)..."
          autocomplete="off"
          style="flex: 1;"
          onkeydown="if(event.key === 'Enter') sendAiChatMessage()"
        />

        <button id="aichat_send_btn" class="btn btn-primary" onclick="sendAiChatMessage()">
          Gửi câu hỏi
        </button>
      </div>

      <!-- Các nút thao tác bổ trợ -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 8px;">
        <button class="btn btn-secondary" style="font-size: 13px;" onclick="focusAiChatInput()">
          + Hỏi câu hỏi khác
        </button>

        <button class="btn" style="font-size: 12px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);" onclick="clearAiChatHistory()">
          🗑️ Xóa lịch sử trò chuyện
        </button>
      </div>

      <div class="ai-disclaimer" style="margin-top: 14px;">
        💡 <strong>Mẹo:</strong> Bạn có thể trò chuyện tự nhiên với trợ lý AI như một người bạn — từ kỹ thuật hít thở, dinh dưỡng cho tới việc quản lý thời gian, công việc hay chuyện phiếm ngoài lề.
      </div>
    </div>
  `;
};


/* =========================================================
   Format Markdown đơn giản & an toàn
   ========================================================= */

function formatAiMarkdown(text) {
  if (!text) return '';
  let str = escapeAiHtml(text);

  // In đậm **text**
  str = str.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // In nghiêng *text*
  str = str.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Gạch đầu dòng * hoặc -
  str = str.replace(/^[*-]\s+(.+)$/gm, '<li style="margin-left: 18px;">$1</li>');

  // Tiêu đề ###
  str = str.replace(/^###\s+(.+)$/gm, '<h4 style="margin: 8px 0 4px; color: var(--volt); font-size: 14px;">$1</h4>');
  str = str.replace(/^##\s+(.+)$/gm, '<h3 style="margin: 10px 0 6px; color: var(--volt); font-size: 15px;">$1</h3>');

  // Đoạn code inline `code`
  str = str.replace(/`(.*?)`/g, '<code style="background: rgba(255,255,255,0.08); padding: 2px 5px; border-radius: 4px; font-family: monospace;">$1</code>');

  return str;
}


/* =========================================================
   Render lịch sử chat
   ========================================================= */

async function renderAiChat() {
  const el = document.getElementById('aichat_output');
  if (!el) return;

  try {
    const thread = await Api.get('/ai/chat/history');

    if (!Array.isArray(thread) || !thread.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding: 30px 10px;">
          <div style="font-size: 26px; margin-bottom: 8px;">👋</div>
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Chào bạn! Mình là FitCore AI Assistant.</div>
          <div style="color: var(--muted); font-size: 13px; max-width: 480px; margin: 0 auto;">
            Hãy chọn một câu hỏi gợi ý phía dưới hoặc nhập bất kỳ câu hỏi nào bạn muốn hỏi — 
            từ gói tập, check-in tại FitCore cho đến các chủ đề khoa học, học tập, đời sống ngoài lề!
          </div>
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="chat-bubble-row" style="display: flex; flex-direction: column; gap: 12px;">
        ${thread.map((c) => {
          const isUser = c.sender === 'user';
          return `
            <div style="align-self: ${isUser ? 'flex-end' : 'flex-start'}; max-width: 82%;">
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 3px; text-align: ${isUser ? 'right' : 'left'};">
                ${isUser ? 'Bạn' : '🤖 FitCore AI'}
              </div>
              <div
                class="chat-bubble"
                style="
                  background: ${isUser ? 'var(--volt)' : 'var(--surface-2)'};
                  color: ${isUser ? '#10130A' : 'var(--chalk)'};
                  padding: 10px 14px;
                  border-radius: ${isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px'};
                  white-space: pre-wrap;
                  word-break: break-word;
                  line-height: 1.55;
                  font-size: 13.5px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
                "
              >
                ${formatAiMarkdown(c.text)}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });

  } catch (err) {
    el.innerHTML = `
      <div class="empty-state">
        Không thể tải lịch sử hội thoại. Vui lòng thử lại sau.
      </div>
    `;
    console.error('AI chat history error:', err);
  }
}


/* =========================================================
   Click câu hỏi gợi ý
   ========================================================= */

function sendAiChatQuick(text) {
  const input = document.getElementById('aichat_input');
  if (!input) return;

  input.value = text;
  input.focus();
  sendAiChatMessage();
}


/* =========================================================
   Nút "+ Hỏi câu hỏi khác"
   ========================================================= */

function focusAiChatInput() {
  const input = document.getElementById('aichat_input');
  if (!input) return;

  input.value = '';
  input.focus();
}


/* =========================================================
   Xóa lịch sử trò chuyện
   ========================================================= */

async function clearAiChatHistory() {
  if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện AI không?')) {
    return;
  }

  try {
    await Api.delete('/ai/chat/history');
    if (typeof showToast === 'function') {
      showToast('Đã xóa sạch lịch sử trò chuyện.', 'success');
    }
    await renderAiChat();
    focusAiChatInput();
  } catch (err) {
    console.error('Lỗi xóa lịch sử:', err);
    alert(err.message || 'Không thể xóa lịch sử.');
  }
}


/* =========================================================
   Gửi câu hỏi tự do → Gemini
   ========================================================= */

async function sendAiChatMessage() {
  const input = document.getElementById('aichat_input');
  const btn = document.getElementById('aichat_send_btn');
  const outputEl = document.getElementById('aichat_output');
  const question = input?.value.trim();

  if (!question) return;

  try {
    input.value = '';
    if (btn) btn.disabled = true;

    // Hiển thị ngay tin nhắn của người dùng + bong bóng đang suy nghĩ
    let bubbleRow = outputEl.querySelector('.chat-bubble-row');
    if (!bubbleRow) {
      outputEl.innerHTML = '<div class="chat-bubble-row" style="display: flex; flex-direction: column; gap: 12px;"></div>';
      bubbleRow = outputEl.querySelector('.chat-bubble-row');
    }

    const tempUserBubble = document.createElement('div');
    tempUserBubble.style.cssText = 'align-self: flex-end; max-width: 82%;';
    tempUserBubble.innerHTML = `
      <div style="font-size: 11px; color: var(--muted); margin-bottom: 3px; text-align: right;">Bạn</div>
      <div class="chat-bubble" style="background: var(--volt); color: #10130A; padding: 10px 14px; border-radius: 14px 14px 2px 14px; font-size: 13.5px; line-height: 1.55; white-space: pre-wrap; word-break: break-word;">
        ${escapeAiHtml(question)}
      </div>
    `;
    bubbleRow.appendChild(tempUserBubble);

    const tempThinkingBubble = document.createElement('div');
    tempThinkingBubble.id = 'aichat_thinking_indicator';
    tempThinkingBubble.style.cssText = 'align-self: flex-start; max-width: 82%;';
    tempThinkingBubble.innerHTML = `
      <div style="font-size: 11px; color: var(--muted); margin-bottom: 3px;">🤖 FitCore AI</div>
      <div class="chat-bubble" style="background: var(--surface-2); color: var(--chalk); padding: 10px 14px; border-radius: 14px 14px 14px 2px; font-size: 13px; font-style: italic;">
        ✨ Đang suy nghĩ và soạn câu trả lời...
      </div>
    `;
    bubbleRow.appendChild(tempThinkingBubble);

    outputEl.scrollTop = outputEl.scrollHeight;

    // Gửi request API
    await Api.post('/ai/chat', { question });

    // Cập nhật lại lịch sử hoàn chỉnh
    await renderAiChat();

    input.focus();

  } catch (err) {
    console.error('Lỗi gửi câu hỏi AI:', err);
    alert(err.message || 'Không thể gửi câu hỏi.');
    await renderAiChat();
  } finally {
    if (btn) btn.disabled = false;
  }
}


/* =========================================================
   Escape HTML
   Tránh text chứa ký tự HTML độc hại
   ========================================================= */

function escapeAiHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
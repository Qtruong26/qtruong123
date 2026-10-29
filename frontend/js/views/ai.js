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
        <div class="page-eyebrow">Kế hoạch Huấn luyện</div>

        <div class="page-title">
          Thiết lập Lịch tập Mẫu theo Mục tiêu
        </div>

        <div class="page-desc">
          Hệ thống hỗ trợ phân chia khung lịch tập luyện khoa học (Push-Pull-Legs, Upper-Lower, Fullbody) dựa trên mục tiêu thể hình, cấp độ và số ngày tập trong tuần.
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
        Tạo khung lịch tập mẫu
      </button>


      <div class="ai-disclaimer" style="background: rgba(198, 255, 58, 0.08); border-color: rgba(198, 255, 58, 0.25); color: var(--chalk);">
        <b>Nguyên lý chuyên môn:</b> Khung lịch tập được xây dựng theo giáo trình thể hình chuẩn hóa. Huấn luyện viên và hội viên có thể tùy chỉnh bài tập, hiệp và mức tạ chi tiết trong phần <b>Giáo án tập luyện</b>.
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
        : `<div class="empty-state">Chưa tạo được lịch tập phù hợp.</div>`
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
                Tạo tin nhắn chăm sóc
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
          Vận hành Câu lạc bộ
        </div>

        <div class="page-title">
          Chăm sóc Hội viên &amp; Nhắc hạn Thẻ
        </div>

        <div class="page-desc">
          Tự động rà soát hội viên sắp hoặc đã hết hạn thẻ tập để tạo tin nhắn chăm sóc khách hàng và nhắc gia hạn kịp thời.
        </div>

      </div>


      <button
        class="btn btn-secondary"
        onclick="generateAllReminders()"
      >
        Quét &amp; Tạo tin nhắn nhắc hạn tất cả
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
            nhắc gia hạn lúc này.
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
          Theo dõi Thể lực
        </div>

        <div class="page-title">
          Báo cáo Đánh giá Thể chất &amp; Tiến độ
        </div>

        <div class="page-desc">
          Tổng hợp lịch sử buổi tập, tần suất rèn luyện và nhận xét chuyên môn về sự tiến bộ thể chất của hội viên.
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
              Tạo báo cáo đánh giá
            </button>

          `
          : `

            <button
              class="btn btn-primary"
              onclick="
                runProgress(${SESSION.memberId})
              "
            >
              Xem báo cáo đánh giá của tôi
            </button>

          `
      }


      <div class="ai-disclaimer" style="background: rgba(46, 213, 115, 0.08); border-color: rgba(46, 213, 115, 0.25); color: var(--chalk);">

        Báo cáo được trích xuất trực tiếp từ lịch sử check-in và dữ liệu rèn luyện thực tế của hội viên tại FitCore.

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
    'Lịch tập cá nhân tiếp theo của tôi là khi nào?',
    'Quy trình đăng ký gia hạn thẻ tập FitCore?',
    'Làm thế nào để liên hệ huấn luyện viên PT?'
  ];

  return `
    <div class="topbar">
      <div>
        <div class="page-eyebrow">Hỗ trợ Hội viên</div>
        <div class="page-title">Bàn Tư vấn Thể hình &amp; Dinh dưỡng FitCore</div>
        <div class="page-desc">
          Kênh giải đáp trực tiếp thông tin câu lạc bộ (thẻ tập, lịch PT, check-in, thanh toán) 
          và tư vấn kỹ thuật luyện tập, dinh dưỡng phục hồi thể hình chuyên sâu.
        </div>
      </div>
    </div>

    <div class="panel ai-box">
      <!-- Lịch sử hội thoại -->
      <div id="aichat_output" style="max-height: 480px; min-height: 240px; overflow-y: auto; padding-right: 6px; position: relative; scroll-behavior: smooth;">
        <div class="empty-state">
          Đang tải lịch sử hội thoại...
        </div>
      </div>

      <!-- Khung gợi ý câu hỏi -->
      <div style="margin-top: 14px; margin-bottom: 12px;">
        <div style="font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
          Câu hỏi thường gặp:
        </div>
        <div class="tag-row" style="margin-bottom: 10px;">
          ${FITCORE_SUGGESTIONS.map(s => `
            <span class="chip" onclick="sendAiChatQuick('${s.replace(/'/g, "\\'")}')">
              ${s}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Ô nhập câu hỏi -->
      <div style="display: flex; gap: 8px; align-items: center; margin-top: 12px;">
        <input
          id="aichat_input"
          type="text"
          placeholder="Nhập câu hỏi của bạn về thẻ tập, lịch tập, bài tập hoặc dinh dưỡng..."
          autocomplete="off"
          style="flex: 1;"
          onkeydown="if(event.key === 'Enter') sendAiChatMessage()"
        />

        <button id="aichat_send_btn" class="btn btn-primary" onclick="sendAiChatMessage()">
          Gửi câu hỏi
        </button>
      </div>

      <!-- Các nút thao tác bổ trợ -->
      <div style="display: flex; justify-content: flex-end; align-items: center; margin-top: 10px;">
        <button class="btn" style="font-size: 12px; background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25);" onclick="clearAiChatHistory()">
          Xóa lịch sử trò chuyện
        </button>
      </div>

      <div class="ai-disclaimer" style="margin-top: 14px;">
        <strong>Gợi ý:</strong> Bạn có thể hỏi trực tiếp về thời hạn thẻ tập, lịch PT cá nhân, các lớp nhóm hoặc hướng dẫn kỹ thuật bài tập thể hình.
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

async function renderAiChat(shouldScrollToQuestion = false) {
  const el = document.getElementById('aichat_output');
  if (!el) return;

  try {
    const thread = await Api.get('/ai/chat/history');

    if (!Array.isArray(thread) || !thread.length) {
      el.innerHTML = `
        <div class="empty-state" style="padding: 30px 10px;">
          <div style="width: 44px; height: 44px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; background: rgba(255, 107, 0, 0.12); border-radius: 50%; color: #FF6B00;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">Chào bạn! Mình là Tư vấn viên Thể hình FitCore.</div>
          <div style="color: var(--muted); font-size: 13px; max-width: 480px; margin: 0 auto;">
            Bạn có thể chọn nhanh các câu hỏi phía dưới hoặc gửi bất kỳ thắc mắc nào về gói tập, lịch hẹn PT, dinh dưỡng và kỹ thuật bài tập gym.
          </div>
        </div>
      `;
      return;
    }

    // Tìm index của câu hỏi người dùng cuối cùng
    let lastUserIndex = -1;
    for (let i = thread.length - 1; i >= 0; i--) {
      if (thread[i] && thread[i].sender === 'user') {
        lastUserIndex = i;
        break;
      }
    }

    el.innerHTML = `
      <div class="chat-bubble-row" style="display: flex; flex-direction: column; gap: 12px;">
        ${thread.map((c, idx) => {
          const isUser = c.sender === 'user';
          const isLastUser = (idx === lastUserIndex);
          return `
            <div
              class="${isUser ? 'chat-bubble-user-wrap' : 'chat-bubble-bot-wrap'} ${isLastUser ? 'chat-user-message-last' : ''}"
              ${isLastUser ? 'id="aichat_last_user_question"' : ''}
              style="align-self: ${isUser ? 'flex-end' : 'flex-start'}; max-width: 82%; scroll-margin-top: 14px;"
            >
              <div style="font-size: 11px; color: var(--muted); margin-bottom: 3px; text-align: ${isUser ? 'right' : 'left'};">
                ${isUser ? 'Bạn' : 'Tư vấn viên FitCore'}
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
      if (shouldScrollToQuestion || lastUserIndex !== -1) {
        scrollToAiQuestion();
      } else {
        el.scrollTop = el.scrollHeight;
      }
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
   Cuộn đến câu hỏi người dùng vừa hỏi
   ========================================================= */

function scrollToAiQuestion(targetElement) {
  const outputEl = document.getElementById('aichat_output');
  if (!outputEl) return;

  const target = targetElement ||
    outputEl.querySelector('.chat-user-message-last') ||
    outputEl.querySelector('.chat-bubble-user-wrap:last-of-type');

  if (!target) {
    outputEl.scrollTo({ top: outputEl.scrollHeight, behavior: 'smooth' });
    return;
  }

  // 1. Cuộn khung chat mượt mà đến đúng vị trí câu hỏi vừa hỏi
  const targetTop = target.offsetTop;
  outputEl.scrollTo({
    top: Math.max(0, targetTop - 12),
    behavior: 'smooth'
  });

  // 2. Nếu câu hỏi hoặc khung chat đang bị che khuất khỏi màn hình trình duyệt, cuộn nhẹ vào tầm nhìn
  try {
    const rect = target.getBoundingClientRect();
    const isAbove = rect.top < 70;
    const isBelow = rect.bottom > (window.innerHeight - 50);
    if (isAbove || isBelow) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  } catch (_) {}
}


/* =========================================================
   Click câu hỏi gợi ý
   ========================================================= */

function sendAiChatQuick(text) {
  if (document.getElementById('aichat_thinking_indicator')) {
    if (typeof showToast === 'function') {
      showToast('AI đang soạn câu trả lời, vui lòng chờ trong giây lát...', 'info');
    }
    return;
  }
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
  if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử cuộc trò chuyện không?')) {
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

  // Ngăn gửi trùng lặp khi đang xử lý
  if (document.getElementById('aichat_thinking_indicator')) {
    if (typeof showToast === 'function') {
      showToast('AI đang soạn câu trả lời, vui lòng chờ trong giây lát...', 'info');
    }
    return;
  }

  try {
    input.value = '';
    if (btn) btn.disabled = true;

    // Hiển thị ngay tin nhắn của người dùng + bong bóng đang suy nghĩ
    let bubbleRow = outputEl.querySelector('.chat-bubble-row');
    if (!bubbleRow) {
      outputEl.innerHTML = '<div class="chat-bubble-row" style="display: flex; flex-direction: column; gap: 12px;"></div>';
      bubbleRow = outputEl.querySelector('.chat-bubble-row');
    }

    // Xóa class đánh dấu câu hỏi trước đó
    bubbleRow.querySelectorAll('.chat-user-message-last').forEach((e) => {
      e.classList.remove('chat-user-message-last');
    });

    const tempUserBubble = document.createElement('div');
    tempUserBubble.className = 'chat-bubble-user-wrap chat-user-message-last';
    tempUserBubble.id = 'aichat_last_user_question';
    tempUserBubble.style.cssText = 'align-self: flex-end; max-width: 82%; scroll-margin-top: 14px;';
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
      <div style="font-size: 11px; color: var(--muted); margin-bottom: 3px;">Tư vấn viên FitCore</div>
      <div class="chat-bubble" style="background: var(--surface-2); color: var(--chalk); padding: 10px 14px; border-radius: 14px 14px 14px 2px; font-size: 13px; font-style: italic;">
        Đang soạn câu trả lời...
      </div>
    `;
    bubbleRow.appendChild(tempThinkingBubble);

    // Cuộn mượt đến câu hỏi vừa gửi
    requestAnimationFrame(() => {
      scrollToAiQuestion(tempUserBubble);
    });

    // Gửi request API
    await Api.post('/ai/chat', { question });

    // Cập nhật lại lịch sử hoàn chỉnh và cuộn đến câu hỏi vừa hỏi
    await renderAiChat(true);

    input.focus();

  } catch (err) {
    console.error('Lỗi gửi câu hỏi AI:', err);
    alert(err.message || 'Không thể gửi câu hỏi.');
    await renderAiChat(true);
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
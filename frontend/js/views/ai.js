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

      <div class="ai-output">

        <b>
          Lịch tập tham khảo
          — mục tiêu: ${goal}
          (mức độ: ${level})
        </b>

        <br><br>

        ${
          plan.length
            ? plan
                .map(
                  (p) => `
                    <div
                      style="
                        margin-bottom:10px;
                      "
                    >
                      <span class="plan-day">
                        ${p.day || ''}
                      </span>

                      ${p.focus || ''}

                      ${
                        p.intensity
                          ? ` — cường độ: ${p.intensity}`
                          : ''
                      }
                    </div>
                  `
                )
                .join('')
            : `
              <div class="empty-state">
                AI chưa tạo được lịch tập.
              </div>
            `
        }

      </div>
    `;


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


        <div class="ai-output">
          ${message}
        </div>


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
          (r) => `

            <div
              class="ai-output"
              style="margin-bottom:12px;"
            >

              <b>
                ${r.memberName}
              </b>

              <br>

              ${r.message}

            </div>

          `
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

      <div class="ai-output">

        <b>
          Tóm tắt tiến độ
          — ${member.name}
        </b>

        <br><br>

        ${
          result.text ||
          result.summary ||
          'Chưa có dữ liệu tiến độ.'
        }

      </div>

    `;

  } catch (err) {

    showApiError(err);

  }
}


/* =========================================================
   4. CHATBOT AI GEMINI
   ========================================================= */

VIEWS.aiChatBot = async function () {

  const SUGGESTIONS = [

    'Gói tập của tôi còn bao nhiêu ngày?',

    'Lịch tập tiếp theo của tôi là khi nào?',

    'Làm sao để gia hạn gói tập?',

    'Huấn luyện viên của tôi là ai?',

    'Làm sao để check-in?'

  ];


  return `

    <div class="topbar">

      <div>

        <div class="page-eyebrow">
          AI trợ lý
        </div>

        <div class="page-title">
          Hỏi đáp AI
        </div>

        <div class="page-desc">
          Trợ lý AI sử dụng Gemini để trả lời câu hỏi
          về gói tập, lịch tập, huấn luyện viên,
          check-in, thanh toán và các vấn đề liên quan
          đến FitCore.
        </div>

      </div>

    </div>


    <div class="panel ai-box">

      <!-- Lịch sử chat -->

      <div id="aichat_output">

        <div class="empty-state">
          Đang tải lịch sử hội thoại...
        </div>

      </div>


      <!-- Câu hỏi demo -->

      <div
        class="tag-row"
        style="
          margin-top:10px;
          margin-bottom:12px;
        "
      >

        ${SUGGESTIONS
          .map(
            (s) => `

              <span
                class="chip"
                onclick="
                  sendAiChatQuick(
                    '${s.replace(
                      /'/g,
                      "\\'"
                    )}'
                  )
                "
              >
                ${s}
              </span>

            `
          )
          .join('')}

      </div>


      <!-- Nhập câu hỏi tự do -->

      <div
        style="
          display:flex;
          gap:8px;
          align-items:center;
        "
      >

        <input
          id="aichat_input"
          type="text"
          placeholder="
            Nhập bất kỳ câu hỏi nào bạn muốn hỏi Gemini...
          "
          autocomplete="off"
          onkeydown="
            if(event.key === 'Enter')
              sendAiChatMessage()
          "
        />


        <button
          class="btn btn-primary"
          onclick="sendAiChatMessage()"
        >
          Gửi
        </button>

      </div>


      <!-- Nút hỏi câu khác -->

      <div
        style="
          margin-top:10px;
        "
      >

        <button
          class="btn btn-secondary"
          onclick="focusAiChatInput()"
        >
          + Hỏi câu hỏi khác
        </button>

      </div>


      <div
        class="ai-disclaimer"
        style="margin-top:14px;"
      >

        ⚠️ Trợ lý AI trả lời tự động và chỉ mang tính
        tham khảo. Với vấn đề khẩn cấp, y tế hoặc
        chuyên môn thể chất, vui lòng liên hệ lễ tân,
        huấn luyện viên hoặc bác sĩ.

      </div>

    </div>

  `;
};


/* =========================================================
   Render lịch sử chat
   ========================================================= */

async function renderAiChat() {

  const el =
    document.getElementById(
      'aichat_output'
    );


  if (!el) return;


  try {

    const thread =
      await Api.get(
        '/ai/chat/history'
      );


    if (!thread.length) {

      el.innerHTML = `

        <div class="empty-state">

          Chào bạn! 👋

          <br><br>

          Hãy chọn một câu hỏi mẫu
          hoặc nhập câu hỏi bất kỳ bên dưới
          để bắt đầu trò chuyện với Gemini.

        </div>

      `;

      return;
    }


    el.innerHTML = `

      <div
        class="chat-bubble-row"
        style="
          display:flex;
          flex-direction:column;
          gap:10px;
        "
      >

        ${thread
          .map(
            (c) => {

              const isUser =
                c.sender === 'user';

              return `

                <div
                  style="
                    align-self:
                      ${
                        isUser
                          ? 'flex-end'
                          : 'flex-start'
                      };
                    max-width:80%;
                  "
                >

                  <div
                    class="chat-bubble"
                    style="
                      background:
                        ${
                          isUser
                            ? 'var(--volt)'
                            : 'var(--surface-2)'
                        };

                      color:
                        ${
                          isUser
                            ? '#10130A'
                            : 'var(--chalk)'
                        };

                      padding:10px 14px;
                      border-radius:12px;
                      white-space:pre-wrap;
                      word-break:break-word;
                    "
                  >
                    ${escapeAiHtml(c.text)}
                  </div>

                </div>

              `;
            }
          )
          .join('')}

      </div>

    `;


    /*
     * Tự cuộn xuống tin nhắn mới nhất.
     */

   /*
 * Tự cuộn xuống tin nhắn mới nhất.
 */
requestAnimationFrame(() => {
  el.scrollTop = el.scrollHeight;
});

  } catch (err) {

    el.innerHTML = `

      <div class="empty-state">

        Không thể tải lịch sử hội thoại.

      </div>

    `;

    console.error(
      'AI chat history error:',
      err
    );
  }
}


/* =========================================================
   Click câu hỏi demo
   ========================================================= */

function sendAiChatQuick(text) {

  const input =
    document.getElementById(
      'aichat_input'
    );


  if (!input) return;


  input.value = text;

  input.focus();

  sendAiChatMessage();
}


/* =========================================================
   Nút "+ Hỏi câu hỏi khác"
   ========================================================= */

function focusAiChatInput() {

  const input =
    document.getElementById(
      'aichat_input'
    );


  if (!input) return;


  input.value = '';

  input.focus();
}


/* =========================================================
   Gửi câu hỏi tự do → Gemini
   ========================================================= */
async function sendAiChatMessage() {
  const input = document.getElementById('aichat_input');
  const question = input?.value.trim();

  if (!question) return;

  try {
    // Xóa ô nhập ngay sau khi lấy câu hỏi
    input.value = '';

    await Api.post('/ai/chat', {
      question
    });

    // Hiển thị lại lịch sử
    await renderAiChat();

    // Đưa con trỏ về ô nhập để hỏi câu tiếp theo
    input.focus();

  } catch (err) {
    console.error('Lỗi gửi câu hỏi AI:', err);
    alert(err.message || 'Không thể gửi câu hỏi.');
  }
}


/* =========================================================
   Escape HTML
   Tránh text Gemini chứa HTML/script
   ========================================================= */

function escapeAiHtml(value) {

  return String(
    value ?? ''
  )
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}
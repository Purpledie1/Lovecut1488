import { triggerRubberStamp } from './motion.js';

export function initBookingFlow() {
  const stepPanels = document.querySelectorAll('.step-panel');
  const phaseTabs = document.querySelectorAll('.phase-item');
  const progressBar = document.getElementById('flow-progress');

  // Step 1 Elements
  const checkTime = document.getElementById('rule-time');
  const checkDeposit = document.getElementById('rule-deposit');
  const checkCash = document.getElementById('rule-cash');
  const step1Btn = document.getElementById('btn-step-1');
  const rulesStatusTag = document.getElementById('rules-status-tag');

  // Step 2 Elements
  const daysContainer = document.getElementById('calendar-days-container');
  const slotsContainer = document.getElementById('time-slots-container');
  const slotDisplay = document.getElementById('selected-slot-display');
  const step2Btn = document.getElementById('btn-step-2');

  // Step 3 Elements
  const copyPhoneBtn = document.getElementById('copy-phone-btn');
  const copyLinkBtn = document.getElementById('copy-link-btn');

  // Step 4 Elements
  const receiptInput = document.getElementById('receipt-input');
  const receiptDropzone = document.getElementById('receipt-dropzone');
  const receiptPreview = document.getElementById('receipt-preview');
  const tgSendBtn = document.getElementById('tg-send-btn');
  const dispatchSummaryEl = document.getElementById('dispatch-summary-box');

  // State
  let currentStep = 1;
  let maxStepReached = 1;
  let selectedCut = null;
  let selectedDate = null;
  let selectedTimeSlot = '';
  let receiptFile = null;

  // Selected cut badge & preview elements
  const cutBadgeContainer = document.getElementById('selected-cut-badge-container');

  function renderSelectedCutUI() {
    if (!cutBadgeContainer) return;
    if (selectedCut) {
      const cutId = selectedCut.id || (typeof selectedCut === 'string' ? selectedCut : '01');
      const imgSrc = selectedCut.src || `assets/cuts/cut_${cutId}.jpg`;
      cutBadgeContainer.innerHTML = `
        <div class="selected-cut-strip">
          <img src="${imgSrc}" alt="Стрижка ${cutId}" class="selected-cut-thumb">
          <div class="selected-cut-meta">
            <span class="selected-cut-label">ВЫБРАННАЯ СТРИЖКА С 3D-СТЕНЫ:</span>
            <span class="selected-cut-title">РАБОТА #${cutId}</span>
          </div>
          <button type="button" id="btn-remove-selected-cut" class="btn-remove-cut" title="Выбрать на месте">
            СБРОСИТЬ [X]
          </button>
        </div>
      `;
      cutBadgeContainer.style.display = 'block';

      const removeBtn = document.getElementById('btn-remove-selected-cut');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          selectedCut = null;
          renderSelectedCutUI();
          updateDispatchSummary();
        });
      }
    } else {
      cutBadgeContainer.innerHTML = '';
      cutBadgeContainer.style.display = 'none';
    }
  }

  // Expose cut selector to window (called by 3D Wall)
  window.selectCutForBooking = (cut) => {
    selectedCut = cut;
    renderSelectedCutUI();
    updateDispatchSummary();

    const bookingSec = document.getElementById('booking-section');
    if (bookingSec) {
      bookingSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Backwards compatibility alias
  window.selectSpecimenForBooking = window.selectCutForBooking;

  function updateStepsUI(step) {
    if (step < 1) step = 1;
    if (step > 4) step = 4;
    currentStep = step;
    if (step > maxStepReached) maxStepReached = step;

    // Toggle panels
    stepPanels.forEach(panel => {
      const pStep = parseInt(panel.dataset.step, 10);
      panel.classList.toggle('active', pStep === step);
    });

    // Update phase tabs
    phaseTabs.forEach(tab => {
      const tStep = parseInt(tab.dataset.step, 10);
      tab.classList.toggle('active', tStep === step);
      tab.classList.toggle('completed', tStep < step);
      tab.classList.toggle('accessible', tStep <= maxStepReached);
    });

    if (progressBar) {
      const pct = ((step - 1) / 3) * 100;
      progressBar.style.width = `${pct}%`;
    }

    // Always purge previous rubber stamps on step change / back navigation
    document.querySelectorAll('.rubber-stamp').forEach(s => s.remove());

    // Trigger ink stamp on step 3 & 4 (strictly scoped inside the active step panel only)
    if (step >= 3) {
      const activePanel = document.querySelector(`.step-panel[data-step="${step}"]`);
      if (activePanel) {
        const text = step === 3 ? 'ЗАЛОГ 200 РУБЛЕЙ • Т-БАНК' : 'ЧЕК ПРИНЯТ • В TELEGRAM';
        triggerRubberStamp(activePanel, text);
      }
    }

    if (step === 4) {
      updateDispatchSummary();
    }
  }

  // Allow clicking on phase tabs to navigate directly
  phaseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetStep = parseInt(tab.dataset.step, 10);
      // Only allow navigating if step is accessible or step 1 validated
      if (targetStep === 1 || targetStep <= maxStepReached) {
        updateStepsUI(targetStep);
      } else if (targetStep === 2 && checkTime?.checked && checkDeposit?.checked && checkCash?.checked) {
        updateStepsUI(2);
      }
    });
  });

  // --- Step 1: Validation ---
  function validateRules() {
    const valid = !!(checkTime?.checked && checkDeposit?.checked && checkCash?.checked);
    if (step1Btn) {
      step1Btn.disabled = !valid;
    }
    if (rulesStatusTag) {
      rulesStatusTag.innerText = valid ? '[ПРАВИЛА ПРИНЯТЫ]' : '[ТРЕБУЕТСЯ СОГЛАСИЕ]';
      rulesStatusTag.classList.toggle('valid', valid);
    }
  }

  [checkTime, checkDeposit, checkCash].forEach(cb => {
    if (cb) {
      cb.addEventListener('change', () => {
        validateRules();
      });
    }
  });

  // --- Step 2: Calendar & Slots ---
  const RUSSIAN_MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const RUSSIAN_DOW = ['ВС', 'ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ'];
  const AVAILABLE_HOURS = ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  function initCalendarAndSlots() {
    if (!daysContainer || !slotsContainer) return;

    const today = new Date();
    const daysList = [];

    for (let i = 0; i < 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);

      const dayNum = d.getDate();
      const monthStr = RUSSIAN_MONTHS[d.getMonth()];
      const dowStr = RUSSIAN_DOW[d.getDay()];
      const fullLabel = i === 0 ? `Сегодня, ${dayNum} ${monthStr}` : i === 1 ? `Завтра, ${dayNum} ${monthStr}` : `${dayNum} ${monthStr} (${dowStr})`;

      daysList.push({
        dateObj: d,
        dayNum,
        monthStr,
        dowStr: i === 0 ? 'СЕГОДНЯ' : i === 1 ? 'ЗАВТРА' : dowStr,
        fullLabel,
        iso: d.toISOString().slice(0, 10)
      });
    }

    selectedDate = daysList[0];

    // Render Days
    daysContainer.innerHTML = '';
    daysList.forEach((day, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `calendar-day-btn ${idx === 0 ? 'active' : ''}`;
      btn.setAttribute('data-cursor', 'magnet');
      btn.innerHTML = `
        <div class="day-btn-dow">${day.dowStr}</div>
        <div class="day-btn-date">${day.dayNum} ${day.monthStr}</div>
      `;
      btn.addEventListener('click', () => {
        daysContainer.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedDate = day;
        updateSlotSummary();
      });
      daysContainer.appendChild(btn);
    });

    // Render Slots (strictly :00)
    slotsContainer.innerHTML = '';
    AVAILABLE_HOURS.forEach(slot => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'time-slot-btn';
      btn.setAttribute('data-cursor', 'magnet');
      btn.innerText = slot;
      btn.addEventListener('click', () => {
        slotsContainer.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTimeSlot = slot;
        updateSlotSummary();
      });
      slotsContainer.appendChild(btn);
    });

    updateSlotSummary();
  }

  function updateSlotSummary() {
    if (!slotDisplay) return;

    if (selectedDate && selectedTimeSlot) {
      slotDisplay.innerHTML = `
        <span class="text-crimson font-bold">${selectedDate.fullLabel.toUpperCase()}</span> в <span class="text-crimson font-bold">${selectedTimeSlot}</span>
        <span class="slot-note">(СТРОГО :00 • БЕЗ ОПОЗДАНИЙ)</span>
      `;
      if (step2Btn) step2Btn.disabled = false;
    } else {
      slotDisplay.innerHTML = `
        <span style="color: #8c8375;">${selectedDate ? selectedDate.fullLabel : ''}: ВЫБЕРИТЕ ВРЕМЯ :00 ВЫШЕ</span>
      `;
      if (step2Btn) step2Btn.disabled = true;
    }
  }

  // --- Step 4: Dispatch Summary ---
  function updateDispatchSummary() {
    if (!dispatchSummaryEl) return;
    const cutStr = selectedCut ? `Работа #${selectedCut.id || selectedCut}` : 'Выбор стрижки на месте';
    const dateStr = selectedDate ? selectedDate.fullLabel : 'Дата не выбрана';
    const timeStr = selectedTimeSlot ? `${selectedTimeSlot} (строго :00)` : 'Время не выбрано';

    dispatchSummaryEl.innerHTML = `
      <div class="summary-receipt-grid">
        <div class="summary-row">
          <span class="summary-lbl">МАСТЕР:</span>
          <span class="summary-val">АНДРЕЙ С. (ЛИТВИНОВА 18)</span>
        </div>
        <div class="summary-row">
          <span class="summary-lbl">ДАТА И ВРЕМЯ:</span>
          <span class="summary-val text-crimson">${dateStr}, ${timeStr}</span>
        </div>
        <div class="summary-row">
          <span class="summary-lbl">СТРИЖКА:</span>
          <span class="summary-val">${cutStr}</span>
        </div>
        <div class="summary-row">
          <span class="summary-lbl">ЗАЛОГ (Т-БАНК):</span>
          <span class="summary-val text-green">200 РУБЛЕЙ [ОПЛАЧЕН]</span>
        </div>
        <div class="summary-row">
          <span class="summary-lbl">ОСТАТОК:</span>
          <span class="summary-val">ТОЛЬКО НАЛИЧНЫМИ НА МЕСТЕ</span>
        </div>
      </div>
    `;
  }

  // Navigation handlers
  document.querySelectorAll('[data-goto-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.dataset.gotoStep, 10);
      updateStepsUI(nextStep);
    });
  });

  // Clipboard copy helpers
  function copyToClipboard(text, btnElement, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
      const origText = btnElement.innerText;
      btnElement.innerText = successMsg || 'СКОПИРОВАНО';
      btnElement.classList.add('copied');
      setTimeout(() => {
        btnElement.innerText = origText;
        btnElement.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.warn('Clipboard failed', err);
    });
  }

  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', () => {
      copyToClipboard('89086608498', copyPhoneBtn, '[OK] 89086608498 СКОПИРОВАН');
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      copyToClipboard('https://tbank.ru/cf/3h1q5KxghRV', copyLinkBtn, '[OK] ССЫЛКА СКОПИРОВАНА');
    });
  }

  // Receipt drag & drop
  if (receiptDropzone && receiptInput) {
    receiptDropzone.addEventListener('click', () => receiptInput.click());

    receiptDropzone.addEventListener('dragover', e => {
      e.preventDefault();
      receiptDropzone.classList.add('dragover');
    });

    receiptDropzone.addEventListener('dragleave', () => {
      receiptDropzone.classList.remove('dragover');
    });

    receiptDropzone.addEventListener('drop', e => {
      e.preventDefault();
      receiptDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleReceiptFile(e.dataTransfer.files[0]);
      }
    });

    receiptInput.addEventListener('change', () => {
      if (receiptInput.files && receiptInput.files[0]) {
        handleReceiptFile(receiptInput.files[0]);
      }
    });
  }

  function handleReceiptFile(file) {
    receiptFile = file;
    const reader = new FileReader();
    reader.onload = e => {
      if (receiptPreview) {
        receiptPreview.innerHTML = `
          <div class="receipt-success-badge">
            <img src="${e.target.result}" alt="Чек" class="receipt-thumbnail" />
            <div>
              <p class="font-bold text-crimson">[OK] СКРИНШОТ ЧЕКА ЗАГРУЖЕН</p>
              <p class="text-xs text-dim">${file.name} (${Math.round(file.size / 1024)} KB)</p>
            </div>
            <button type="button" id="btn-clear-receipt" class="btn-clear-file">УДАЛИТЬ</button>
          </div>
        `;
        receiptPreview.style.display = 'block';

        const clearBtn = document.getElementById('btn-clear-receipt');
        if (clearBtn) {
          clearBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            receiptFile = null;
            receiptInput.value = '';
            receiptPreview.innerHTML = '';
            receiptPreview.style.display = 'none';
          });
        }
      }
    };
    reader.readAsDataURL(file);
  }

  // Open Telegram with auto-generated text
  if (tgSendBtn) {
    tgSendBtn.addEventListener('click', () => {
      const cutText = selectedCut ? (selectedCut.id ? `• Выбранная стрижка: Работа #${selectedCut.id}` : `• Выбранная стрижка: ${selectedCut}`) : '• Стрижка: выбор на месте';
      const slotText = selectedDate && selectedTimeSlot ? `• Дата и время: ${selectedDate.fullLabel}, в ${selectedTimeSlot} (строго :00)` : '• Время: начало часа :00';

      const msg = encodeURIComponent(
        `Привет, Андрей! Записываюсь через сайт LOVECUT.\n` +
        `${slotText}\n` +
        `${cutText}\n` +
        `• Залог 200 ₽ на Т-Банк перевел.\n` +
        `• Остаток подготовлю наличными.\n\n` +
        `Прикрепляю скриншот чека:`
      );
      window.open(`https://t.me/LOVECUT2006?text=${msg}`, '_blank');
    });
  }

  // Initialization
  initCalendarAndSlots();
  renderSelectedCutUI();
  validateRules();
}

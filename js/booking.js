import { triggerRubberStamp } from './motion.js';

export function initBookingFlow() {
  const stepIndicators = document.querySelectorAll('.step-indicator-item, .phase-item');
  const stepPanels = document.querySelectorAll('.step-panel');
  const progressBar = document.getElementById('flow-progress');

  // Step 1: Rule checkboxes
  const checkTime = document.getElementById('rule-time');
  const checkDeposit = document.getElementById('rule-deposit');
  const checkCash = document.getElementById('rule-cash');
  const step1Btn = document.getElementById('btn-step-1');

  // Step 2: Native Slot & Calendar elements
  const daysContainer = document.getElementById('calendar-days-container');
  const slotsContainer = document.getElementById('time-slots-container');
  const slotDisplay = document.getElementById('selected-slot-display');
  const step2Btn = document.getElementById('btn-step-2');

  // Step 3: Requisite copy buttons
  const copyPhoneBtn = document.getElementById('copy-phone-btn');
  const copyLinkBtn = document.getElementById('copy-link-btn');

  // Step 4: Receipt handling & Telegram
  const receiptInput = document.getElementById('receipt-input');
  const receiptDropzone = document.getElementById('receipt-dropzone');
  const receiptPreview = document.getElementById('receipt-preview');
  const tgSendBtn = document.getElementById('tg-send-btn');

  let currentStep = 1;
  let selectedCut = null;
  let selectedDate = null;
  let selectedTimeSlot = '';

  // Expose cut selector so 3D wall or photo modal can trigger it
  window.selectCutForBooking = (cut) => {
    selectedCut = cut;
    const badge = document.getElementById('selected-cut-badge');
    if (badge) {
      badge.innerHTML = `ВЫБРАНА СТРИЖКА: <span class="text-crimson font-bold">РАБОТА ${cut.id || cut}</span>`;
      badge.style.display = 'inline-block';
    }
    const bookingSec = document.getElementById('booking-section');
    if (bookingSec) {
      bookingSec.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Backwards compatibility alias
  window.selectSpecimenForBooking = window.selectCutForBooking;

  function updateStepsUI(step) {
    currentStep = step;

    stepPanels.forEach(panel => {
      panel.classList.remove('active');
      if (parseInt(panel.dataset.step, 10) === step) {
        panel.classList.add('active');
      }
    });

    stepIndicators.forEach(ind => {
      const s = parseInt(ind.dataset.step, 10);
      ind.classList.remove('active', 'completed');
      if (s < step) ind.classList.add('completed');
      if (s === step) ind.classList.add('active');
    });

    if (progressBar) {
      const pct = ((step - 1) / 3) * 100;
      progressBar.style.width = `${pct}%`;
    }

    // Stamp receipt on deposit step
    if (step >= 3) {
      const bookingBox = document.getElementById('booking-terminal-box');
      if (bookingBox) {
        const text = step === 3 ? 'ЗАЛОГ 200 ₽ • СТРОГО :00' : 'ЧЕК ПРИНЯТ • В TELEGRAM';
        triggerRubberStamp(bookingBox, text);
      }
    }
  }

  // --- Step 1 Validation ---
  function validateRules() {
    const valid = checkTime?.checked && checkDeposit?.checked && checkCash?.checked;
    if (step1Btn) {
      step1Btn.disabled = !valid;
    }
  }

  [checkTime, checkDeposit, checkCash].forEach(cb => {
    if (cb) {
      cb.addEventListener('change', () => {
        validateRules();
      });
    }
  });

  // --- Step 2 Native Calendar & Slots Engine ---
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
        document.querySelectorAll('.calendar-day-btn').forEach(b => b.classList.remove('active'));
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
        document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
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
        <span style="font-size:0.8rem; color:#a1a1aa; font-weight:normal;">(строго :00)</span>
      `;
      if (step2Btn) step2Btn.disabled = false;
    } else {
      slotDisplay.innerHTML = `
        <span style="color:#a1a1aa;">${selectedDate ? selectedDate.fullLabel : ''} — выберите время :00 выше</span>
      `;
      if (step2Btn) step2Btn.disabled = true;
    }
  }

  initCalendarAndSlots();

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
      btnElement.innerText = successMsg || 'СКОПИРОВАНО!';
      btnElement.classList.add('copied');
      setTimeout(() => {
        btnElement.innerText = origText;
        btnElement.classList.remove('copied');
      }, 2200);
    }).catch(err => {
      console.warn('Clipboard failed', err);
    });
  }

  if (copyPhoneBtn) {
    copyPhoneBtn.addEventListener('click', () => {
      copyToClipboard('89086608498', copyPhoneBtn, '✓ 89086608498 СКОПИРОВАН');
    });
  }

  if (copyLinkBtn) {
    copyLinkBtn.addEventListener('click', () => {
      copyToClipboard('https://tbank.ru/cf/3h1q5KxghRV', copyLinkBtn, '✓ ССЫЛКА Т-БАНК СКОПИРОВАНА');
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
    const reader = new FileReader();
    reader.onload = e => {
      if (receiptPreview) {
        receiptPreview.innerHTML = `
          <div class="receipt-success-badge">
            <img src="${e.target.result}" alt="Чек" class="receipt-thumbnail" />
            <div>
              <p class="font-bold text-crimson">✓ СКРИНШОТ ПРИКРЕПЛЕН</p>
              <p class="text-xs text-zinc-400">${file.name} (${Math.round(file.size / 1024)} KB)</p>
            </div>
          </div>
        `;
        receiptPreview.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  }

  // Open Telegram with auto-generated text
  if (tgSendBtn) {
    tgSendBtn.addEventListener('click', () => {
      const cutText = selectedCut ? (selectedCut.id ? `• Выбранная стрижка: Работа [${selectedCut.id}]` : `• Выбранная стрижка: ${selectedCut}`) : '• Стрижка: выбор на месте';
      const slotText = selectedDate && selectedTimeSlot ? `• Дата и время: ${selectedDate.fullLabel}, в ${selectedTimeSlot} (строго :00)` : '• Время: начало часа :00';

      const msg = encodeURIComponent(
        `Привет, Андрей! Записываюсь через сайт LOVECUT.\n` +
        `${slotText}\n` +
        `${cutText}\n` +
        `• Залог 200 ₽ на Т-Банк перевел.\n` +
        `• Остаток подготовлю наличными 🩸.\n\n` +
        `Прикрепляю скриншот чека:`
      );
      window.open(`https://t.me/LOVECUT2006?text=${msg}`, '_blank');
    });
  }

  validateRules();
}

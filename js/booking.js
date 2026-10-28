import { sound } from './sound-fx.js';

export function initBookingFlow() {
  const stepIndicators = document.querySelectorAll('.step-indicator-item');
  const stepPanels = document.querySelectorAll('.step-panel');
  const progressBar = document.getElementById('flow-progress');

  // Rule checkboxes
  const checkTime = document.getElementById('rule-time');
  const checkDeposit = document.getElementById('rule-deposit');
  const checkCash = document.getElementById('rule-cash');
  const step1Btn = document.getElementById('btn-step-1');

  // Requisite copy buttons
  const copyPhoneBtn = document.getElementById('copy-phone-btn');
  const copyLinkBtn = document.getElementById('copy-link-btn');

  // Receipt handling
  const receiptInput = document.getElementById('receipt-input');
  const receiptDropzone = document.getElementById('receipt-dropzone');
  const receiptPreview = document.getElementById('receipt-preview');
  const tgSendBtn = document.getElementById('tg-send-btn');

  let currentStep = 1;
  let selectedSpecimen = null;
  let selectedTimeSlot = '';

  // Expose specimen selector to window so modal can trigger it
  window.selectSpecimenForBooking = (specimen) => {
    selectedSpecimen = specimen;
    const badge = document.getElementById('selected-specimen-badge');
    if (badge) {
      badge.innerHTML = `ВЫБРАН СТИЛЬ: <span class="text-crimson font-bold">[${specimen.id}] ${specimen.name}</span>`;
      badge.style.display = 'inline-block';
    }
    // Scroll smoothly to booking
    const bookingSec = document.getElementById('booking-section');
    if (bookingSec) {
      bookingSec.scrollIntoView({ behavior: 'smooth' });
    }
    sound.playSnip();
  };

  function updateStepsUI(step) {
    currentStep = step;
    sound.playClick();

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
  }

  // Validate step 1 checkboxes
  function validateRules() {
    const valid = checkTime?.checked && checkDeposit?.checked && checkCash?.checked;
    if (step1Btn) {
      step1Btn.disabled = !valid;
    }
  }

  [checkTime, checkDeposit, checkCash].forEach(cb => {
    if (cb) {
      cb.addEventListener('change', () => {
        sound.playClick();
        validateRules();
      });
    }
  });

  // Navigation handlers
  document.querySelectorAll('[data-goto-step]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextStep = parseInt(btn.dataset.gotoStep, 10);
      updateStepsUI(nextStep);
    });
  });

  // Clipboard copy helpers
  function copyToClipboard(text, btnElement, successMsg) {
    sound.playClick();
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
    sound.playSnip();
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
      sound.playSnip();
      const styleText = selectedSpecimen ? `Стиль: ${selectedSpecimen.name}` : 'Стрижка';
      const msg = encodeURIComponent(
        `Привет, Андрей! Записался через сайт lovecut.\n` +
        `• ${styleText}\n` +
        `• Залог 200₽ на Т-Банк перевел.\n` +
        `Прикрепляю скриншот чека:`
      );
      window.open(`https://t.me/LOVECUT2006?text=${msg}`, '_blank');
    });
  }

  validateRules();
}

import { initPosterWall, SPECIMENS } from './poster-wall.js';
import { initBookingFlow } from './booking.js';
import { sound } from './sound-fx.js';

document.addEventListener('DOMContentLoaded', () => {
  // Sound Toggle in Header
  const soundBtn = document.getElementById('sound-toggle-btn');
  const soundStatus = document.getElementById('sound-status-text');

  function updateSoundUI(enabled) {
    if (soundBtn) {
      soundBtn.classList.toggle('active', enabled);
      if (soundStatus) {
        soundStatus.innerText = enabled ? 'ON' : 'MUTED';
      }
    }
  }

  if (soundBtn) {
    updateSoundUI(sound.enabled);
    soundBtn.addEventListener('click', () => {
      const enabled = sound.toggle();
      updateSoundUI(enabled);
    });
  }

  // Specimen Lightbox Dialog
  const dialog = document.getElementById('specimen-dialog');
  const dlgImg = document.getElementById('dlg-specimen-img');
  const dlgId = document.getElementById('dlg-specimen-id');
  const dlgName = document.getElementById('dlg-specimen-name');
  const dlgStyle = document.getElementById('dlg-specimen-style');
  const dlgDesc = document.getElementById('dlg-specimen-desc');
  const dlgTools = document.getElementById('dlg-specimen-tools');
  const dlgTime = document.getElementById('dlg-specimen-time');
  const dlgChooseBtn = document.getElementById('dlg-choose-btn');
  const dlgCloseBtn = document.getElementById('dlg-close-btn');
  const dlgPrevBtn = document.getElementById('dlg-prev-btn');
  const dlgNextBtn = document.getElementById('dlg-next-btn');

  let currentSpecimenIndex = 0;

  function renderSpecimenInDialog(idx) {
    currentSpecimenIndex = idx;
    const s = SPECIMENS[idx];
    if (!s) return;

    if (dlgImg) {
      dlgImg.src = s.src;
      dlgImg.alt = s.name;
    }
    if (dlgId) dlgId.innerText = `SPECIMEN: #${s.id}`;
    if (dlgName) dlgName.innerText = s.name;
    if (dlgStyle) dlgStyle.innerText = s.style;
    if (dlgDesc) dlgDesc.innerText = s.desc;
    if (dlgTools) dlgTools.innerText = s.tools;
    if (dlgTime) dlgTime.innerText = s.time;
  }

  function openSpecimen(idx) {
    renderSpecimenInDialog(idx);
    if (dialog) {
      dialog.showModal();
      document.body.classList.add('modal-open');
    }
  }

  function closeSpecimen() {
    if (dialog) {
      dialog.close();
      document.body.classList.remove('modal-open');
    }
    sound.playClick();
  }

  if (dlgCloseBtn) dlgCloseBtn.addEventListener('click', closeSpecimen);

  if (dialog) {
    dialog.addEventListener('click', e => {
      const rect = dialog.getBoundingClientRect();
      const inDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!inDialog) closeSpecimen();
    });
  }

  if (dlgPrevBtn) {
    dlgPrevBtn.addEventListener('click', () => {
      sound.playClick();
      const nextIdx = (currentSpecimenIndex - 1 + SPECIMENS.length) % SPECIMENS.length;
      renderSpecimenInDialog(nextIdx);
    });
  }

  if (dlgNextBtn) {
    dlgNextBtn.addEventListener('click', () => {
      sound.playClick();
      const nextIdx = (currentSpecimenIndex + 1) % SPECIMENS.length;
      renderSpecimenInDialog(nextIdx);
    });
  }

  window.addEventListener('keydown', e => {
    if (dialog && dialog.open) {
      if (e.key === 'ArrowLeft') {
        const nextIdx = (currentSpecimenIndex - 1 + SPECIMENS.length) % SPECIMENS.length;
        renderSpecimenInDialog(nextIdx);
      } else if (e.key === 'ArrowRight') {
        const nextIdx = (currentSpecimenIndex + 1) % SPECIMENS.length;
        renderSpecimenInDialog(nextIdx);
      }
    }
  });

  if (dlgChooseBtn) {
    dlgChooseBtn.addEventListener('click', () => {
      const s = SPECIMENS[currentSpecimenIndex];
      closeSpecimen();
      if (window.selectSpecimenForBooking) {
        window.selectSpecimenForBooking(s);
      }
    });
  }

  // Initialize 3D Wall
  const stage = document.getElementById('pv-stage');
  let wallInstance = null;
  if (stage) {
    wallInstance = initPosterWall(stage, (idx) => {
      openSpecimen(idx);
    });

    const zoomInBtn = document.getElementById('wall-zoom-in');
    const zoomOutBtn = document.getElementById('wall-zoom-out');
    const resetBtn = document.getElementById('wall-reset');

    if (zoomInBtn && wallInstance) zoomInBtn.addEventListener('click', wallInstance.zoomIn);
    if (zoomOutBtn && wallInstance) zoomOutBtn.addEventListener('click', wallInstance.zoomOut);
    if (resetBtn && wallInstance) resetBtn.addEventListener('click', wallInstance.resetPos);
  }

  // Initialize Booking Flow
  initBookingFlow();

  // 3D Card Tilt for editorial dossier cards
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const { left, top, width, height } = card.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0)';
    });
  });

  // Sound effects on hover for buttons
  document.querySelectorAll('button, a, .interactive-tag').forEach(el => {
    el.addEventListener('mouseenter', () => sound.playClick());
  });
});

import { initPosterWall, CUT_PHOTOS } from './poster-wall.js?v=4';
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

  // Pure Photo Zoom Dialog
  const photoDialog = document.getElementById('photo-dialog');
  const photoImg = document.getElementById('photo-zoom-img');
  const photoCounter = document.getElementById('photo-counter-num');
  const photoCloseBtn = document.getElementById('photo-close-btn');
  const photoPrevBtn = document.getElementById('photo-prev-btn');
  const photoNextBtn = document.getElementById('photo-next-btn');

  let currentPhotoIndex = 0;

  function renderPhotoInDialog(idx) {
    currentPhotoIndex = idx;
    const item = CUT_PHOTOS[idx];
    if (!item) return;

    if (photoImg) {
      photoImg.src = item.src;
    }
    if (photoCounter) {
      photoCounter.innerText = item.id;
    }
  }

  function openPhoto(idx) {
    renderPhotoInDialog(idx);
    if (photoDialog) {
      photoDialog.showModal();
      document.body.classList.add('modal-open');
    }
  }

  function closePhoto() {
    if (photoDialog) {
      photoDialog.close();
      document.body.classList.remove('modal-open');
    }
    sound.playClick();
  }

  if (photoCloseBtn) photoCloseBtn.addEventListener('click', closePhoto);

  if (photoDialog) {
    photoDialog.addEventListener('click', e => {
      if (e.target === photoDialog) {
        closePhoto();
      }
    });
  }

  if (photoPrevBtn) {
    photoPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playClick();
      const nextIdx = (currentPhotoIndex - 1 + CUT_PHOTOS.length) % CUT_PHOTOS.length;
      renderPhotoInDialog(nextIdx);
    });
  }

  if (photoNextBtn) {
    photoNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sound.playClick();
      const nextIdx = (currentPhotoIndex + 1) % CUT_PHOTOS.length;
      renderPhotoInDialog(nextIdx);
    });
  }

  window.addEventListener('keydown', e => {
    if (photoDialog && photoDialog.open) {
      if (e.key === 'ArrowLeft') {
        const nextIdx = (currentPhotoIndex - 1 + CUT_PHOTOS.length) % CUT_PHOTOS.length;
        renderPhotoInDialog(nextIdx);
      } else if (e.key === 'ArrowRight') {
        const nextIdx = (currentPhotoIndex + 1) % CUT_PHOTOS.length;
        renderPhotoInDialog(nextIdx);
      } else if (e.key === 'Escape') {
        closePhoto();
      }
    }
  });

  // Initialize 3D Wall
  const stage = document.getElementById('pv-stage');
  let wallInstance = null;
  if (stage) {
    wallInstance = initPosterWall(stage, (idx) => {
      openPhoto(idx);
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

  // Hover sounds
  document.querySelectorAll('button, a, .calendar-day-btn, .time-slot-btn').forEach(el => {
    el.addEventListener('mouseenter', () => sound.playClick());
  });
});

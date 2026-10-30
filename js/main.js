import { initPosterWall, CUT_PHOTOS } from './poster-wall.js?v=15';
import { initBookingFlow } from './booking.js?v=15';
import { MagneticCursor } from './cursor.js?v=15';
import { initMagneticButtons, init3DCardTilt } from './motion.js?v=15';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize High-End Custom Magnetic Cursor & Spotlight
  try {
    new MagneticCursor();
  } catch (err) {
    console.warn('Custom cursor initialization:', err);
  }

  // 2. Initialize Kinetic Button Physics & Inner Parallax
  initMagneticButtons();

  // 3. Initialize 3D Card Tilt with Specular Glare Tracking
  init3DCardTilt();

  // Poster wall instance reference for performance pause/resume
  let wallInstance = null;

  // 4. Pure Photo Zoom Dialog
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
      wallInstance?.pause();
    }
  }

  function closePhoto() {
    if (photoDialog) {
      photoDialog.close();
      document.body.classList.remove('modal-open');
      wallInstance?.resume();
    }
  }

  if (photoCloseBtn) photoCloseBtn.addEventListener('click', closePhoto);

  if (photoDialog) {
    photoDialog.addEventListener('click', e => {
      if (e.target === photoDialog) {
        closePhoto();
      }
    });
    photoDialog.addEventListener('close', () => {
      document.body.classList.remove('modal-open');
      wallInstance?.resume();
    });
    photoDialog.addEventListener('cancel', () => {
      document.body.classList.remove('modal-open');
      wallInstance?.resume();
    });
  }

  if (photoPrevBtn) {
    photoPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextIdx = (currentPhotoIndex - 1 + CUT_PHOTOS.length) % CUT_PHOTOS.length;
      renderPhotoInDialog(nextIdx);
    });
  }

  if (photoNextBtn) {
    photoNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
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

  // 5. Initialize 3D Wall
  const stage = document.getElementById('pv-stage');
  if (stage) {
    wallInstance = initPosterWall(stage, (idx) => {
      openPhoto(idx);
    });
    window.wallInstance = wallInstance;

    const zoomInBtn = document.getElementById('wall-zoom-in');
    const zoomOutBtn = document.getElementById('wall-zoom-out');
    const resetBtn = document.getElementById('wall-reset');

    if (zoomInBtn && wallInstance) zoomInBtn.addEventListener('click', wallInstance.zoomIn);
    if (zoomOutBtn && wallInstance) zoomOutBtn.addEventListener('click', wallInstance.zoomOut);
    if (resetBtn && wallInstance) resetBtn.addEventListener('click', wallInstance.resetPos);
  }

  // 6. Initialize Booking Flow
  initBookingFlow();

  // 7. Easter Egg: Svyaz Meme
  const svyazImg = document.querySelector(".svyaz-easter-img");
  if (svyazImg) {
    svyazImg.addEventListener("click", (e) => {
      e.stopPropagation();
      svyazImg.classList.toggle("is-zoomed");
    });
    document.addEventListener("click", () => {
      svyazImg.classList.remove("is-zoomed");
    });
  }
});
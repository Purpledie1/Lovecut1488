// LOVECUT - High-End Motion & Tactile Physics Engine

// 1. Magnetic Buttons with Inner Text Parallax
export function initMagneticButtons() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const bindButtons = () => {
    document.querySelectorAll('.btn-primary, .btn-secondary, .ctrl-btn, .sound-btn, .copy-pill-btn').forEach(btn => {
      if (btn._magneticBound) return;
      btn._magneticBound = true;

      let bounds = null;

      btn.addEventListener('mouseenter', () => {
        bounds = btn.getBoundingClientRect();
      });

      btn.addEventListener('mousemove', e => {
        if (!bounds) bounds = btn.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height / 2;

        const deltaX = (e.clientX - centerX) * 0.32;
        const deltaY = (e.clientY - centerY) * 0.32;

        btn.style.transform = `translate3d(${deltaX.toFixed(1)}px, ${deltaY.toFixed(1)}px, 0)`;

        // Inner parallax on text child
        const textSpan = btn.querySelector('span:first-child');
        if (textSpan) {
          textSpan.style.transform = `translate3d(${(deltaX * 0.45).toFixed(1)}px, ${(deltaY * 0.45).toFixed(1)}px, 0)`;
        }
      });

      btn.addEventListener('mouseleave', () => {
        bounds = null;
        btn.style.transform = 'translate3d(0, 0, 0)';
        btn.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        const textSpan = btn.querySelector('span:first-child');
        if (textSpan) {
          textSpan.style.transform = 'translate3d(0, 0, 0)';
          textSpan.style.transition = 'transform 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }

        setTimeout(() => {
          btn.style.transition = '';
          if (textSpan) textSpan.style.transition = '';
        }, 450);
      });
    });
  };

  bindButtons();
  const obs = new MutationObserver(bindButtons);
  obs.observe(document.body, { childList: true, subtree: true });
}

// 2. 3D Card Tilt with Specular Glare Tracking
export function init3DCardTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const cards = document.querySelectorAll('.tilt-card');

  cards.forEach(card => {
    let glare = card.querySelector('.tilt-glare');
    if (!glare) {
      glare = document.createElement('div');
      glare.className = 'tilt-glare';
      card.appendChild(glare);
    }

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 7.5;
      const rotateY = ((x - centerX) / centerX) * 7.5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;

      const glareX = (x / rect.width) * 100;
      const glareY = (y / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255, 255, 255, 0.14) 0%, transparent 60%)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
      setTimeout(() => {
        card.style.transition = '';
      }, 450);
    });
  });
}

// 3. Razor Slice & Screen Recoil
export function triggerRazorSlice(targetEl) {
  if (targetEl) {
    targetEl.classList.remove('is-slicing');
    void targetEl.offsetWidth; // force reflow
    targetEl.classList.add('is-slicing');
    setTimeout(() => targetEl.classList.remove('is-slicing'), 240);
  }

  document.body.classList.remove('shake-recoil');
  void document.body.offsetWidth;
  document.body.classList.add('shake-recoil');
  setTimeout(() => document.body.classList.remove('shake-recoil'), 150);
}

// 4. Rubber Ink Stamp Slam
export function triggerRubberStamp(containerEl, stampText = 'ЗАЛОГ 200 ₽ ПРИНЯТ') {
  if (!containerEl) return;

  let stamp = containerEl.querySelector('.rubber-stamp');
  if (!stamp) {
    stamp = document.createElement('div');
    stamp.className = 'rubber-stamp';
    containerEl.appendChild(stamp);
  }

  stamp.innerText = stampText;
  stamp.classList.remove('slam');
  void stamp.offsetWidth;
  stamp.classList.add('slam');
}

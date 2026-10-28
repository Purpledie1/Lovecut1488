// LOVECUT - High-End Dual Magnetic Cursor & Ambient Spotlight Engine

export class MagneticCursor {
  constructor() {
    this.cursor = document.getElementById('custom-cursor');
    this.dot = this.cursor?.querySelector('.cursor-dot');
    this.ring = this.cursor?.querySelector('.cursor-ring');
    this.label = this.cursor?.querySelector('.cursor-label');
    this.spotlight = document.getElementById('ambient-spotlight');

    this.mouse = { x: -100, y: -100 };
    this.ringPos = { x: -100, y: -100 };
    this.targetPos = { x: -100, y: -100 };
    this.activeMagnet = null;
    this.isHovering = false;
    this.hasMoved = false;

    // Only activate on devices with fine pointer (mouse/trackpad)
    this.enabled = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!this.enabled || !this.cursor) {
      if (this.cursor) this.cursor.style.display = 'none';
      if (this.spotlight) this.spotlight.style.display = 'none';
      document.body.classList.remove('has-custom-cursor');
      return;
    }

    document.body.classList.add('has-custom-cursor');
    this.init();
  }

  init() {
    window.addEventListener('pointermove', e => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;

      if (!this.hasMoved) {
        this.hasMoved = true;
        this.ringPos.x = this.mouse.x;
        this.ringPos.y = this.mouse.y;
        this.cursor.style.opacity = '1';
      }

      // Fast direct placement for center dot
      if (this.dot) {
        this.dot.style.transform = `translate3d(${this.mouse.x}px, ${this.mouse.y}px, 0) translate(-50%, -50%)`;
      }

      // Update ambient spotlight
      if (this.spotlight) {
        this.spotlight.style.setProperty('--spot-x', `${this.mouse.x}px`);
        this.spotlight.style.setProperty('--spot-y', `${this.mouse.y}px`);
      }
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      if (this.cursor) this.cursor.style.opacity = '0';
    });

    document.addEventListener('pointerenter', () => {
      if (this.cursor && this.hasMoved) this.cursor.style.opacity = '1';
    });

    this.setupHoverTriggers();
    this.render();
  }

  setupHoverTriggers() {
    const bindElements = () => {
      document.querySelectorAll('[data-cursor]').forEach(el => {
        if (el._cursorBound) return;
        el._cursorBound = true;

        const type = el.dataset.cursor;
        const labelText = el.dataset.cursorLabel || '';

        el.addEventListener('mouseenter', () => {
          this.isHovering = true;
          this.cursor.className = `custom-cursor state-${type}`;
          if (this.label && labelText) {
            this.label.innerText = labelText;
          }
        });

        el.addEventListener('mouseleave', () => {
          this.isHovering = false;
          this.cursor.className = 'custom-cursor';
          if (this.label) this.label.innerText = '';
        });
      });
    };

    bindElements();
    // Re-bind when dynamic DOM elements are inserted (calendar, time slots)
    const observer = new MutationObserver(bindElements);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  render() {
    // Smooth spring LERP interpolation for the outer ring
    const factor = 0.16;
    let targetX = this.mouse.x;
    let targetY = this.mouse.y;

    this.ringPos.x += (targetX - this.ringPos.x) * factor;
    this.ringPos.y += (targetY - this.ringPos.y) * factor;

    if (this.ring) {
      this.ring.style.transform = `translate3d(${this.ringPos.x.toFixed(2)}px, ${this.ringPos.y.toFixed(2)}px, 0) translate(-50%, -50%)`;
    }

    requestAnimationFrame(() => this.render());
  }
}

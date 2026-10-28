import * as THREE from './vendor/three.module.js';
import { sound } from './sound-fx.js';

export const CUT_PHOTOS = Array.from({ length: 49 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return {
    index: i,
    id: num,
    src: `assets/cuts/cut_${num}.jpg`
  };
});

export function initPosterWall(stageEl, onSelectPhoto) {
  if (!stageEl) return null;

  const N = CUT_PHOTOS.length;
  const isMobile = () => window.innerWidth < 768;
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Renderer setup
  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x070709, 1);
  renderer.domElement.className = 'pv-canvas';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.cursor = 'grab';
  stageEl.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy?.() || 4);

  // Cell layout in world units
  const PAD = 0.08;
  const IW = 1 - PAD * 2;
  const IH = IW * 1.33; // 4:3 aspect ratio
  const GAPC = 0.04;
  const CAPR = 70 / 1024;
  const CAPH = IW * CAPR;
  const CELL = new THREE.Vector2(1, PAD + IH + GAPC + CAPH + PAD * 0.85);

  const baseScale = () => (isMobile() ? 2.3 : 1.85);

  // Load all 49 images asynchronously
  const loadedImages = [];
  const loadAll = Promise.all(
    CUT_PHOTOS.map((item, i) => {
      return new Promise(res => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
          loadedImages[i] = img;
          res(img);
        };
        img.onerror = () => {
          console.warn('Failed to load image', item.src);
          const c = document.createElement('canvas');
          c.width = 480; c.height = 640;
          const ctx = c.getContext('2d');
          ctx.fillStyle = '#141418'; ctx.fillRect(0, 0, 480, 640);
          ctx.fillStyle = '#ffffff'; ctx.font = '700 24px monospace';
          ctx.textAlign = 'center'; ctx.fillText(`LOVECUT #${item.id}`, 240, 320);
          loadedImages[i] = c;
          res(c);
        };
        img.src = item.src;
      });
    })
  );

  // Create Atlas Canvas Texture
  const G = 8;
  const TH = 520;
  const TW = Math.round(TH / 1.33);
  const PW = TW + G * 2;
  const PH = TH + G * 2;
  const ACOLS = 7;
  const AROWS = Math.ceil(N / ACOLS);

  const atlasCanvas = document.createElement('canvas');
  atlasCanvas.width = ACOLS * PW;
  atlasCanvas.height = AROWS * PH;
  const atlasCtx = atlasCanvas.getContext('2d');
  atlasCtx.fillStyle = '#070709';
  atlasCtx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);

  const atlasTex = new THREE.CanvasTexture(atlasCanvas);
  atlasTex.colorSpace = THREE.SRGBColorSpace;
  atlasTex.flipY = false;
  atlasTex.anisotropy = aniso;
  atlasTex.minFilter = THREE.LinearMipmapLinearFilter;
  atlasTex.generateMipmaps = true;

  const putPoster = (im, i) => {
    if (!im) return;
    const col = i % ACOLS;
    const row = Math.floor(i / ACOLS);
    const x = col * PW + G;
    const y = row * PH + G;
    const w = im.naturalWidth || im.width;
    const h = im.naturalHeight || im.height;

    // Draw main image
    atlasCtx.drawImage(im, x, y, TW, TH);

    // Gutter pixel stretching for seamless mipmaps
    atlasCtx.drawImage(im, 0, 0, 1, h, x - G, y, G, TH);
    atlasCtx.drawImage(im, w - 1, 0, 1, h, x + TW, y, G, TH);
    atlasCtx.drawImage(im, 0, 0, w, 1, x, y - G, TW, G);
    atlasCtx.drawImage(im, 0, h - 1, w, 1, x, y + TH, TW, G);
  };

  loadAll.then(() => {
    atlasCtx.imageSmoothingEnabled = true;
    atlasCtx.imageSmoothingQuality = 'high';
    loadedImages.forEach((img, i) => putPoster(img, i));
    atlasTex.needsUpdate = true;
  });

  // Create Captions Canvas Texture
  const CG = 6;
  const CHp = 38;
  const CWp = 420;
  const capCanvas = document.createElement('canvas');
  capCanvas.width = CWp + CG * 2;
  capCanvas.height = (CHp + CG * 2) * N;
  const capCtx = capCanvas.getContext('2d');

  const drawCaptions = () => {
    capCtx.clearRect(0, 0, capCanvas.width, capCanvas.height);
    capCtx.textBaseline = 'middle';
    const fs = 14;
    capCtx.font = `600 ${fs}px 'JetBrains Mono', monospace`;

    for (let i = 0; i < N; i++) {
      const y = i * (CHp + CG * 2) + CG + CHp / 2;

      // Clean brutalist label
      capCtx.fillStyle = '#ffffff';
      capCtx.textAlign = 'left';
      capCtx.fillText(`РАБОТА ${String(i + 1).padStart(2, '0')}`, CG + 4, y);

      capCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      capCtx.textAlign = 'right';
      capCtx.fillText('ФОТО ↗', CG + CWp - 4, y);
    }
  };
  drawCaptions();

  const capTex = new THREE.CanvasTexture(capCanvas);
  capTex.flipY = false;
  capTex.anisotropy = aniso;
  capTex.minFilter = THREE.LinearMipmapLinearFilter;

  // Shader Uniforms
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uOff: { value: new THREE.Vector2(0.5, 0.2) },
    uScale: { value: baseScale() },
    uK: { value: 0.16 },
    uAtlas: { value: atlasTex },
    uAtlMeta: { value: new THREE.Vector4(PW, PH, G, ACOLS) },
    uTile: { value: new THREE.Vector2(TW, TH) },
    uAtlasSize: { value: new THREE.Vector2(atlasCanvas.width, atlasCanvas.height) },
    uCaps: { value: capTex },
    uCapMeta: { value: new THREE.Vector4(CWp, CHp, CG, capCanvas.height) },
    uN: { value: N },
    uHover: { value: new THREE.Vector2(1e5, 1e5) },
    uHoverAmt: { value: 0 },
    uCell: { value: CELL },
    uImg: { value: new THREE.Vector4(PAD, PAD, IW, IH) },
    uCap: { value: new THREE.Vector4(PAD, PAD + IH + GAPC, IW, CAPH) }
  };

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    uniform vec2 uRes, uOff, uHover, uCell, uTile, uAtlasSize;
    uniform float uScale, uK, uN, uHoverAmt;
    uniform vec4 uImg, uCap, uAtlMeta, uCapMeta;
    uniform sampler2D uAtlas, uCaps;

    vec2 lens(vec2 p) {
      float r2 = dot(p, p);
      return p * (1.0 + uK * r2);
    }

    float idxOf(vec2 c) {
      // Robust non-negative hash across all 49 photos
      float h = c.x * 7.0 + c.y * 19.0 + floor(c.y / 2.0) * 5.0;
      return mod(mod(h, uN) + uN, uN);
    }

    void main() {
      vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
      vec2 p = (frag / uRes) * 2.0 - 1.0;
      p.x *= uRes.x / uRes.y;

      vec2 q = lens(p);
      vec2 w = q * uScale + uOff;

      vec2 g = w / uCell;
      vec2 cell = floor(g);
      vec2 f = fract(g) * uCell;

      float idx = idxOf(cell);
      vec2 wdx = dFdx(w);
      vec2 wdy = dFdy(w);
      vec2 dw = vec2(length(vec2(wdx.x, wdy.x)), length(vec2(wdx.y, wdy.y)));

      vec3 col = vec3(0.035, 0.035, 0.04);
      float hov = step(abs(cell.x - uHover.x) + abs(cell.y - uHover.y), 0.5) * uHoverAmt;

      // Poster Box
      vec2 iu = (f - uImg.xy) / uImg.zw;
      vec2 ed = min(f - uImg.xy, uImg.xy + uImg.zw - f) / max(dw, vec2(1e-5));
      float cov = clamp(min(ed.x, ed.y) + 0.5, 0.0, 1.0);

      if (cov > 0.0) {
        float colIdx = mod(idx, uAtlMeta.w);
        float rowIdx = floor(idx / uAtlMeta.w);
        vec2 tile = vec2(colIdx, rowIdx);
        vec2 px = tile * uAtlMeta.xy + uAtlMeta.z + clamp(iu * uTile, vec2(0.5), uTile - 0.5);

        vec3 texCol = texture2D(uAtlas, px / uAtlasSize).rgb;

        // Sterling silver hairline border
        float borderDist = min(iu.x, min(1.0 - iu.x, min(iu.y, 1.0 - iu.y)));
        if (borderDist < 0.012) {
          texCol = mix(texCol, vec3(0.9, 0.9, 0.92), 0.35 + hov * 0.65);
        }

        // Subtle gallery hover exposure
        texCol += vec3(0.08, 0.08, 0.08) * hov;

        col = mix(col, texCol, cov);
      }

      // Caption Box
      vec2 cu = (f - uCap.xy) / uCap.zw;
      vec2 ced = min(f - uCap.xy, uCap.xy + uCap.zw - f) / max(dw, vec2(1e-5));
      float ccov = clamp(min(ced.x, ced.y) + 0.5, 0.0, 1.0);

      if (ccov > 0.0 && cu.x >= 0.0 && cu.x <= 1.0 && cu.y >= 0.0 && cu.y <= 1.0) {
        float cy = (idx * (uCapMeta.y + uCapMeta.z * 2.0) + uCapMeta.z + cu.y * uCapMeta.y) / uCapMeta.w;
        float cx = (uCapMeta.z + cu.x * uCapMeta.x) / (uCapMeta.x + uCapMeta.z * 2.0);
        vec4 capCol = texture2D(uCaps, vec2(cx, cy));
        col = mix(col, capCol.rgb, ccov * capCol.a);
      }

      // Edge Vignette
      float vig = clamp(1.0 - dot(p * 0.32, p * 0.32), 0.0, 1.0);
      col *= vig;

      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  scene.add(quad);

  // Interaction & Physics
  const el = renderer.domElement;
  let scale = baseScale();
  let scaleTarget = baseScale();
  const off = uniforms.uOff.value;
  const offTarget = off.clone();
  const vel = new THREE.Vector2(0.0003, 0.0002);
  let drag = null;
  let hoverAmtTarget = 0;

  const toWorld = (cx, cy) => {
    const r = el.getBoundingClientRect();
    const a = r.width / r.height;
    let px = ((cx - r.left) / r.width) * 2 - 1;
    let py = ((cy - r.top) / r.height) * 2 - 1;
    px *= a;
    const r2 = px * px + py * py;
    const k = 1 + uniforms.uK.value * r2;
    return new THREE.Vector2(px * k * scale + off.x, py * k * scale + off.y);
  };

  const cellAt = (cx, cy) => {
    const w = toWorld(cx, cy);
    const c = new THREE.Vector2(Math.floor(w.x / CELL.x), Math.floor(w.y / CELL.y));
    const fx = w.x - c.x * CELL.x;
    const fy = w.y - c.y * CELL.y;
    const onImg = fx >= PAD && fx <= PAD + IW && fy >= PAD && fy <= PAD + IH;
    const h = c.x * 7 + c.y * 19 + Math.floor(c.y / 2) * 5;
    const idx = Math.floor(((h % N) + N) % N);
    return { c, onImg, idx };
  };

  const pxToWorld = () => {
    const r = el.getBoundingClientRect();
    return (2 / r.height) * scale;
  };

  // Pointer & Drag handling
  el.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), startX: e.clientX, startY: e.clientY };
    vel.set(0, 0);
    el.setPointerCapture?.(e.pointerId);
    el.style.cursor = 'grabbing';
    if (!reduce()) scaleTarget = baseScale() * 1.08;
    sound.playClick();
  });

  el.addEventListener('pointermove', e => {
    if (drag) {
      const k = pxToWorld();
      const now = performance.now();
      const dx = (e.clientX - drag.x) * k;
      const dy = (e.clientY - drag.y) * k;
      const dt = Math.max(1, now - drag.t);

      offTarget.x -= dx;
      offTarget.y -= dy;
      vel.set(-dx / dt * 16, -dy / dt * 16);
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = now;
    }

    if (e.pointerType !== 'touch') {
      const h = cellAt(e.clientX, e.clientY);
      if (h.onImg && !drag) {
        uniforms.uHover.value.copy(h.c);
        hoverAmtTarget = 1;
        el.style.cursor = 'pointer';
      } else {
        hoverAmtTarget = 0;
        el.style.cursor = drag ? 'grabbing' : 'grab';
      }
    }
  });

  const onPointerUp = e => {
    if (!drag) return;
    const dist = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY);
    const duration = performance.now() - drag.t;

    // Clean Tap detected -> Open pure photo zoom!
    if (dist < 8 && duration < 600) {
      const h = cellAt(e.clientX, e.clientY);
      if (h.onImg && onSelectPhoto) {
        sound.playSub();
        onSelectPhoto(h.idx, CUT_PHOTOS[h.idx]);
      }
    }

    drag = null;
    scaleTarget = baseScale();
    el.style.cursor = 'grab';
    if (reduce()) vel.set(0, 0);
  };

  el.addEventListener('pointerup', onPointerUp);
  el.addEventListener('pointercancel', onPointerUp);
  el.addEventListener('pointerleave', () => {
    hoverAmtTarget = 0;
  });

  el.addEventListener('wheel', e => {
    e.preventDefault();
    const k = pxToWorld() * 0.7;
    offTarget.x += (e.shiftKey ? e.deltaY : e.deltaX) * k;
    offTarget.y += (e.shiftKey ? 0 : e.deltaY) * k;
    vel.set(0, 0);
  }, { passive: false });

  // Resize handling
  const resize = () => {
    const w = stageEl.clientWidth || window.innerWidth;
    const h = stageEl.clientHeight || window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    uniforms.uRes.value.set(w * renderer.getPixelRatio(), h * renderer.getPixelRatio());
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);
  resize();

  // Animation Loop
  let rafId = 0;
  let lastTime = performance.now();

  const animate = now => {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(32, now - lastTime) / 16;
    lastTime = now;

    if (!drag) {
      offTarget.x += vel.x * dt;
      offTarget.y += vel.y * dt;
      vel.x *= Math.pow(0.93, dt);
      vel.y *= Math.pow(0.93, dt);

      if (Math.hypot(vel.x, vel.y) < 0.0001) {
        vel.x = Math.sin(now * 0.0004) * 0.0002;
        vel.y = Math.cos(now * 0.0005) * 0.0002;
      }
    }

    off.x += (offTarget.x - off.x) * 0.15 * dt;
    off.y += (offTarget.y - off.y) * 0.15 * dt;
    scale += (scaleTarget - scale) * 0.12 * dt;
    uniforms.uScale.value = scale;

    uniforms.uHoverAmt.value += (hoverAmtTarget - uniforms.uHoverAmt.value) * 0.2 * dt;

    renderer.render(scene, camera);
  };
  rafId = requestAnimationFrame(animate);

  return {
    destroy: () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mat.dispose();
      quad.geometry.dispose();
      atlasTex.dispose();
      capTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
    },
    zoomIn: () => {
      scaleTarget = Math.max(1.2, scaleTarget * 0.85);
      sound.playClick();
    },
    zoomOut: () => {
      scaleTarget = Math.min(3.8, scaleTarget * 1.18);
      sound.playClick();
    },
    resetPos: () => {
      offTarget.set(0.5, 0.2);
      scaleTarget = baseScale();
      vel.set(0, 0);
      sound.playSnip();
    }
  };
}

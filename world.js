// Illustrated world: scroll flies a camera through the artwork, landmark by landmark.
// The artwork is drawn on a canvas by cropping exactly the visible region each frame, so it can never show an edge,
// never blank-tiles a huge layer, and samples the full resolution image when zoomed.
(() => {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  const lerp = (a, b, t) => a + (b - a) * t;
  const IW = 1712, IH = 919;                       // artwork coordinate space
  const REAL = { x: 231, y: 576, w: 83, h: 262 };   // where the real photo sits on the illustrated figure

  const root = document.getElementById('top');
  const stage = document.getElementById('worldStage');
  const canvas = document.getElementById('wCanvas');
  const ctx = canvas.getContext('2d');
  const pinsEl = document.getElementById('pins');
  const title = document.getElementById('wTitle');
  const nameEl = document.getElementById('wName');
  const nl = nameEl.querySelector('.l'), nr = nameEl.querySelector('.r');
  const cue = document.getElementById('wCue');
  const card = document.getElementById('wCard');
  const dotsEl = document.getElementById('wDots');
  const mapEl = document.getElementById('wMap');
  const mapView = mapEl.querySelector('.view');
  const nav = document.querySelector('.nav');
  const themed = [...document.querySelectorAll('[data-nav]')];
  const parallax = [...document.querySelectorAll('[data-speed]')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let queued = false;
  function queue() { if (!queued) { queued = true; requestAnimationFrame(render); } }

  // Images
  const load = (src) => new Promise((res) => { const i = new Image(); i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
  let art = null, clean = null, real = null, realNight = null;
  Promise.all([load('assets/india-world-2x.webp?v=3'), load('assets/india-world-clean-2x.webp?v=2'), load('assets/sarath-full.webp?v=3')]).then(([a, c, r]) => {
    art = a; clean = c; real = r;
    if (r) { realNight = document.createElement('canvas'); realNight.width = r.naturalWidth; realNight.height = r.naturalHeight; const g = realNight.getContext('2d'); g.drawImage(r, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(24,22,70,0.42)'; g.fillRect(0, 0, realNight.width, realNight.height); }
    queue();
  });

  // Chapters. fx, fy are positions on the artwork (0 to 1). z is the zoom, cap limits magnification of soft artwork.
  const STOPS = [
    { fx: 0.159, fy: 0.76, z: 3.0, cap: 2.9, pin: 'Sarath', year: 'Training', h: 'The architect first.', t: "A bachelor's in architecture from the University of Madras, then architecture and urban planning in the USA.", stat: 'B.Arch · University of Madras' },
    { fx: 0.255, fy: 0.55, z: 2.4, pin: 'Pioneer Group · 1983', year: '1983', h: 'Pioneer Group, Chennai.', t: 'Managing Director since March 1983 of one of the most respected real estate houses in the city.', stat: '43 years at the helm' },
    { fx: 0.915, fy: 0.70, z: 2.3, pin: '3M sq ft · TN and AP', year: 'Two states', h: 'Almost 3 million square feet.', t: 'Premium, luxury commercial and residential projects across Tamil Nadu and Andhra Pradesh.', stat: 'About 3M sq ft built' },
    { fx: 0.72, fy: 0.745, z: 2.2, pin: 'Software · 1992', year: '1992 to 2012', h: 'Software, written by a builder.', t: 'Construction Management Software in 1992, then KPOST and KSMACC in 2012 for open and closed communication.', stat: 'Nearly three decades of software' },
    { fx: 0.885, fy: 0.27, z: 2.4, pin: 'KWALL · 2014', year: '2014', h: 'KWALL.', t: 'Lightweight hollow core wall panels, and the machinery he designed to make different types of acoustic panels.', stat: 'Walls, reimagined' },
    { fx: 0.935, fy: 0.47, z: 2.5, pin: 'UEducate · 2023', year: '2020 to 2023', h: 'UEducate.', t: 'A digital ecosystem for education: KATBOOK, KAMPUS, KSMACC and USTUDY. UEducate Global was incorporated in Chennai in April 2023.', stat: 'KATBOOK · KAMPUS · KSMACC · USTUDY' },
    { fx: 0.265, fy: 0.415, z: 2.4, pin: 'NCERT · 2025', year: 'August 2025', h: 'NCERT says yes.', t: 'NCERT signs an MoU at its New Delhi headquarters to convert its textbooks into KATBOOKs, with nationwide rollout planned over 18 months.', stat: '18 month national rollout' },
    { fx: 0.63, fy: 0.44, z: 2.0, pin: 'The horizon', year: 'The horizon', h: 'Quality education for every child.', t: 'The goal behind the NCERT partnership: offline access to learning for 250 million students across India.', stat: '250M students' },
  ];
  const VISTA = { fx: 0.5, fy: 0.5, z: 1, c: 'mid' };
  const camOf = (s) => ({ fx: s.fx, fy: s.fy, z: s.z, cap: s.cap, c: 'card' });

  // Timeline of segments. w is a relative scroll length.
  const SEGS = [
    { k: 'hold', cam: VISTA, w: 0.7, title: true },
    { k: 'fly', from: VISTA, to: camOf(STOPS[0]), w: 1.3 },
    { k: 'reveal', cam: { ...camOf(STOPS[0]), c: 'mid' }, w: 1.8 },
    { k: 'fly', from: { ...camOf(STOPS[0]), c: 'mid' }, to: camOf(STOPS[0]), w: 0.1, tag: 'settle' },
    { k: 'hold', cam: camOf(STOPS[0]), w: 1.1, card: 0 },
  ];
  for (let i = 1; i < STOPS.length; i++) SEGS.push({ k: 'fly', from: camOf(STOPS[i - 1]), to: camOf(STOPS[i]), w: 0.75, tag: i === 1 ? 'leave0' : '' }, { k: 'hold', cam: camOf(STOPS[i]), w: 1.05, card: i });
  SEGS.push({ k: 'fly', from: camOf(STOPS[STOPS.length - 1]), to: VISTA, w: 1.1 }, { k: 'hold', cam: VISTA, w: 1.0, card: 'final' });
  const total = SEGS.reduce((a, s) => a + s.w, 0);
  let acc = 0; SEGS.forEach(s => { s.a = acc / total; acc += s.w; s.b = acc / total; });
  const stopStart = {}; SEGS.forEach(s => { if (s.k === 'hold' && typeof s.card === 'number') stopStart[s.card] = s.a; });

  // Pins (screen space, positioned each frame), dots, minimap markers and the accessible list
  const pins = STOPS.map((s, i) => {
    const b = document.createElement('button');
    b.className = 'pin' + (s.fx > 0.8 ? ' flip' : ''); b.type = 'button'; b.dataset.stop = i;
    b.innerHTML = `<span class="pin-dot"></span><span class="pin-label">${s.pin}</span>`;
    b.setAttribute('aria-label', `${s.pin}: go to this chapter`);
    pinsEl.appendChild(b); return b;
  });
  const dots = STOPS.map((s, i) => {
    const li = document.createElement('li'); const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', `Chapter ${i + 1}: ${s.h}`); b.dataset.stop = i; li.appendChild(b); dotsEl.appendChild(li); return b;
  });
  const mdots = STOPS.map(s => { const d = document.createElement('i'); d.className = 'md'; d.style.left = s.fx * 100 + '%'; d.style.top = s.fy * 100 + '%'; mapEl.appendChild(d); return d; });
  const list = document.querySelector('.tour-list');
  list.innerHTML = STOPS.map(s => `<li><p class="y mono">${s.year}</p><h3>${s.h}</h3><p>${s.t}</p></li>`).join('');

  const go = (i) => {
    const sec = root.getBoundingClientRect().top + scrollY, span = root.offsetHeight - innerHeight;
    window.scrollTo({ top: sec + (stopStart[i] + 0.004) * span, behavior: reduce ? 'auto' : 'smooth' });
  };
  [...pins, ...dots].forEach(b => b.addEventListener('click', () => go(+b.dataset.stop)));

  // Day and night (eased on the canvas)
  const toggle = document.getElementById('wTime');
  let nightK = 0, nightTo = 0;
  const setTime = (t) => { root.dataset.time = t; nightTo = t === 'night' ? 1 : 0; toggle.setAttribute('aria-pressed', t === 'night'); toggle.querySelector('span').textContent = t === 'night' ? 'Day' : 'Night'; toggle.querySelector('i').className = 'ph ' + (t === 'night' ? 'ph-sun' : 'ph-moon'); try { localStorage.setItem('sk-time', t); } catch (e) {} queue(); };
  let saved = 'day'; try { saved = localStorage.getItem('sk-time') || 'day'; } catch (e) {}
  nightK = saved === 'night' ? 1 : 0;
  setTime(saved);
  toggle.addEventListener('click', () => setTime(root.dataset.time === 'night' ? 'day' : 'night'));

  // Sizing: the canvas always matches the stage, and the virtual artwork box covers it with a small bleed
  let vw = 0, vh = 0, Wi = 0, Hi = 0, dpr = 1;
  function measure() {
    vw = stage.clientWidth; vh = stage.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    const k = Math.max(vw / IW, vh / IH) * 1.03; Wi = IW * k; Hi = IH * k;
  }
  const target = (c) => {
    const wide = vw >= 900;
    if (c === 'card') return wide ? [vw * 0.63, vh * 0.42] : [vw * 0.5, vh * 0.3];
    return [vw * 0.5, vh * 0.5];
  };
  const mix = (a, b, e) => {
    const ta = target(a.c), tb = target(b.c);
    const dip = 1 - 0.16 * Math.sin(Math.PI * e);
    const zs = vw < 700 ? 0.78 : 1;
    const px = Wi / IW;
    const fz = (st) => (st.z > 1 ? Math.max(1, Math.min(st.z * zs, Math.max(1.25, (st.cap || 1.9) / px))) : 1);
    const za = fz(a), zb = fz(b);
    return { fx: lerp(a.fx, b.fx, e), fy: lerp(a.fy, b.fy, e), z: Math.exp(lerp(Math.log(za), Math.log(zb), e)) * dip, tx: lerp(ta[0], tb[0], e), ty: lerp(ta[1], tb[1], e) };
  };
  const still = (a) => mix(a, a, 0);

  let current = -2, curStop = -1;

  // Draw the visible crop of the artwork. The source rectangle comes from the camera and is clamped inside the image.
  function draw(st, realOp, shadeOp) {
    if (!art) { ctx.fillStyle = '#1b1230'; ctx.fillRect(0, 0, canvas.width, canvas.height); return null; }
    let tx = st.tx - st.z * st.fx * Wi, ty = st.ty - st.z * st.fy * Hi;
    tx = Math.min(0, Math.max(vw - st.z * Wi, tx)); ty = Math.min(0, Math.max(vh - st.z * Hi, ty));
    const iw = art.naturalWidth, ih = art.naturalHeight;
    const sx = (-tx / (st.z * Wi)) * iw, sy = (-ty / (st.z * Hi)) * ih, sw = (vw / (st.z * Wi)) * iw, sh = (vh / (st.z * Hi)) * ih;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(art, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    if (clean && realOp > 0.001) { ctx.globalAlpha = realOp; ctx.drawImage(clean, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (nightK > 0.001) { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = nightK; ctx.fillStyle = 'rgb(112,104,170)'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    if (shadeOp > 0.001) { ctx.globalAlpha = shadeOp; ctx.fillStyle = '#131209'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.globalAlpha = 1; }
    if (real && realOp > 0.001) {
      const px = Wi / IW, py = Hi / IH;
      const dx = (tx + st.z * REAL.x * px) * dpr, dy = (ty + st.z * REAL.y * py) * dpr, dw = st.z * REAL.w * px * dpr, dh = st.z * REAL.h * py * dpr;
      ctx.globalAlpha = realOp; ctx.drawImage(realNight && nightK > 0.5 ? realNight : real, dx, dy, dw, dh); ctx.globalAlpha = 1;
    }
    // Pins ride along with the artwork
    pins.forEach((pn, k) => {
      const x = tx + st.z * STOPS[k].fx * Wi, y = ty + st.z * STOPS[k].fy * Hi;
      const off = x < -40 || x > vw + 40 || y < -40 || y > vh + 40;
      pn.style.visibility = off ? 'hidden' : 'visible';
      if (!off) pn.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    });
    return { tx, ty };
  }

  function render() {
    queued = false;
    if (stage.clientWidth !== vw || stage.clientHeight !== vh) measure();
    if (Math.abs(nightK - nightTo) > 0.002) { nightK += (nightTo - nightK) * 0.14; queue(); } else nightK = nightTo;
    const span = root.offsetHeight - innerHeight;
    const rect = root.getBoundingClientRect();
    const inWorld = rect.bottom > 0 && rect.top < innerHeight;

    if (inWorld) {
      const p = clamp(-rect.top / span);
      let i = SEGS.findIndex(s => p < s.b); if (i < 0) i = SEGS.length - 1;
      const s = SEGS[i], r = clamp((p - s.a) / (s.b - s.a));
      const st = s.k === 'fly' ? mix(s.from, s.to, ease(r)) : still(s.cam);
      root.dataset.view = st.z < 1.15 ? 'vista' : 'tour';

      // Title block
      const tOut = i === 0 ? seg(r, 0.55, 1) : 1;
      title.style.opacity = 1 - tOut; title.style.transform = `translateY(${-tOut * 40}px)`;
      cue.style.opacity = 1 - tOut;

      // Real photo sits exactly on the illustrated figure and swaps in over a clean copy of the artwork
      const rv = s.k === 'reveal' ? r : 0;
      const rin = easeOut(seg(rv, 0, 0.45)), rout = seg(rv, 0.84, 1);
      let realOp = 0;
      if (s.k === 'reveal') realOp = rin;
      else if (s.k === 'fly' && s.tag === 'settle') realOp = 1;
      else if (s.k === 'hold' && s.card === 0) realOp = 1;
      else if (s.k === 'fly' && s.tag === 'leave0') realOp = 1 - seg(r, 0, 0.55);
      const shadeOp = s.k === 'reveal' ? 0.5 * seg(rv, 0, 0.18) * (1 - rout) : 0;
      const pos = draw(st, realOp, shadeOp);
      if (pins[0]) pins[0].style.opacity = (1 - realOp).toFixed(3);

      const nIn = easeOut(seg(rv, 0.28, 0.58));
      nameEl.style.opacity = s.k === 'reveal' ? (nIn * (1 - rout)).toFixed(3) : 0;
      const side = Math.min(160, vw * 0.1);
      nl.style.transform = `translateX(${-(1 - nIn) * side}px)`; nr.style.transform = `translateX(${(1 - nIn) * side}px)`;

      // Chapter card
      let cardIdx = null, a = 0;
      if (s.k === 'hold' && s.card !== undefined) { cardIdx = s.card; a = seg(r, 0, 0.2) * (s.card === 'final' ? 1 : 1 - seg(r, 0.84, 1)); }
      if (cardIdx !== current) { current = cardIdx; fillCard(cardIdx); }
      card.style.opacity = a.toFixed(3); card.style.transform = `translateY(${((1 - a) * 28).toFixed(1)}px)`; card.style.pointerEvents = a > 0.5 ? 'auto' : 'none';

      // Controls state
      let at = -1; for (let k = 0; k < SEGS.length; k++) { const q = SEGS[k]; if (q.k === 'hold' && typeof q.card === 'number' && p >= q.a - 0.012) at = q.card; }
      if (s.k === 'reveal' || (s.k === 'fly' && i <= 3)) at = s.k === 'reveal' ? 0 : -1;
      if (at !== curStop) { curStop = at; dots.forEach((d, k) => { d.classList.toggle('on', k === at); d.classList.toggle('done', k < at); }); pins.forEach((pn, k) => pn.classList.toggle('on', k === at)); mdots.forEach((m, k) => m.classList.toggle('on', k === at)); }
      const showUi = p > 0.12 && p < 0.985;
      dotsEl.classList.toggle('on', showUi); mapEl.classList.toggle('on', showUi);
      if (pos) {
        mapView.style.left = (-pos.tx / (st.z * Wi) * 100).toFixed(2) + '%'; mapView.style.top = (-pos.ty / (st.z * Hi) * 100).toFixed(2) + '%';
        mapView.style.width = (vw / (st.z * Wi) * 100).toFixed(2) + '%'; mapView.style.height = (vh / (st.z * Hi) * 100).toFixed(2) + '%';
      }
    }

    // Nav takes the theme of the section beneath it
    let theme = 'dark';
    for (const el of themed) { const r2 = el.getBoundingClientRect(); if (r2.top <= 40 && r2.bottom > 40) { theme = el.dataset.nav; break; } }
    nav.classList.toggle('on-light', theme === 'light');

    parallax.forEach(el => {
      const r3 = el.getBoundingClientRect();
      if (r3.bottom < -100 || r3.top > innerHeight + 100) return;
      el.style.translate = `0 ${((r3.top + r3.height / 2 - innerHeight / 2) * parseFloat(el.dataset.speed)).toFixed(1)}px`;
    });
  }

  function fillCard(idx) {
    if (idx === null) return;
    card.classList.toggle('final', idx === 'final');
    if (idx === 'final') {
      card.innerHTML = `<div class="row"><span>Next stop</span><span>You</span></div><h2>Let's build what comes next.</h2><p class="t">A school, a project or an idea. Start a conversation with Sarath.</p><div class="acts"><a class="btn btn-gold" href="https://www.linkedin.com/in/ar-sarath-kakumanu-51269a45/" target="_blank" rel="noopener"><i class="ph ph-linkedin-logo"></i>Connect with Sarath</a><a class="btn btn-line" href="#education">See the NCERT work</a></div>`;
      return;
    }
    const s = STOPS[idx];
    card.innerHTML = `<div class="row"><span>${s.year}</span><span class="mono">${String(idx + 1).padStart(2, '0')} / ${String(STOPS.length).padStart(2, '0')}</span></div><h2>${s.h}</h2><p class="t">${s.t}</p><span class="stat mono">${s.stat}</span>`;
  }

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { measure(); queue(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { measure(); queue(); }).observe(stage);
  measure();
  render();
})();

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Menu
  const burger = $('.burger'), menu = $('#menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', !open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  // Scroll reveal + portrait mask
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(el => io.observe(el));

  // Tagline: words light up one at a time as they cross the trigger line
  const tag = $('#tagline');
  if (tag) {
    const hl = (tag.dataset.hl || '').split(',');
    tag.innerHTML = tag.textContent.trim().split(/\s+/).map(w =>
      `<span class="w${hl.includes(w.replace(/\W/g, '')) ? ' hl' : ''}">${w}</span>`).join(' ');
    const wio = new IntersectionObserver((es) => es.forEach(e => {
      e.target.classList.toggle('on', e.boundingClientRect.top < innerHeight * 0.65 || e.isIntersecting && e.intersectionRatio > 0 && e.boundingClientRect.top < innerHeight * 0.65);
    }), { rootMargin: '0px 0px -35% 0px', threshold: [0, 1] });
    $$('.w', tag).forEach(w => wio.observe(w));
  }

  // Stat counters
  const cio = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const end = +e.target.dataset.count, t0 = performance.now(), dur = 1600;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1), k = 1 - Math.pow(1 - p, 4);
      e.target.textContent = Math.round(end * k);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  $$('[data-count]').forEach(el => cio.observe(el));

  // Current section in nav
  const links = $$('.nav-links a');
  const sio = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) links.forEach(a => a.setAttribute('aria-current', a.getAttribute('href') === '#' + e.target.id));
  }), { rootMargin: '-45% 0px -50% 0px' });
  $$('#story, #territory, #work, #faq').forEach(s => sio.observe(s));

  // Respect saved-data / reduced motion for the video
  const v = $('.stage video');
  if (v && matchMedia('(prefers-reduced-motion: reduce)').matches) v.removeAttribute('autoplay'), v.pause();
})();

// Pinned stage: hero text exits, portrait rises over the same video, intro text arrives
(() => {
  const stage = document.querySelector('.stage');
  if (!stage) return;
  const heroText = document.getElementById('heroText'), portrait = document.getElementById('portrait'),
        arch = document.getElementById('arch'), intro = document.getElementById('intro'),
        cue = document.getElementById('cue'), shade = stage.querySelector('.hero-shade');
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 4);
  let queued = false;
  const render = () => {
    queued = false;
    const span = stage.offsetHeight - innerHeight;
    const p = clamp(-stage.getBoundingClientRect().top / span);
    const out = clamp(p / 0.3);
    heroText.style.opacity = 1 - out;
    heroText.style.transform = `translateY(${-out * 80}px)`;
    heroText.style.filter = `blur(${out * 12}px)`;
    heroText.style.visibility = out >= 1 ? 'hidden' : 'visible';
    cue.style.opacity = 1 - out;
    const a = easeOut(clamp((p - 0.12) / 0.4));
    const b = easeOut(clamp((p - 0.22) / 0.4));
    arch.style.transform = `translate(-50%, ${(1 - a) * 110}%)`;
    portrait.style.transform = `translate(-50%, ${(1 - b) * 110}%)`;
    const t = clamp((p - 0.55) / 0.25);
    intro.style.opacity = t;
    intro.style.transform = `translateY(${(1 - t) * 48}px)`;
    shade.style.background = `rgba(6,10,31,${0.5 + 0.22 * clamp(p / 0.5)})`;
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  render();
})();

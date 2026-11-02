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

  // Scroll reveal
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
      e.target.classList.toggle('on', e.boundingClientRect.top < innerHeight * 0.65);
    }), { rootMargin: '0px 0px -35% 0px', threshold: [0, 1] });
    $$('.w', tag).forEach(w => wio.observe(w));
  }

  // Counters
  const cio = new IntersectionObserver((es) => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const end = +e.target.dataset.count, suffix = e.target.dataset.suffix || '', t0 = performance.now(), dur = 1600;
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1), k = 1 - Math.pow(1 - p, 4);
      e.target.textContent = Math.round(end * k) + suffix;
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
  $$('#about, #journey, #education, #press, #work, #territory, #faq, #connect').forEach(s => sio.observe(s));

  // YouTube click to load: no third party request until the visitor presses play
  $$('.yt-btn').forEach(btn => btn.addEventListener('click', () => {
    const f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + btn.dataset.yt + '?autoplay=1&rel=0';
    f.title = btn.getAttribute('aria-label').replace('Play video: ', '');
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    f.allowFullscreen = true;
    btn.replaceWith(f);
  }));

  const v = $('.hero-video');
  if (v && matchMedia('(prefers-reduced-motion: reduce)').matches) v.removeAttribute('autoplay'), v.pause();
})();

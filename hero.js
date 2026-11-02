// Hero choreography, nav theme and photo parallax. One passive scroll listener throttled with rAF.
(() => {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => 1 - Math.pow(1 - t, 4);
  const hero = document.getElementById('top');
  const intro = document.getElementById('heroIntro'), portrait = document.getElementById('heroPortrait'),
        role = document.getElementById('heroRole'), cue = document.getElementById('heroCue'),
        shade = document.getElementById('heroShade'), video = hero.querySelector('.hero-video'),
        nl = hero.querySelector('.nm-l'), nr = hero.querySelector('.nm-r');
  const nav = document.querySelector('.nav');
  const themed = [...document.querySelectorAll('[data-nav]')];
  const parallax = [...document.querySelectorAll('[data-speed]')];
  let queued = false;

  function render() {
    queued = false;

    // Hero scroll story
    const span = hero.offsetHeight - innerHeight;
    const p = clamp(-hero.getBoundingClientRect().top / span);
    const out = seg(p, 0.04, 0.24);
    intro.style.opacity = 1 - out;
    intro.style.transform = `translateY(${-out * 70}px)`;
    intro.style.filter = out > 0 ? `blur(${out * 12}px)` : 'none';
    intro.style.visibility = out >= 1 ? 'hidden' : 'visible';
    cue.style.opacity = 1 - out;
    portrait.style.transform = `translate(-50%, ${(1 - ease(seg(p, 0.14, 0.5))) * 105}%)`;
    const n = ease(seg(p, 0.3, 0.64));
    const side = Math.min(160, innerWidth * 0.1);
    nl.style.opacity = n; nl.style.transform = `translateX(${-(1 - n) * side}px)`;
    nr.style.opacity = n; nr.style.transform = `translateX(${(1 - n) * side}px)`;
    role.style.opacity = seg(p, 0.62, 0.8);
    shade.style.background = `rgba(19,18,9,${(0.5 + 0.16 * seg(p, 0, 0.6)).toFixed(3)})`;
    video.style.transform = `scale(${(1.02 + 0.08 * p).toFixed(4)})`;

    // Nav takes the theme of whatever section sits under it
    let theme = 'dark';
    for (const s of themed) {
      const r = s.getBoundingClientRect();
      if (r.top <= 40 && r.bottom > 40) { theme = s.dataset.nav; break; }
    }
    nav.classList.toggle('on-light', theme === 'light');

    // Photo parallax
    parallax.forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -100 || r.top > innerHeight + 100) return;
      const c = (r.top + r.height / 2 - innerHeight / 2) * parseFloat(el.dataset.speed);
      el.style.setProperty('--py', c.toFixed(1) + 'px');
      el.style.translate = `0 ${c.toFixed(1)}px`;
    });
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(render); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  render();
})();

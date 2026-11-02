// Scroll choreography: scrubbed full bleed video scene, beat cards, timeline line, page progress bar.
// One rAF-throttled passive scroll listener drives everything (no layout reads beyond one rect per frame).
(() => {
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const bar = document.createElement('div');
  bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  const scene = document.getElementById('story');
  const video = document.getElementById('sceneVideo');
  const beats = scene ? [...scene.querySelectorAll('.beat')] : [];
  const fill = document.getElementById('sceneFill');
  const num = document.getElementById('sceneNum');
  const timeline = document.getElementById('timeline');
  const ranges = [[0.03, 0.31], [0.36, 0.64], [0.69, 0.97]];
  const RAMP = 0.06;

  if (scene && reduce) {
    scene.classList.add('is-static');
    if (video) { video.muted = true; video.loop = true; video.autoplay = true; video.play().catch(() => {}); }
  }
  const live = scene && !reduce;
  if (video) { video.pause(); video.addEventListener('loadedmetadata', () => queue()); }

  let target = 0, cur = 0, queued = false, raf = 0;

  function renderOnce() {
    queued = false;
    const doc = document.documentElement;
    bar.style.transform = `scaleX(${clamp(scrollY / (doc.scrollHeight - innerHeight))})`;

    if (timeline) {
      const r = timeline.getBoundingClientRect();
      timeline.style.setProperty('--tl', clamp((innerHeight * 0.6 - r.top) / r.height).toFixed(4));
    }

    if (live) {
      const r = scene.getBoundingClientRect();
      const p = clamp(-r.top / (scene.offsetHeight - innerHeight));
      target = p;
      fill.style.transform = `scaleY(${p})`;
      video.style.transform = `scale(${1.12 - 0.12 * p})`;
      let active = 0;
      beats.forEach((b, i) => {
        const [a, z] = ranges[i];
        const k = clamp((p - a) / RAMP), o = clamp((z - p) / RAMP);
        const op = Math.min(k, o);
        const y = (1 - k) * 48 - (1 - o) * 48;
        const mid = innerWidth >= 900 ? 'translateY(-50%) ' : '';
        b.style.opacity = op.toFixed(3);
        b.style.transform = `${mid}translateY(${y.toFixed(1)}px)`;
        b.style.filter = op < 1 ? `blur(${((1 - op) * 10).toFixed(1)}px)` : 'none';
        b.style.pointerEvents = op > 0.5 ? 'auto' : 'none';
        if (p >= a - 0.02) active = i;
      });
      num.textContent = String(active + 1).padStart(2, '0');
      if (!raf) raf = requestAnimationFrame(scrub);
    }
  }

  // Ease the video playhead toward the scroll position so scrubbing feels fluid
  function scrub() {
    raf = 0;
    if (!video.duration) return;
    const goal = target * (video.duration - 0.05);
    cur += (goal - cur) * 0.2;
    if (Math.abs(video.currentTime - cur) > 0.02) video.currentTime = cur;
    if (Math.abs(goal - cur) > 0.01) raf = requestAnimationFrame(scrub);
  }

  function queue() { if (!queued) { queued = true; requestAnimationFrame(renderOnce); } }
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  renderOnce();
})();

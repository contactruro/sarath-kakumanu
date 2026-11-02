// Scrapbook desktop behaviour: project switching, a dock that magnifies, and photos you can drag around.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Projects
  const PROJECTS = [
    { win: 'pioneer-group.app', title: 'Pioneer Group', role: 'Founder and Managing Director', stack: 'Design, construction, delivery', year: '1983 to today', desc: 'Almost 3 million square feet of premium, luxury commercial and residential projects across Tamil Nadu and Andhra Pradesh. Watch a tower go from survey to skyline.' },
    { win: 'kwall.dwg', title: 'KWALL', role: 'Inventor', stack: 'Hollow core panels, acoustic panel machinery', year: '2014', desc: 'Lightweight hollow core wall panels, and the machinery he designed to make different types of acoustic wall panels.' },
    { win: 'ncert-katbook.pdf', title: 'KATBOOK × NCERT', role: 'Founder, UEducate Global', stack: 'Digital textbooks, AI, virtual labs', year: '2025', desc: 'NCERT signed an MoU to convert its textbooks into KATBOOKs, with pilots in select states and a national rollout planned over 18 months. Concept videos, 3D models, virtual labs, a translator and offline access.' },
    { win: 'kampus.app', title: 'KAMPUS and KSMACC', role: 'Founder, UEducate Global', stack: 'Institution management, encrypted messaging', year: '2020 to today', desc: 'KAMPUS runs a school or college: timetables, staff and student data, multiple curricula. KSMACC is a closed, encrypted communication platform for institutions, with patented Katchup messaging and Kall calling.' },
    { win: 'ustudy.app', title: 'USTUDY', role: 'Founder, UEducate Global', stack: 'E-learning, work study model', year: '2020 to today', desc: 'An e-learning platform with a work study model. Its KAcademy supports board exams and entrance exams such as NEET and JEE.' },
  ];
  const dock = document.getElementById('dock');
  if (dock) {
    const btns = [...dock.querySelectorAll('button')], panes = [...document.querySelectorAll('.pane')];
    const $ = (id) => document.getElementById(id);
    let cur = 0;
    const show = (i) => {
      if (i === cur) return; cur = i; const p = PROJECTS[i];
      btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i));
      panes.forEach((el, k) => el.classList.toggle('on', k === i));
      $('winTitle').textContent = p.win; $('pTitle').textContent = p.title; $('pRole').textContent = p.role; $('pStack').textContent = p.stack; $('pYear').textContent = p.year;
      const d = $('pDesc'); d.style.opacity = 0; setTimeout(() => { d.textContent = p.desc; d.style.opacity = 1; }, 160);
    };
    btns.forEach((b, i) => b.addEventListener('click', () => show(i)));

    // Dock magnification, like the real thing
    if (!reduce && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      dock.addEventListener('pointermove', (e) => {
        btns.forEach((b) => {
          const r = b.getBoundingClientRect(), d = Math.abs(e.clientX - (r.left + r.width / 2));
          const s = 1 + 0.6 * Math.exp(-(d * d) / (2 * 62 * 62));
          b.style.transform = `scale(${s.toFixed(3)}) translateY(${((1 - s) * 6).toFixed(1)}px)`;
        });
      });
      dock.addEventListener('pointerleave', () => btns.forEach((b) => { b.style.transform = ''; }));
    }
  }

  // Draggable photos and files (mouse and pen; touch keeps scrolling)
  let z = 50;
  document.querySelectorAll('.drag').forEach((el) => {
    let sx = 0, sy = 0, ox = 0, oy = 0, on = false;
    el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') return;
      on = true; el.setPointerCapture(e.pointerId);
      const cs = getComputedStyle(el);
      ox = parseFloat(cs.getPropertyValue('--mx')) || 0; oy = parseFloat(cs.getPropertyValue('--my')) || 0;
      sx = e.clientX; sy = e.clientY; el.classList.add('dragging'); el.style.zIndex = ++z;
    });
    el.addEventListener('pointermove', (e) => {
      if (!on) return;
      const x = ox + e.clientX - sx, y = oy + e.clientY - sy;
      el.style.setProperty('--mx', x + 'px'); el.style.setProperty('--my', y + 'px');
      el.style.translate = `${x}px ${y}px`;
    });
    const end = () => { on = false; el.classList.remove('dragging'); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  });
})();

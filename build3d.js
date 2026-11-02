// Scroll driven 3D construction sequence: site, excavation, basement and foundation, structure, facade, finishing, district.
(() => {
  const canvas = document.getElementById('build3d');
  if (!canvas || !window.THREE) return;
  const T = THREE;
  const wrap = document.getElementById('build');
  const stage = wrap.querySelector('.build-sticky');
  const $ = (id) => document.getElementById(id);
  const el = { num: $('bNum'), title: $('bTitle'), text: $('bText'), pct: $('bPct'), floor: $('bFloor'), dots: [...wrap.querySelectorAll('.build-phases li')], card: wrap.querySelector('.build-card') };
  const clamp = (v) => Math.min(1, Math.max(0, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const ease = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  const PHASES = [
    { at: 0.00, title: 'Survey the land', text: 'Every project starts on the ground: boundaries, levels and soil, walked and verified before a single rupee is committed.' },
    { at: 0.10, title: 'Excavate to the design', text: 'The earth is cut to the exact depth the structure demands, with the basement planned before the first wall.' },
    { at: 0.22, title: 'Lay the foundation and basement', text: 'Piles, raft and basement walls. The part nobody sees and everything else depends on.' },
    { at: 0.36, title: 'Raise the structure', text: 'Columns and slabs climb floor by floor while the crane lifts every load into place.' },
    { at: 0.68, title: 'Wrap it in glass', text: 'The facade closes the frame, turning a skeleton into a building with a face.' },
    { at: 0.82, title: 'Finish and hand over', text: 'Roof, crown, landscaping and the final inspection. Delivered the way it was drawn.' },
    { at: 0.92, title: 'Grow a district', text: 'One building becomes a neighbourhood. Almost 3 million square feet built across Tamil Nadu and Andhra Pradesh.' },
  ];
  const FLOORS = 16, FH = 0.5, BASE = 0.14;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 120);

  scene.add(new T.HemisphereLight(0xffffff, 0xd2cfc2, 0.95));
  const sun = new T.DirectionalLight(0xfff6e0, 1.15);
  sun.position.set(9, 16, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 50 });
  scene.add(sun);

  const M = (color, o = {}) => new T.MeshStandardMaterial(Object.assign({ color, roughness: 0.8 }, o));
  const mats = {
    ground: M(0xf6f5f0, { roughness: 0.95 }), soil: M(0x8b6b46, { roughness: 1 }), concrete: M(0xc8c5ba), slab: M(0xffffff, { roughness: 0.5 }),
    gold: M(0xc9951a, { metalness: 0.7, roughness: 0.25 }), crane: M(0xd9a82e, { roughness: 0.45, metalness: 0.3 }), glass: M(0x5f7186, { roughness: 0.1, metalness: 0.6, transparent: true, opacity: 0.88 }),
    trunk: M(0x7a5a24), leaf: M(0x6a9a44, { roughness: 0.9 }), dark: M(0x3a3a36),
  };
  const box = (w, h, d, m, shadow = true) => { const x = new T.Mesh(new T.BoxGeometry(w, h, d), m); x.castShadow = shadow; x.receiveShadow = true; return x; };
  // A box that grows upward from its base: returns a group positioned at the base
  const grower = (w, h, d, m, x, y, z) => { const g = new T.Group(); g.position.set(x, y, z); const b = box(w, h, d, m); b.position.y = h / 2; g.add(b); g.scale.y = 0.0001; g.visible = false; scene.add(g); return g; };
  const setGrow = (g, k) => { g.visible = k > 0.001; g.scale.y = Math.max(k, 0.0001); };

  // Ground with a square hole for the excavation
  const shape = new T.Shape(); shape.absarc(0, 0, 9, 0, Math.PI * 2, false);
  const hole = new T.Path(); hole.moveTo(-3, -3); hole.lineTo(-3, 3); hole.lineTo(3, 3); hole.lineTo(3, -3); hole.closePath(); shape.holes.push(hole);
  const gGeo = new T.ExtrudeGeometry(shape, { depth: 2.2, bevelEnabled: false, curveSegments: 72 });
  gGeo.rotateX(-Math.PI / 2); gGeo.translate(0, -2.2, 0);
  const ground = new T.Mesh(gGeo, mats.ground); ground.receiveShadow = true; ground.castShadow = false; scene.add(ground);
  const cover = new T.Mesh(new T.BoxGeometry(6, 2.2, 6), new T.MeshStandardMaterial({ color: 0xf6f5f0, roughness: 1 })); cover.receiveShadow = true; scene.add(cover);
  const ring = new T.Mesh(new T.TorusGeometry(9, 0.05, 8, 96), mats.gold); ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  // Ground grid that skips the excavation square so the pit reads as a real hole
const gp = [];
for (let k = -9; k <= 9; k++) {
    const lim = Math.sqrt(Math.max(0, 81 - k * k));
    const spans = Math.abs(k) < 3 ? [[-lim, -3], [3, lim]] : [[-lim, lim]];
    spans.forEach(([a, b]) => { gp.push(k, 0.006, a, k, 0.006, b); gp.push(a, 0.006, k, b, 0.006, k); });
  }
  const gg = new T.BufferGeometry(); gg.setAttribute('position', new T.Float32BufferAttribute(gp, 3));
  const grid = new T.LineSegments(gg, new T.LineBasicMaterial({ color: 0xd9d6ca, transparent: true, opacity: 0.8 })); scene.add(grid);
  // Pit side walls in raw earth
  [[0, -2.99, 6, 0.02], [0, 2.99, 6, 0.02], [-2.99, 0, 0.02, 6], [2.99, 0, 0.02, 6]].forEach(([x, z, w, d]) => { const m = box(w, 2.0, d, new T.MeshStandardMaterial({ color: 0xb39b78, roughness: 1 }), false); m.position.set(x, -1.0, z); scene.add(m); });

  // Site boundary
  const site = new T.Group(); scene.add(site);
  const c4 = [[-3.5, -3.5], [3.5, -3.5], [3.5, 3.5], [-3.5, 3.5]];
  site.add(new T.Line(new T.BufferGeometry().setFromPoints(c4.concat([c4[0]]).map(([x, z]) => new T.Vector3(x, 0.03, z))), new T.LineBasicMaterial({ color: 0xa86f00 })));
  c4.forEach(([x, z]) => {
    const post = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1, 12), mats.gold); post.position.set(x, 0.55, z); post.castShadow = true; site.add(post);
    const flag = box(0.4, 0.22, 0.02, mats.gold, false); flag.position.set(x + 0.2, 0.95, z); site.add(flag);
  });

  // Foundation: piles, raft, perimeter walls, columns, basement slab
  const piles = [];
  [-2.1, -0.7, 0.7, 2.1].forEach(x => [-2.1, -0.7, 0.7, 2.1].forEach(z => {
    const g = new T.Group(); g.position.set(x, -2.0, z); const c = new T.Mesh(new T.CylinderGeometry(0.17, 0.17, 0.6, 14), mats.concrete); c.position.y = 0.3; c.castShadow = true; g.add(c);
    g.scale.y = 0.0001; g.visible = false; scene.add(g); piles.push(g);
  }));
  const raft = grower(5.8, 0.3, 5.8, mats.concrete, 0, -2.0, 0);
  const walls = [[0, -2.9, 5.8, 0.18], [0, 2.9, 5.8, 0.18], [-2.9, 0, 0.18, 5.8], [2.9, 0, 0.18, 5.8]].map(([x, z, w, d]) => grower(w, 2.0, d, mats.concrete, x, -2.0, z));
  const bcols = []; [-1.6, 0, 1.6].forEach(x => [-1.6, 0, 1.6].forEach(z => bcols.push(grower(0.24, 2.0, 0.24, mats.concrete, x, -2.0, z))));
  const bslab = grower(5.8, 0.12, 5.8, mats.slab, 0, -1.06, 0);
  const podium = grower(6, 0.14, 6, mats.slab, 0, 0, 0);

  // Tower: structure and glass per floor
  const W = 2.6, structure = [], glass = [];
  for (let i = 0; i < FLOORS; i++) {
    const g = new T.Group(); g.position.y = BASE + i * FH;
    const s = box(W, 0.1, W, mats.slab); s.position.y = 0.05; g.add(s);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { const c = box(0.14, FH - 0.1, 0.14, mats.concrete); c.position.set(a * (W / 2 - 0.1), 0.1 + (FH - 0.1) / 2, b * (W / 2 - 0.1)); g.add(c); });
    g.scale.y = 0.0001; g.visible = false; scene.add(g); structure.push(g);
    const gl = new T.Group(); gl.position.y = BASE + i * FH + 0.1;
    const pane = box(W - 0.1, FH - 0.12, W - 0.1, mats.glass, false); pane.position.y = (FH - 0.12) / 2; gl.add(pane);
    gl.scale.y = 0.0001; gl.visible = false; scene.add(gl); glass.push(gl);
  }
  const fins = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => grower(0.1, FLOORS * FH, 0.1, mats.gold, a * (W / 2 + 0.02), BASE, b * (W / 2 + 0.02)));
  const top = BASE + FLOORS * FH;
  const roof = grower(W * 0.8, 0.16, W * 0.8, mats.gold, 0, top, 0);
  const crown = grower(W * 0.4, 0.5, W * 0.4, mats.slab, 0, top + 0.16, 0);
  const mast = grower(0.05, 1.3, 0.05, mats.gold, 0, top + 0.66, 0);

  // Tower crane
  const crane = new T.Group(); crane.position.set(2.5, 0, 2.5); scene.add(crane);
  const cMast = box(0.2, 1, 0.2, mats.crane); cMast.position.y = 0.5; crane.add(cMast);
  const cTop = new T.Group(); crane.add(cTop);
  const jib = box(5, 0.14, 0.18, mats.crane); jib.position.x = 1.5; cTop.add(jib);
  const cw = box(0.5, 0.4, 0.4, mats.dark); cw.position.x = -0.8; cTop.add(cw);
  const cab = box(0.3, 0.3, 0.3, mats.dark); cab.position.set(0.2, 0.22, 0); cTop.add(cab);
  const line = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 1, 6), mats.dark); cTop.add(line);
  const hook = box(0.22, 0.16, 0.22, mats.crane); cTop.add(hook);
  const load = box(0.45, 0.3, 0.45, mats.concrete); cTop.add(load);

  // Neighbouring buildings
  const nbrs = [[-4.8, -1.4, 1.5, 1.5, 9], [4.9, -2.6, 1.6, 1.4, 7], [-3.8, 4.4, 1.4, 1.8, 6], [4.2, 4.2, 1.7, 1.5, 11], [-0.4, -5.8, 1.8, 1.4, 5], [0.8, 6.1, 1.2, 1.2, 8]].map(([x, z, w, d, n], idx) => {
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    const fl = []; for (let i = 0; i < n; i++) { const f = new T.Group(); const a = box(w, 0.16, d, mats.slab); a.position.y = 0.08; const b = box(w * 0.95, 0.26, d * 0.95, mats.glass, false); b.position.y = 0.29; f.add(a, b); f.position.y = i * 0.42; f.scale.y = 0.0001; f.visible = false; g.add(f); fl.push(f); }
    return { fl, n, idx };
  });
  const trees = new T.Group(); scene.add(trees);
  [[-2.4, 5.2], [2.2, 5.6], [-6.2, 1.6], [6.4, 0.4], [3.2, -5.4], [-2.6, -5], [6.6, -4.8], [-6, 4.6], [-5.6, -4.2], [0, -7]].forEach(([x, z]) => {
    const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(0.0001);
    const s = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 0.4, 8), mats.trunk); s.position.y = 0.2; t.add(s);
    const c = new T.Mesh(new T.SphereGeometry(0.34, 14, 12), mats.leaf); c.position.y = 0.62; c.castShadow = true; t.add(c); trees.add(t);
  });

  // Camera path [progress, radius, height, lookY]
  const KS = [[0, 16, 9, 0], [0.10, 14.5, 11, -0.4], [0.22, 12.5, 12.5, -1.2], [0.36, 12, 10, -0.6], [0.52, 15.5, 10.5, 3.2], [0.68, 17, 10.5, 4.4], [0.82, 17, 10, 4.6], [0.92, 18.5, 10.5, 4], [1, 26, 14.5, 2.2]];
  function cam(p) {
    for (let i = 0; i < KS.length - 1; i++) {
      const a = KS[i], b = KS[i + 1];
      if (p <= b[0]) { const t = ease(clamp((p - a[0]) / (b[0] - a[0]))); return [lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t)]; }
    }
    const l = KS[KS.length - 1]; return [l[1], l[2], l[3]];
  }

  let p = 0, pTarget = 0, offset = 0, dragging = false, lastX = 0, vel = 0, visible = false, lastPhase = -1, lastFloor = -1, lastPct = -1, t0 = performance.now();

  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < 560 ? 48 : 34;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; offset -= dx * 0.008; vel = -dx * 0.008; });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px' }).observe(stage);

  const LOOP = wrap.hasAttribute('data-loop');   // self playing mode for the project window
  function readScroll() {
    if (LOOP) return;
    const r = wrap.getBoundingClientRect();
    pTarget = clamp(-r.top / (wrap.offsetHeight - stage.offsetHeight));
  }
  addEventListener('scroll', readScroll, { passive: true }); readScroll();
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function update() {
    const exc = ease(seg(p, 0.10, 0.22));
    cover.position.y = -1.1001 - 2.0 * exc;
    cover.material.color.setHex(0xf6f5f0).lerp(new T.Color(0x6e5a40), exc);

    const f = seg(p, 0.22, 0.36);
    piles.forEach((g, i) => setGrow(g, ease(seg(f, i * 0.012, 0.3 + i * 0.012))));
    setGrow(raft, ease(seg(f, 0.28, 0.5)));
    walls.forEach((g, i) => setGrow(g, ease(seg(f, 0.45 + i * 0.03, 0.8))));
    bcols.forEach((g, i) => setGrow(g, ease(seg(f, 0.55 + i * 0.015, 0.88))));
    setGrow(bslab, ease(seg(f, 0.8, 1)));

    const sp = seg(p, 0.36, 0.68);
    setGrow(podium, ease(seg(sp, 0, 0.04)));
    structure.forEach((g, i) => setGrow(g, ease(clamp(sp * (FLOORS + 0.5) - i))));
    const built = Math.min(FLOORS, Math.max(0, Math.floor(sp * (FLOORS + 0.5))));

    const fa = seg(p, 0.68, 0.82);
    glass.forEach((g, i) => setGrow(g, ease(clamp(fa * (FLOORS + 1) - i))));
    const fn = seg(p, 0.82, 0.92);
    fins.forEach((g, i) => setGrow(g, ease(seg(fn, i * 0.05, 0.5 + i * 0.05))));
    setGrow(roof, ease(seg(fn, 0.45, 0.6))); setGrow(crown, ease(seg(fn, 0.55, 0.8))); setGrow(mast, ease(seg(fn, 0.75, 1)));
    nbrs.forEach(n => n.fl.forEach((g, i) => setGrow(g, ease(clamp(seg(p, 0.92 + n.idx * 0.006, 1) * (n.n + 1) - i)))));
    trees.children.forEach((t, i) => t.scale.setScalar(ease(seg(p, 0.86 + i * 0.008, 0.98))));
    site.visible = p < 0.92;

    // Crane follows the structure and retires during finishing
    const reach = built > 0 ? BASE + built * FH : 0;
    const craneH = Math.max(3.2, reach + 2.4);
    const craneOn = seg(p, 0.30, 0.34) * (1 - seg(p, 0.84, 0.9));
    crane.visible = craneOn > 0.01; crane.scale.setScalar(Math.max(craneOn, 0.0001));
    cMast.scale.y = craneH; cMast.position.y = craneH / 2; cTop.position.y = craneH;
    const t = (performance.now() - t0) / 1000;
    cTop.rotation.y = Math.sin(t * 0.35) * 1.0 + 0.8;
    const hx = 2.2, drop = 1.3 + Math.sin(t * 1.1) * 0.6;
    line.scale.y = drop; line.position.set(hx, -drop / 2, 0); hook.position.set(hx, -drop - 0.08, 0);
    load.position.set(hx, -drop - 0.28, 0); load.visible = sp > 0 && sp < 1;

    // HUD
    let idx = 0; PHASES.forEach((ph, i) => { if (p >= ph.at) idx = i; });
    if (idx !== lastPhase) {
      lastPhase = idx;
      el.num.textContent = String(idx + 1).padStart(2, '0') + ' / 07';
      el.title.textContent = PHASES[idx].title; el.text.textContent = PHASES[idx].text;
      el.dots.forEach((d, i) => { d.classList.toggle('on', i === idx); d.classList.toggle('done', i < idx); });
      el.card.classList.remove('swap'); void el.card.offsetWidth; el.card.classList.add('swap');
    }
    const pct = Math.round(p * 100); if (pct !== lastPct) { lastPct = pct; el.pct.textContent = pct; }
    if (built !== lastFloor) { lastFloor = built; el.floor.textContent = 'Floor ' + String(built).padStart(2, '0') + ' / ' + FLOORS; }
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (LOOP) { const c = ((performance.now() - t0) / 1000) % 22; pTarget = reduce ? 1 : clamp(c / 18); }
    p = reduce ? pTarget : lerp(p, pTarget, LOOP && pTarget < 0.01 ? 0.06 : 0.12);
    if (Math.abs(p - pTarget) < 0.0005) p = pTarget;
    if (!dragging) { offset += vel; vel *= 0.94; offset *= 0.995; }
    update();
    let [r, h, ly] = cam(p);
    const k = camera.aspect < 1.3 ? 1.4 : 1; r *= k; h *= 1 + (k - 1) * 0.6;
    const a = 0.65 + p * 2.4 + offset;
    camera.position.set(Math.sin(a) * r, h, Math.cos(a) * r);
    camera.lookAt(0, ly, 0);
    renderer.render(scene, camera);
  }
  frame();
})();

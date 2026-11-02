// 3D development scene: plot, then tower rising floor by floor, then a full cluster. Driven by the active stage card.
(() => {
  const canvas = document.getElementById('dev3d');
  if (!canvas || !window.THREE) return;
  const T = THREE;
  const label = document.getElementById('devLabel');
  const names = ['STAGE 01 · LAND', 'STAGE 02 · DEVELOPMENT', 'STAGE 03 · PARTNERSHIPS'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(34, 1, 0.1, 100);

  scene.add(new T.HemisphereLight(0xffffff, 0xd8d5ca, 0.95));
  const sun = new T.DirectionalLight(0xfff6e0, 1.1);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  scene.add(sun);

  // Ground disc with gold ring
  const ground = new T.Mesh(new T.CylinderGeometry(9, 9, 0.4, 72), new T.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.95 }));
  ground.position.y = -0.2; ground.receiveShadow = true; scene.add(ground);
  const gold = new T.MeshStandardMaterial({ color: 0xc9951a, metalness: 0.7, roughness: 0.25 });
  const ring = new T.Mesh(new T.TorusGeometry(9, 0.04, 8, 96), gold);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
  const grid = new T.GridHelper(18, 18, 0xcfcbbd, 0xe0ddd2);
  grid.position.y = 0.005; grid.material.transparent = true; grid.material.opacity = 0.7; scene.add(grid);

  // Plot boundary and corner posts (stage 1)
  const plot = new T.Group(); scene.add(plot);
  const corners = [[-3, -3], [3, -3], [3, 3], [-3, 3]];
  const pts = corners.concat([corners[0]]).map(([x, z]) => new T.Vector3(x, 0.03, z));
  plot.add(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: 0xa86f00 })));
  corners.forEach(([x, z]) => {
    const post = new T.Mesh(new T.CylinderGeometry(0.07, 0.07, 1.1, 12), gold);
    post.position.set(x, 0.55, z); post.castShadow = true; plot.add(post);
    const flag = new T.Mesh(new T.BoxGeometry(0.4, 0.22, 0.02), gold);
    flag.position.set(x + 0.2, 0.95, z); plot.add(flag);
  });
  const pad = new T.Mesh(new T.BoxGeometry(6, 0.06, 6), new T.MeshStandardMaterial({ color: 0xe6e3d8, roughness: 1 }));
  pad.position.y = 0.03; pad.receiveShadow = true; plot.add(pad);

  // Buildings built from stacked floors
  const slabMat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
  const glassMat = new T.MeshStandardMaterial({ color: 0x6c7480, roughness: 0.12, metalness: 0.6 });
  const FH = 0.42;
  function building(x, z, w, d, floors, stageAt) {
    const g = new T.Group(); g.position.set(x, 0, z); scene.add(g);
    const slabs = [];
    for (let i = 0; i < floors; i++) {
      const f = new T.Group();
      const slab = new T.Mesh(new T.BoxGeometry(w, FH * 0.38, d), slabMat);
      slab.position.y = FH * 0.19;
      const glass = new T.Mesh(new T.BoxGeometry(w * 0.96, FH * 0.62, d * 0.96), glassMat);
      glass.position.y = FH * 0.38 + FH * 0.31;
      [slab, glass].forEach(m => { m.castShadow = true; m.receiveShadow = true; f.add(m); });
      f.position.y = i * FH; f.scale.y = 0.0001; f.visible = false;
      g.add(f); slabs.push(f);
    }
    const roof = new T.Mesh(new T.BoxGeometry(w * 0.7, 0.12, d * 0.7), gold);
    roof.castShadow = true; g.add(roof);
    const mast = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.8, 8), gold); g.add(mast);
    return { slabs, floors, cur: 0, roof, mast, stageAt };
  }
  // stageAt: floors visible at stage 0, 1, 2
  const B = [
    building(0, 0, 2.2, 2.2, 16, [0, 16, 16]),
    building(-4.6, -1.2, 1.5, 1.5, 9, [0, 0, 9]),
    building(4.4, -2.4, 1.6, 1.4, 7, [0, 0, 7]),
    building(-3.6, 3.8, 1.4, 1.8, 6, [0, 0, 6]),
    building(3.8, 3.4, 1.7, 1.5, 11, [0, 0, 11]),
    building(-0.4, -5.2, 1.8, 1.4, 5, [0, 0, 5]),
    building(0.6, 5.6, 1.2, 1.2, 8, [0, 0, 8]),
  ];
  // Small trees
  const trunk = new T.MeshStandardMaterial({ color: 0x7a5a24 }), leaf = new T.MeshStandardMaterial({ color: 0x6a9a44, roughness: 0.9 });
  const trees = new T.Group(); scene.add(trees);
  [[-2.4, 3.6], [2.2, 4.4], [-5.8, 1.6], [5.6, 0.4], [2.6, -5], [-2.6, -4.2], [6, -4.6], [-6, 4.4]].forEach(([x, z]) => {
    const t = new T.Group(); t.position.set(x, 0, z); t.scale.setScalar(0.0001);
    const s = new T.Mesh(new T.CylinderGeometry(0.06, 0.08, 0.4, 8), trunk); s.position.y = 0.2; t.add(s);
    const c = new T.Mesh(new T.SphereGeometry(0.34, 14, 12), leaf); c.position.y = 0.62; c.castShadow = true; t.add(c);
    trees.add(t);
  });

  let stage = 0, angle = 0.9, dragging = false, lastX = 0, vel = 0, visible = false;
  function setStage(s) { stage = s; if (label) label.textContent = names[s]; }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    camera.aspect = r.width / r.height;
    camera.fov = r.width < 520 ? 46 : 34;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; angle -= dx * 0.008; vel = -dx * 0.008; });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  const lerp = (cur, tgt, k) => cur + (tgt - cur) * k;
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (!dragging) { angle += vel + (reduce ? 0 : 0.0016); vel *= 0.94; }
    const rad = stage === 2 ? 22 : 18;
    camera.position.set(Math.sin(angle) * rad, 9 + stage * 1.2, Math.cos(angle) * rad);
    camera.lookAt(0, 2.2 + stage * 0.3, 0);
    B.forEach(b => {
      b.cur = lerp(b.cur, b.stageAt[stage], reduce ? 1 : 0.045);
      b.slabs.forEach((f, i) => {
        const k = Math.min(1, Math.max(0, b.cur - i));
        f.visible = k > 0.001; f.scale.y = Math.max(k, 0.0001);
      });
      const top = b.cur * FH;
      b.roof.visible = b.cur > b.floors - 0.5; b.roof.position.y = top + 0.06;
      b.mast.visible = b.roof.visible && b.floors > 10; b.mast.position.y = top + 0.5;
    });
    trees.children.forEach((t, i) => t.scale.setScalar(lerp(t.scale.x, stage === 2 ? 1 : 0.0001, 0.05 + i * 0.002)));
    renderer.render(scene, camera);
  }
  frame();

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '200px' }).observe(canvas.parentElement);

  // Stage follows the step cards
  const steps = [...document.querySelectorAll('.dev-step')];
  const so = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    steps.forEach(s => s.classList.toggle('is-active', s === e.target));
    setStage(+e.target.dataset.stage);
  }), { rootMargin: '-40% 0px -40% 0px' });
  steps.forEach(s => so.observe(s));
  steps.forEach(s => s.addEventListener('click', () => {
    steps.forEach(x => x.classList.toggle('is-active', x === s));
    setStage(+s.dataset.stage);
  }));
})();

(() => {
  'use strict';
  const atmosphere = document.querySelector('[data-graph-atmosphere]');
  if (!atmosphere) return;
  const main = atmosphere.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = [...atmosphere.querySelectorAll('[data-cloud-source]')].map(element => ({
    element, anchor: document.getElementById(element.dataset.cloudAnchor),
    canvas: element.querySelector('canvas'), visible: false, elapsed: 0, routes: [], nodes: [],
  })).filter(record => record.anchor);
  let mapPromise, frame = 0, layoutFrame = 0, previous = 0, painted = 0;

  // The atmosphere never contributes to layout. Its anchors follow the sections
  // even when the trajectory collection or dip details change their height.
  function place() {
    layoutFrame = 0;
    const origin = main.getBoundingClientRect().top;
    for (const record of records) {
      record.element.style.top = `${record.anchor.getBoundingClientRect().top - origin + Number(record.element.dataset.cloudOffset || 0)}px`;
    }
  }
  function scheduleLayout() { if (!layoutFrame) layoutFrame = requestAnimationFrame(place); }
  const layout = new ResizeObserver(scheduleLayout);
  layout.observe(main);
  records.forEach(record => layout.observe(record.anchor));
  window.addEventListener('resize', scheduleLayout, {passive: true});

  function loadMap() {
    if (!mapPromise) mapPromise = fetch(atmosphere.dataset.cloudMap)
      .then(response => { if (!response.ok) throw new Error('Graph accents unavailable'); return response.json(); })
      .catch(() => null); // The real graph images remain as a static fallback.
    return mapPromise;
  }

  async function reveal(record) {
    if (record.revealing || record.element.dataset.cloudEntrance === 'revealed') return;
    record.revealing = true;
    // A cold image download should receive the same entrance as a cached image.
    const image = record.element.querySelector('img');
    try { await image.decode(); } catch { /* Motion can still work if the image fails. */ }
    record.revealing = false;
    record.imageReady = true;
    if (record.visible) record.element.dataset.cloudEntrance = 'revealed';
  }

  function curve(nodes) {
    const samples = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      const a = nodes[Math.max(0, i - 1)], b = nodes[i], c = nodes[i + 1], d = nodes[Math.min(nodes.length - 1, i + 2)];
      for (let j = 0; j < 12; j++) {
        const t = j / 12, t2 = t * t, t3 = t2 * t;
        samples.push([0, 1].map(k => .5 * ((2 * b[k]) + (-a[k] + c[k]) * t + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3)));
      }
    }
    samples.push(nodes.at(-1).slice(0, 2));
    return samples;
  }
  function point(samples, progress) {
    const at = Math.max(0, Math.min(samples.length - 1, progress * (samples.length - 1)));
    const a = samples[Math.floor(at)], b = samples[Math.min(samples.length - 1, Math.floor(at) + 1)], t = at % 1;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  function size(record) {
    const {width, height} = record.element.getBoundingClientRect();
    // Use unrotated CSS dimensions, which share the source SVG's coordinates.
    record.width = record.element.clientWidth || width;
    record.height = record.element.clientHeight || height;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    record.canvas.width = Math.round(record.width * dpr);
    record.canvas.height = Math.round(record.height * dpr);
    record.context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  const sizes = new ResizeObserver(entries => {
    for (const entry of entries) {
      const record = records.find(item => item.element === entry.target);
      if (record?.context) size(record);
    }
  });
  records.forEach(record => sizes.observe(record.element));

  async function prepare(record) {
    if (record.prepared || record.loading || reduced.matches) return;
    record.loading = true;
    const map = await loadMap();
    const source = map?.[record.element.dataset.cloudSource];
    record.loading = false;
    if (!source) return;
    record.context = record.canvas.getContext('2d');
    if (!record.context) return;
    record.nodes = source.nodes;
    record.routes = source.routes.map((indices, i) => ({
      samples: curve(indices.map(index => source.nodes[index])),
      color: source.nodes[indices[Math.floor(indices.length / 2)]].slice(2).join(','),
      phase: (i * .618034) % 1, duration: 8 + i % 7, radius: 1.4 + (i % 3) * .35,
    }));
    record.prepared = true;
    record.element.dataset.cloudParticles = String(record.routes.length);
    size(record);
    sync();
  }

  function paint(record) {
    const ctx = record.context, w = record.width, h = record.height;
    ctx.clearRect(0, 0, w, h);
    const count = w < 420 ? 14 : record.routes.length;
    for (const route of record.routes.slice(0, count)) {
      const progress = (record.elapsed / route.duration + route.phase) % 1;
      const alpha = Math.pow(Math.sin(Math.PI * progress), .7);
      const end = point(route.samples, progress);
      // A short, fading wake follows the real cloud's local neighborhoods.
      for (let j = 0; j < 9; j++) {
        const a = point(route.samples, Math.max(0, progress - .055 + j * .006));
        const b = point(route.samples, Math.max(0, progress - .049 + j * .006));
        ctx.beginPath(); ctx.moveTo(a[0] * w, a[1] * h); ctx.lineTo(b[0] * w, b[1] * h);
        ctx.strokeStyle = `rgba(${route.color},${alpha * .42 * (j + 1) / 9})`;
        ctx.lineWidth = 1.15; ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(end[0] * w, end[1] * h, route.radius * 2.7, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${route.color},${alpha * .08})`; ctx.fill();
      ctx.beginPath(); ctx.arc(end[0] * w, end[1] * h, route.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${route.color},${alpha * .85})`; ctx.fill();
    }
  }
  function tick(time) {
    frame = 0;
    if (!previous) previous = time;
    if (time - painted >= 32) {
      const delta = Math.min((time - previous) / 1000, .08);
      previous = time; painted = time;
      for (const record of records) if (record.active && record.prepared) {
        record.elapsed += delta;
        paint(record);
      }
    }
    if (records.some(record => record.active && record.prepared)) frame = requestAnimationFrame(tick);
  }
  function sync() {
    for (const record of records) {
      record.active = record.visible && !document.hidden && !reduced.matches;
      record.element.dataset.cloudMotion = reduced.matches ? 'reduced' : record.active ? 'running' : 'paused';
      if (reduced.matches) {
        record.element.dataset.cloudEntrance = 'revealed';
        record.context?.clearRect(0, 0, record.width, record.height);
      }
    }
    const active = records.some(record => record.active && record.prepared);
    if (!active && frame) { cancelAnimationFrame(frame); frame = 0; previous = painted = 0; }
    if (active && !frame) { previous = painted = 0; frame = requestAnimationFrame(tick); }
  }
  const visibility = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = records.find(item => item.element === entry.target);
      record.visible = entry.isIntersecting;
      if (record.visible) {
        if (record.imageReady) record.element.dataset.cloudEntrance = 'revealed';
        else reveal(record);
        prepare(record);
      }
    }
    sync();
  }, {threshold: 0});
  place();
  for (const record of records) {
    record.element.dataset.cloudEntrance = reduced.matches ? 'revealed' : 'waiting';
    visibility.observe(record.element);
  }
  atmosphere.dataset.cloudReady = 'true';
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', () => {
    sync();
    records.filter(record => record.visible).forEach(prepare);
  });
})();

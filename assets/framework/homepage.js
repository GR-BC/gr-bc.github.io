import {mountFramework} from './framework.js?v=e7a27d8d7140';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
};
const ids = (prefix, numbers) => numbers.map(n => `${prefix}${String(n).padStart(2, '0')}`);
// These are the four illustrative trajectories in Figure 1, not experiment traces.
// Their temporal paths are independent of the cross-trajectory similarity edges.
const trajectories = [
  {id: 'demo-1', label: 'Demonstration 01', color: '#4386ad',
    nodes: ids('a-node-demo-', [5, 2, 1, 10, 9, 12, 8, 13]), edges: [15, 9, 10, 11, 25, 24], split: 0, highlights: []},
  {id: 'demo-2', label: 'Demonstration 02', color: '#5a9bb8',
    nodes: ids('a-node-demo-', [4, 3, 6, 7, 11, 15, 14]), edges: [12, 8, 7, 26, 23], split: 1, highlights: [3, 5, 6]},
  {id: 'assisted', label: 'Intervention-assisted', color: '#c28a50',
    nodes: ['a-node-replay-06', 'a-node-replay-04', 'a-node-replay-01', 'a-node-intervention-01', 'a-node-replay-02', 'a-node-intervention-02', 'a-node-intervention-04', 'a-node-intervention-05'],
    edges: [16, 13, 5, 2, 1, 18, 21], highlights: [1, 2, 4]},
  {id: 'failure', label: 'Failure-ending rollout', color: '#b87879',
    nodes: ['a-node-replay-05', 'a-node-intervention-03', 'a-node-replay-03', 'a-node-replay-08', 'a-node-replay-07', 'a-node-replay-09', 'a-node-failure-01'],
    edges: [14, 6, 3, 4, 19, 20, 22], highlights: []},
];
const steps = [{id: 'A', start: 0}, {id: 'B', start: 4100}, {id: 'C', start: 6500}, {id: 'D', start: 8800}];
const INTRO_DURATION = 2500, INTRO_SCALE = INTRO_DURATION / 11200;

function createCircuit(svg, prefix) {
  const circuit = el('g', {class: 'pipeline-circuit', 'aria-hidden': 'true', 'pointer-events': 'none'});
  const gradientId = `${prefix}ribbon-gradient`, tipId = `${prefix}tip-gradient`;
  const defs = el('defs');
  const gradient = el('linearGradient', {id: gradientId, gradientUnits: 'userSpaceOnUse'});
  const stops = [[0, 0], [.3, .16], [.72, .65], [1, .96]].map(([offset, opacity]) => {
    const stop = el('stop', {offset, 'stop-color': '#559eb2', 'stop-opacity': opacity}); gradient.append(stop); return stop;
  });
  const tip = el('linearGradient', {id: tipId, x1: '0%', y1: '0%', x2: '100%', y2: '0%'});
  const tipStops = ['#9cc9da', '#356995'].map((color, i) => {const stop = el('stop', {offset: i, 'stop-color': color}); tip.append(stop); return stop;});
  defs.append(gradient, tip); circuit.append(defs);
  const orbit = el('path', {d: 'M560 -25 H1572 Q1625 -25 1625 28 V754 Q1625 807 1572 807 H28 Q-25 807 -25 754 V28 Q-25 -25 28 -25 Z', class: 'pipeline-orbit'});
  const glow = el('path', {class: 'pipeline-ribbon-glow', fill: `url(#${gradientId})`});
  const ribbon = el('path', {class: 'pipeline-ribbon', fill: `url(#${gradientId})`});
  const core = el('path', {class: 'pipeline-ribbon-core', stroke: `url(#${gradientId})`});
  const head = el('g', {class: 'pipeline-arrow'});
  head.append(el('path', {d: 'M11 0 Q-2 -3 -14 -10 L-8 0 L-14 10 Q-2 3 11 0Z', fill: `url(#${tipId})`}), el('path', {d: 'M-8 0 H6', class: 'pipeline-arrow-glint'}));
  circuit.append(orbit); svg.append(circuit);

  // Sample the fixed orbit once. Ribbon deformation uses cached points rather
  // than repeated SVG geometry queries on every animation frame.
  const length = orbit.getTotalLength(), sampleCount = 2048;
  const samples = Array.from({length: sampleCount}, (_, i) => orbit.getPointAtLength(i / sampleCount * length));
  const at = distance => {
    const value = ((distance % length + length) % length) / length * sampleCount;
    const i = Math.floor(value), t = value - i, a = samples[i], b = samples[(i + 1) % sampleCount];
    return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t};
  };
  const palette = [[77, 149, 177], [183, 145, 85], [191, 131, 122], [121, 155, 115]];
  const anchors = [[450, -25], [1370, -25], [1625, 650], [400, 807]];
  const gates = anchors.map(([x, y], i) => {
    let nearest = 0;
    samples.forEach((p, j) => {if (Math.hypot(p.x - x, p.y - y) < Math.hypot(samples[nearest].x - x, samples[nearest].y - y)) nearest = j;});
    const group = el('g', {class: 'pipeline-gate', transform: `translate(${x} ${y})`, style: `color:rgb(${palette[i].join(',')})`});
    const halo = el('circle', {r: 7, class: 'pipeline-gate-halo'});
    group.append(halo, el('circle', {r: 2.2, class: 'pipeline-gate-core'})); circuit.append(group);
    return {halo, distance: nearest / sampleCount * length};
  });
  circuit.append(glow, ribbon, core);
  const particles = Array.from({length: 4}, (_, i) => {
    const dot = el('circle', {r: 1.2 + (i % 2) * .5, class: 'pipeline-flow-particle'}); circuit.append(dot); return dot;
  });
  circuit.append(head);
  const number = n => n.toFixed(2);
  return elapsed => {
    const distance = elapsed / 18500 * length % length;
    const point = at(distance), tangent = at(distance + 2), tail = at(distance - 360);
    const huePosition = distance / length * 4, hue = Math.floor(huePosition), mix = huePosition - hue;
    const color = palette[hue].map((value, i) => Math.round(value + (palette[(hue + 1) % 4][i] - value) * mix));
    const rgb = values => `rgb(${values.join(',')})`;
    stops.forEach(stop => stop.setAttribute('stop-color', rgb(color)));
    tipStops[0].setAttribute('stop-color', rgb(color.map(v => Math.round(v + (255 - v) * .45))));
    tipStops[1].setAttribute('stop-color', rgb(color.map(v => Math.round(v * .72))));
    for (const [key, value] of Object.entries({x1: tail.x, y1: tail.y, x2: point.x, y2: point.y})) gradient.setAttribute(key, value);
    const left = [], right = [], spine = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40, d = distance - 360 * (1 - t), p = at(d), next = at(d + 2);
      const angle = Math.atan2(next.y - p.y, next.x - p.x), nx = -Math.sin(angle), ny = Math.cos(angle);
      const wave = Math.sin(t * 10 - elapsed / 720) * 2.2 * Math.sin(t * Math.PI);
      const width = .2 + 4.6 * Math.pow(Math.sin(t * Math.PI / 2), 1.6);
      const x = p.x + nx * wave, y = p.y + ny * wave;
      left.push(`${number(x + nx * width)} ${number(y + ny * width)}`);
      right.push(`${number(x - nx * width)} ${number(y - ny * width)}`);
      spine.push(`${number(x)} ${number(y)}`);
    }
    const shape = `M${left.join(' L')} L${right.reverse().join(' L')} Z`;
    ribbon.setAttribute('d', shape); glow.setAttribute('d', shape);
    core.setAttribute('d', `M${spine.join(' L')}`);
    head.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${Math.atan2(tangent.y - point.y, tangent.x - point.x) * 180 / Math.PI})`);
    particles.forEach((dot, i) => {
      const d = distance - 65 - i * 58, p = at(d), n = at(d + 2), angle = Math.atan2(n.y - p.y, n.x - p.x);
      const spread = (i % 2 ? 1 : -1) * (7 + Math.sin(elapsed / 950 + i) * 2);
      dot.setAttribute('cx', p.x - Math.sin(angle) * spread); dot.setAttribute('cy', p.y + Math.cos(angle) * spread);
      dot.setAttribute('fill', rgb(color)); dot.setAttribute('opacity', .48 - i * .085);
    });
    gates.forEach(gate => {
      const gap = Math.abs(distance - gate.distance), pulse = Math.max(0, 1 - Math.min(gap, length - gap) / 180);
      gate.halo.setAttribute('r', 5 + 6 * pulse); gate.halo.setAttribute('opacity', .08 + .48 * pulse);
    });
  };
}
const host = document.querySelector('[data-pipeline-host]');
if (host) initialize().catch(error => {
  host.querySelector('.fw-surface')?.remove();
  host.closest('.pipeline-figure').classList.remove('is-ready');
  console.error('Interactive framework unavailable; showing the original figure.', error);
});

async function initialize() {
  const controller = await mountFramework(host, {autoplay: false, interactive: false});
  const {svg, manifest, elements} = controller;
  const figure = host.closest('.pipeline-figure');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const replay = figure.querySelector('[data-pipeline-replay]');
  const motion = figure.querySelector('[data-pipeline-motion]');
  const component = id => elements.get(id) || [];
  const metadata = new Map(manifest.components.map(c => [c.id, c]));
  svg.setAttribute('viewBox', '-48 -50 1700 890');
  svg.setAttribute('width', '1700'); svg.setAttribute('height', '890');
  svg.setAttribute('aria-label', 'GR-BC learning cycle. Four stages and four selectable graph trajectories.');
  svg.querySelector(':scope > title')?.remove();
  svg.querySelectorAll('[data-component]').forEach(node => {
    ['tabindex', 'role', 'aria-pressed'].forEach(attr => node.removeAttribute(attr));
  });
  controller.overlay.remove();
  ['loop-a-b', 'loop-b-c', 'loop-c-d', 'loop-d-a'].forEach(id => component(id).forEach(node => node.style.display = 'none'));

  // Keep foreground fragments with their own stage while preserving source geometry.
  const parts = new Map();
  for (const [i, stage] of manifest.stages.entries()) {
    const outer = el('g', {class: 'pipeline-part', 'data-part': stage.id});
    const floating = el('g', {class: 'pipeline-float', style: `--float-delay:${-i * 1.7}s`});
    const [x, y, width, height] = stage.bounds;
    floating.append(el('rect', {x, y, width, height, rx: 18, fill: 'transparent', 'pointer-events': 'all'}));
    [...svg.children].filter(n => n.classList.contains('fw-stage') && n.dataset.stage === stage.id).forEach(n => floating.append(n));
    outer.append(floating); svg.append(outer); parts.set(stage.id, outer);
  }

  // Source edge 17 combines two unrelated arrows in one filled path. Split only
  // the presentation DOM; the editable source SVG remains untouched.
  const compound = component('a-temporal-edge-17')[0];
  const arrow = compound.querySelector('path');
  const segments = arrow.getAttribute('d').match(/M[^M]+/g);
  if (segments.length !== 4) throw Error('Unexpected compound temporal edge');
  const halves = [[0, 2], [1, 3]].map(indices => {
    const group = el('g', {class: 'pipeline-split-edge'});
    const path = arrow.cloneNode(true); path.removeAttribute('id');
    path.setAttribute('d', indices.map(i => segments[i]).join(' '));
    group.append(path); return group;
  });
  compound.style.display = 'none';
  const routeGroups = new Map();
  const graphParent = parts.get('A').querySelector('.pipeline-float');
  const graphHits = [];
  const assigned = new Set();
  for (const route of trajectories) {
    const group = el('g', {class: 'pipeline-graph-route', 'data-route': route.id,
      tabindex: 0, role: 'button', 'aria-label': `Highlight ${route.label.toLowerCase()}`, 'aria-pressed': 'false'});
    group.style.setProperty('--route-color', route.color);
    const members = [...ids('a-highlight-route-', route.highlights), ...ids('a-temporal-edge-', route.edges), ...route.nodes];
    for (const id of members) {
      if (assigned.has(id) || !elements.has(id)) throw Error(`Invalid trajectory membership: ${id}`);
      assigned.add(id); component(id).forEach(node => group.append(node));
    }
    if (route.split !== undefined) group.prepend(halves[route.split]);
    if (route.id === 'failure') component('a-failure-label').forEach(node => group.append(node));
    const centers = route.nodes.map(id => {const [x, y, w, h] = metadata.get(id).bounds; return [x + w / 2, y + h / 2];});
    graphHits.push(el('path', {d: centers.map(([x,y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '), class: 'pipeline-route-hit', 'data-route': route.id, 'aria-hidden': 'true', fill: 'none', stroke: 'transparent', 'stroke-width': 36}));
    graphParent.append(group); routeGroups.set(route.id, group);
  }
  // The hit paths stay at rest while their visible trajectories spring upward.
  // Keeping hit testing independent avoids losing hover under a stationary cursor.
  graphParent.append(...graphHits);
  const allNodes = manifest.components.filter(c => c.id.startsWith('a-node-'));
  if (allNodes.some(c => !assigned.has(c.id))) throw Error('An ungrouped graph node remains');
  svg.querySelectorAll('[data-component^="a-similarity-edge-"]').forEach(n => n.classList.add('pipeline-similarity'));

  // Follow the two source arrows across the stage boundary. Keep B's strips in
  // their own stage so hovering all of B still reveals its complete contents.
  const linkedGroups = new Map();
  for (const [route, connector, strip] of [
    ['demo-2', 'loop-a-b-demo', 'b-trajectory-demo'],
    ['assisted', 'loop-a-b-replay', 'b-trajectory-mixed'],
  ]) {
    component(connector).forEach(node => routeGroups.get(route).prepend(node));
    const group = el('g', {class: 'pipeline-linked-route', 'data-route': route});
    group.style.setProperty('--route-color', trajectories.find(r => r.id === route).color);
    [strip, ...[1, 2, 3, 4].map(i => `${strip}-frame-${i}`)].forEach(id => component(id).forEach(node => group.append(node)));
    parts.get('B').querySelector('.pipeline-float').append(group);
    linkedGroups.set(route, group);
  }

  const drawFlow = createCircuit(svg, controller.id);

  const ambient = [];
  svg.querySelectorAll('[stroke-dasharray]:not(.pipeline-orbit)').forEach((node, i) => {
    const period = node.getAttribute('stroke-dasharray').split(/[ ,]+/).reduce((sum, n) => sum + Number(n), 0);
    const frame = node.closest('[data-component$="-frame"]');
    const duration = (4400 + i % 3 * 1100) * (frame ? .78 : .9);
    const a = node.animate([{strokeDashoffset: 0}, {strokeDashoffset: -period}], {duration, iterations: Infinity});
    a.pause(); ambient.push(a);
  });
  let visible = false, started = false, paused = false, intro = false, raf = 0, last = null;
  let elapsed = 0, introTime = 0, phase = '', hoveredPart = null, hoveredRoute = null;
  let focusedPart = null, focusedRoute = null;
  let introAnimations = [];
  const springs = new WeakMap();

  function setPhase(id) {
    if (phase === id) return;
    phase = id; figure.dataset.phase = id || '';
  }
  function spring(node, active, isRoute = false) {
    if (node.classList.contains('is-focused') === active) return;
    const from = getComputedStyle(node).transform;
    springs.get(node)?.cancel(); node.classList.toggle('is-focused', active);
    if (reduced.matches || paused) return;
    const lift = isRoute ? 8 : 7;
    const to = active ? `translateY(${-lift}px) scale(${isRoute ? 1.025 : 1.012})` : 'translateY(0px) scale(1)';
    const overshoot = active ? `translateY(${-lift - 4}px) scale(${isRoute ? 1.036 : 1.021})` : 'translateY(2px) scale(.997)';
    springs.set(node, node.animate([{transform: from}, {transform: overshoot, offset: .62}, {transform: to}], {duration: 720, easing: 'cubic-bezier(.22,.75,.2,1)'}));
  }
  function focus() {
    const route = hoveredRoute || focusedRoute;
    const part = route ? 'A' : hoveredPart || focusedPart;
    figure.dataset.focus = part || ''; figure.dataset.route = route || '';
    parts.forEach((node, id) => {
      const linked = id === 'B' && linkedGroups.has(route);
      spring(node, part === id && !route);
      node.classList.toggle('is-muted', !!part && part !== id && !linked);
      node.classList.toggle('is-linked', linked);
    });
    routeGroups.forEach((node, id) => {
      spring(node, route === id, true); node.classList.toggle('is-muted', !!route && route !== id);
      node.setAttribute('aria-pressed', String(route === id));
    });
    linkedGroups.forEach((node, id) => {spring(node, route === id, true); node.classList.toggle('is-muted', !!route && route !== id);});
    if (!intro) setPhase(part);
  }
  function timing(c) {
    if (c.type === 'frame' || c.type === 'title') return steps.find(s => s.id === c.stage).start;
    const x = c.bounds[0];
    if (c.stage === 'A') {
      if (c.id.includes('legend')) return 3500;
      if (x < 240) return 450 + (c.id.includes('replay') ? 600 : c.id.includes('intervention') ? 300 : 0);
      if (x < 490) return 1450 + Math.max(0, c.bounds[1] - 80) * 2;
      return 2500 + Math.max(0, x - 500) * 1.4;
    }
    if (c.stage === 'B') return c.type === 'label' ? 4300 : c.id.includes('trajectory') ? 4600 + (x - 1200) * 1.2 : 5300 + (x - 1190) * 1.2;
    if (c.stage === 'C') return x < 1200 ? 6900 : 7250 + (x - 1200) * 2;
    return c.id.includes('feedback') || c.type === 'operator' || c.type === 'intervention' ? 10000 : 9200 + (x - 50) * 1.2;
  }
  function finishIntro() {
    introAnimations.forEach(a => a.cancel()); introAnimations = [];
    svg.querySelectorAll('.pipeline-route-reveal').forEach(wrapper => wrapper.replaceWith(...wrapper.childNodes));
    intro = false; figure.dataset.intro = 'complete'; setPhase(''); focus();
  }
  function playIntro() {
    started = true; paused = false; hoveredPart = hoveredRoute = focusedPart = focusedRoute = null;
    finishIntro(); introTime = 0; elapsed = 0;
    if (reduced.matches) {sync(); return;}
    intro = true; figure.dataset.intro = 'playing';
    const animate = (node, delay) => {
      const a = node.animate([{opacity: 0, transform: 'translateY(12px) scale(.98)'}, {opacity: 1, transform: 'translateY(-2px) scale(1.003)', offset: .8}, {opacity: 1, transform: 'none'}], {delay: delay * INTRO_SCALE, duration: 850 * INTRO_SCALE, fill: 'both', easing: 'cubic-bezier(.2,.65,.24,1)'});
      a.pause(); introAnimations.push(a);
    };
    for (const c of manifest.components) component(c.id).forEach(node => {
      if (node.closest('.pipeline-graph-route') || node.style.display === 'none') return;
      animate(node, timing(c));
    });
    routeGroups.forEach((node, id) => {
      const reveal = el('g', {class: 'pipeline-route-reveal'});
      while (node.firstChild) reveal.append(node.firstChild);
      node.append(reveal); animate(reveal, 2650 + trajectories.findIndex(r => r.id === id) * 230);
    });
    setPhase('A'); sync();
  }
  function tick(now) {
    const delta = last === null ? 0 : Math.min(now - last, 80); last = now; elapsed += delta;
    drawFlow(elapsed);
    if (intro) {
      introTime += delta;
      introAnimations.forEach(a => a.currentTime = introTime);
      setPhase([...steps].reverse().find(s => introTime >= s.start * INTRO_SCALE).id);
      if (introTime >= INTRO_DURATION) finishIntro();
    }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    const running = visible && !document.hidden && !paused && !reduced.matches;
    figure.dataset.running = String(running);
    ambient.forEach(a => running ? a.play() : a.pause());
    motion.textContent = paused ? '▷' : 'Ⅱ';
    motion.setAttribute('aria-label', paused ? 'Play motion' : 'Pause motion');
    motion.setAttribute('aria-pressed', String(paused)); motion.disabled = reduced.matches;
    motion.title = reduced.matches ? 'Motion is off according to your device preference' : paused ? 'Play motion' : 'Pause motion';
    if (running && !raf) {last = null; raf = requestAnimationFrame(tick);}
    if (!running && raf) {cancelAnimationFrame(raf); raf = 0; last = null;}
  }
  function interact() {
    if (intro || !started) {started = true; finishIntro();}
  }
  function pointAt(target) {
    focusedPart = focusedRoute = null;
    const within = target instanceof Element && svg.contains(target);
    hoveredPart = within ? target.closest('.pipeline-part')?.dataset.part || null : null;
    hoveredRoute = within ? routeAt(target) : null;
    if (hoveredPart) interact();
    focus();
  }
  function routeAt(target) {
    // The figure's data-route is output state, not an interactive hit region.
    // A generic [data-route] ancestor search would pick up that previous route
    // from every other part and keep A selected until the pointer leaves the SVG.
    return target.closest('.pipeline-graph-route, .pipeline-linked-route, .pipeline-route-hit')?.dataset.route || null;
  }
  svg.addEventListener('pointerover', e => {if (e.pointerType !== 'touch') pointAt(e.target);});
  svg.addEventListener('pointerout', e => {if (e.pointerType !== 'touch') pointAt(e.relatedTarget);});
  svg.addEventListener('pointerleave', () => pointAt(null));
  // Focus is transient: clicking never pins a part or a path after the pointer leaves.
  svg.addEventListener('click', interact);
  svg.addEventListener('pointerdown', e => {if (e.pointerType === 'touch') pointAt(e.target);});
  svg.addEventListener('pointerup', e => {if (e.pointerType === 'touch') pointAt(null);});
  svg.addEventListener('pointercancel', () => pointAt(null));
  function keyboardFocus(target) {
    interact();
    focusedPart = target.closest('.pipeline-part')?.dataset.part || null;
    focusedRoute = routeAt(target);
    focus();
  }
  svg.addEventListener('focusin', e => {if (e.target.matches(':focus-visible')) keyboardFocus(e.target);});
  svg.addEventListener('focusout', () => {focusedPart = focusedRoute = null; focus();});
  figure.addEventListener('keydown', e => {
    if (e.key === 'Escape') pointAt(null);
    if (e.target.matches('.pipeline-graph-route') && ['Enter', ' '].includes(e.key)) {
      e.preventDefault(); keyboardFocus(e.target);
    }
  });
  replay.addEventListener('click', playIntro);
  motion.addEventListener('click', () => {paused = !paused; sync();});
  reduced.addEventListener('change', () => {if (reduced.matches) finishIntro(); sync();});
  document.addEventListener('visibilitychange', sync);
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !started && entries[0].intersectionRatio >= .18) playIntro();
    sync();
  }, {threshold: [0, .18]});
  // Defer the entrance until the figure is in view; the fallback stays available if mounting failed.
  figure.classList.add('is-ready'); figure.dataset.intro = 'waiting';
  drawFlow(elapsed); setPhase(null); sync(); observer.observe(host);
}

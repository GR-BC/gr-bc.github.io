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
const steps = [
  {id: 'A', title: 'Build the graph', text: 'Connect demonstrations, interventions, and replay through multi-view state representations.', start: 0},
  {id: 'B', title: 'Estimate remaining steps', text: 'Search backward from success, then interpolate remaining steps along observed trajectories.', start: 4100},
  {id: 'C', title: 'Reweight behavior cloning', text: 'Turn graph-derived progress into training weights for the original VLA objective.', start: 6500},
  {id: 'D', title: 'Roll out & repeat', text: 'Collect new rollouts and human interventions, then return the experience to the dataset.', start: 8800},
];
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
  const status = figure.querySelector('[data-pipeline-status]');
  const replay = figure.querySelector('[data-pipeline-replay]');
  const motion = figure.querySelector('[data-pipeline-motion]');
  const phaseButtons = [...figure.querySelectorAll('[data-pipeline-step]')];
  const routeControls = figure.querySelector('[data-pipeline-routes]');
  const component = id => elements.get(id) || [];
  const metadata = new Map(manifest.components.map(c => [c.id, c]));
  svg.setAttribute('viewBox', '-48 -50 1700 890');
  svg.setAttribute('width', '1700'); svg.setAttribute('height', '890');
  svg.setAttribute('aria-label', 'GR-BC learning cycle. Four stages and four selectable graph trajectories.');
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
    group.append(el('path', {d: centers.map(([x,y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' '), class: 'pipeline-route-hit', fill: 'none', stroke: 'transparent', 'stroke-width': 25}));
    graphParent.append(group); routeGroups.set(route.id, group);
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.route = route.id; button.setAttribute('aria-pressed', 'false');
    button.style.setProperty('--route-color', route.color); button.textContent = route.label;
    routeControls.append(button);
  }
  const allNodes = manifest.components.filter(c => c.id.startsWith('a-node-'));
  if (allNodes.some(c => !assigned.has(c.id))) throw Error('An ungrouped graph node remains');
  svg.querySelectorAll('[data-component^="a-similarity-edge-"]').forEach(n => n.classList.add('pipeline-similarity'));

  // One clockwise feedback circuit replaces the four disconnected white arrows.
  const circuit = el('g', {class: 'pipeline-circuit', 'aria-hidden': 'true', 'pointer-events': 'none'});
  const pathData = 'M560 -25 H1582 Q1625 -25 1625 18 V755 Q1625 807 1573 807 H28 Q-25 807 -25 754 V18 Q-25 -25 28 -25 Z';
  const orbit = el('path', {d: pathData, class: 'pipeline-orbit'});
  const trail = el('path', {d: pathData, class: 'pipeline-comet'});
  const glow = el('path', {d: pathData, class: 'pipeline-comet pipeline-comet-glow'});
  const head = el('g', {class: 'pipeline-arrow'});
  head.append(el('path', {d: 'M-14 -8 L0 0 L-14 8 M-26 -8 L-12 0 L-26 8'}));
  circuit.append(orbit, glow, trail, head); svg.append(circuit);
  const length = orbit.getTotalLength();
  [trail, glow].forEach(p => p.setAttribute('stroke-dasharray', `190 ${length - 190}`));

  const ambient = [];
  svg.querySelectorAll('[stroke-dasharray]:not(.pipeline-comet)').forEach((node, i) => {
    const period = node.getAttribute('stroke-dasharray').split(/[ ,]+/).reduce((sum, n) => sum + Number(n), 0);
    const a = node.animate([{strokeDashoffset: 0}, {strokeDashoffset: -period}], {duration: 4400 + i % 3 * 1100, iterations: Infinity});
    a.pause(); ambient.push(a);
  });
  let visible = false, started = false, paused = false, intro = false, raf = 0, last = null;
  let elapsed = 0, introTime = 0, phase = '', hoveredPart = null, hoveredRoute = null, pinnedPart = null, pinnedRoute = null;
  let introAnimations = [];
  const springs = new WeakMap();

  function setPhase(id) {
    if (phase === id) return;
    phase = id; figure.dataset.phase = id || '';
    phaseButtons.forEach(b => b.classList.toggle('is-current', b.dataset.pipelineStep === id));
    const step = steps.find(s => s.id === id);
    status.textContent = step ? `${step.id} / ${step.title} — ${step.text}` : 'Follow the learning cycle. Hover a part to focus; trace any graph trajectory to lift its entire path.';
  }
  function spring(node, active, isRoute = false) {
    if (node.classList.contains('is-focused') === active) return;
    const from = getComputedStyle(node).transform;
    springs.get(node)?.cancel(); node.classList.toggle('is-focused', active);
    if (reduced.matches || paused) return;
    const to = active ? `translateY(${isRoute ? -8 : -7}px) scale(${isRoute ? 1.025 : 1.012})` : 'translateY(0px) scale(1)';
    const overshoot = active ? `translateY(${isRoute ? -12 : -11}px) scale(${isRoute ? 1.036 : 1.021})` : 'translateY(2px) scale(.997)';
    springs.set(node, node.animate([{transform: from}, {transform: overshoot, offset: .62}, {transform: to}], {duration: 720, easing: 'cubic-bezier(.22,.75,.2,1)'}));
  }
  function focus() {
    const route = hoveredRoute || pinnedRoute;
    const part = route ? 'A' : hoveredPart || pinnedPart;
    figure.dataset.focus = part || ''; figure.dataset.route = route || '';
    parts.forEach((node, id) => {spring(node, part === id); node.classList.toggle('is-muted', !!part && part !== id);});
    routeGroups.forEach((node, id) => {
      spring(node, route === id, true); node.classList.toggle('is-muted', !!route && route !== id);
      node.setAttribute('aria-pressed', String(pinnedRoute === id));
    });
    routeControls.querySelectorAll('button').forEach(b => {b.classList.toggle('is-current', b.dataset.route === route); b.setAttribute('aria-pressed', String(b.dataset.route === pinnedRoute));});
    phaseButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pipelineStep === pinnedPart)));
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
    started = true; paused = false; hoveredPart = hoveredRoute = pinnedPart = pinnedRoute = null;
    finishIntro(); introTime = 0; elapsed = 0;
    if (reduced.matches) {sync(); return;}
    intro = true; figure.dataset.intro = 'playing';
    const animate = (node, delay) => {
      const a = node.animate([{opacity: 0, transform: 'translateY(12px) scale(.98)'}, {opacity: 1, transform: 'translateY(-2px) scale(1.003)', offset: .8}, {opacity: 1, transform: 'none'}], {delay, duration: 850, fill: 'both', easing: 'cubic-bezier(.2,.65,.24,1)'});
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
  function drawCircuit() {
    const distance = elapsed / 18000 * length % length;
    const point = orbit.getPointAtLength(distance), next = orbit.getPointAtLength((distance + 1) % length);
    head.setAttribute('transform', `translate(${point.x} ${point.y}) rotate(${Math.atan2(next.y - point.y, next.x - point.x) * 180 / Math.PI})`);
    [trail, glow].forEach(p => p.setAttribute('stroke-dashoffset', 190 - distance));
  }
  function tick(now) {
    const delta = last === null ? 0 : Math.min(now - last, 80); last = now; elapsed += delta;
    drawCircuit();
    if (intro) {
      introTime += delta;
      introAnimations.forEach(a => a.currentTime = introTime);
      setPhase([...steps].reverse().find(s => introTime >= s.start).id);
      if (introTime >= 11200) finishIntro();
    }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    const running = visible && !document.hidden && !paused && !reduced.matches;
    figure.dataset.running = String(running);
    ambient.forEach(a => running ? a.play() : a.pause());
    motion.textContent = paused ? 'Play motion' : 'Pause motion';
    motion.setAttribute('aria-pressed', String(paused)); motion.disabled = reduced.matches;
    motion.title = reduced.matches ? 'Motion is off according to your device preference' : '';
    if (running && !raf) {last = null; raf = requestAnimationFrame(tick);}
    if (!running && raf) {cancelAnimationFrame(raf); raf = 0; last = null;}
  }
  function interact() {
    if (intro || !started) {started = true; finishIntro();}
  }
  svg.addEventListener('pointerover', e => {
    if (e.pointerType === 'touch') return;
    const part = e.target.closest('[data-part]')?.dataset.part;
    if (!part) {hoveredPart = hoveredRoute = null; focus(); return;}
    interact(); hoveredPart = part; hoveredRoute = e.target.closest('[data-route]')?.dataset.route || null; focus();
  });
  svg.addEventListener('pointerleave', () => {hoveredPart = hoveredRoute = null; focus();});
  svg.addEventListener('click', e => {
    const route = e.target.closest('[data-route]')?.dataset.route;
    const part = e.target.closest('[data-part]')?.dataset.part;
    interact(); pinnedRoute = route ? (pinnedRoute === route ? null : route) : null;
    pinnedPart = route ? null : (pinnedPart === part ? null : part); focus();
  });
  svg.addEventListener('focusin', e => {if (e.target.dataset.route) {interact(); hoveredRoute = e.target.dataset.route; focus();}});
  svg.addEventListener('focusout', () => {hoveredRoute = null; focus();});
  figure.addEventListener('keydown', e => {
    if (e.key === 'Escape') {pinnedRoute = pinnedPart = hoveredRoute = hoveredPart = null; focus();}
    if (e.target.matches('.pipeline-graph-route') && ['Enter', ' '].includes(e.key)) {
      e.preventDefault(); interact(); pinnedRoute = pinnedRoute === e.target.dataset.route ? null : e.target.dataset.route; focus();
    }
  });
  function bindFocusButton(button, type) {
    const id = type === 'route' ? button.dataset.route : button.dataset.pipelineStep;
    const setHover = value => {interact(); if (type === 'route') hoveredRoute = value; else hoveredPart = value; focus();};
    button.addEventListener('pointerenter', e => {if (e.pointerType !== 'touch') setHover(id);});
    button.addEventListener('pointerleave', () => setHover(null));
    button.addEventListener('focus', () => setHover(id)); button.addEventListener('blur', () => setHover(null));
    button.addEventListener('click', () => {
      interact(); if (type === 'route') {pinnedRoute = pinnedRoute === id ? null : id; pinnedPart = null;}
      else {pinnedPart = pinnedPart === id ? null : id; pinnedRoute = null;} focus();
      const viewport = figure.querySelector('.pipeline-viewport');
      if (viewport.scrollWidth > viewport.clientWidth) {
        const target = (type === 'route' ? routeGroups : parts).get(id).getBoundingClientRect();
        const bounds = viewport.getBoundingClientRect();
        viewport.scrollTo({left: viewport.scrollLeft + target.x + target.width / 2 - bounds.x - bounds.width / 2, behavior: reduced.matches ? 'instant' : 'smooth'});
      }
    });
  }
  phaseButtons.forEach(b => bindFocusButton(b, 'part'));
  routeControls.querySelectorAll('button').forEach(b => bindFocusButton(b, 'route'));
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
  drawCircuit(); setPhase(null); sync(); observer.observe(host);
}

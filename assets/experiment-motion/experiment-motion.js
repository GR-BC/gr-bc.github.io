/** GR-BC experiment figure. Native SVG + Web Animations; no runtime dependencies. */
const RELEASE = '28951c2c8a42';
const asset = file => new URL(`${file}?v=${RELEASE}`, import.meta.url).href;
const mounted = new WeakMap();
let instance = 0;
const qs = (root, selector) => root.querySelector(selector);
const qsa = (root, selector) => [...root.querySelectorAll(selector)];

function stylesheet() {
  const href = asset('experiment-motion.css');
  if (![...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === href)) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.append(link);
  }
}
function namespace(svg, prefix) {
  const ids = new Map(qsa(svg, '[id]').map(node => [node.id, `${prefix}-${node.id}`]));
  for (const node of [svg, ...qsa(svg, '*')]) for (const attr of [...node.attributes]) {
    let value = attr.value;
    if (attr.name === 'id') value = ids.get(value) || value;
    value = value.replace(/url\(#([^)]+)\)/g, (match, id) => `url(#${ids.get(id) || id})`);
    if (value !== attr.value) node.setAttribute(attr.name, value);
  }
}

/**
 * await mountExperimentMotion(element, { speed: 1, reducedMotion: 'system', onSelect })
 * Returns replay(), play(), pause(), setSpeed(), setReducedMotion(), clearSelection(), destroy().
 */
export async function mountExperimentMotion(target, options = {}) {
  const host = typeof target === 'string' ? document.querySelector(target) : target;
  if (!host) throw new Error('Experiment mount target was not found.');
  mounted.get(host)?.destroy(); stylesheet();
  const abort = new AbortController();
  const root = document.createElement('section'); root.className = 'grbc-experiments';
  root.setAttribute('aria-label', 'Interactive real-world experiment results');
  root.dataset.emState = 'loading'; root.innerHTML = '<p class="em-loading" role="status">Preparing the experiments…</p>';
  host.append(root);
  const uid = `em-${++instance}`;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let data, states = [], observer, destroyed = false, paused = false;
  let speed = options.speed ?? 1, motion = options.reducedMotion ?? 'system';
  let active = null, pinned = null, legendAnimations = [], legendStarted = false;
  const reduced = () => motion === true || (motion === 'system' && media.matches);
  const listen = (node, type, fn) => node.addEventListener(type, fn, { signal: abort.signal });
  const allAnimations = () => [...states.flatMap(state => state.animations), ...legendAnimations];
  const api = {
    replay() {
      if (destroyed || !data) return;
      api.clearSelection(); legendAnimations.forEach(a => a.cancel()); legendAnimations = []; legendStarted = false;
      for (const state of states) prepare(state);
      sync();
    },
    play() { paused = false; sync(); },
    pause() { paused = true; sync(); },
    setSpeed(value) {
      if (!Number.isFinite(value) || value < .25 || value > 3) throw new RangeError('Speed must be between 0.25 and 3.');
      speed = value; allAnimations().forEach(a => a.updatePlaybackRate(speed));
    },
    setReducedMotion(value = 'system') { motion = value; api.replay(); },
    clearSelection() { pinned = null; show(null); },
    destroy() {
      if (destroyed) return;
      destroyed = true; abort.abort(); observer?.disconnect(); allAnimations().forEach(a => a.cancel()); states.forEach(s => s.valueAnimations?.forEach(a => a.cancel())); root.remove();
      if (mounted.get(host) === api) mounted.delete(host);
    }
  };
  mounted.set(host, api);
  function animate(state, node, frames, duration, delay = 0) {
    const a = node.animate(frames, { duration, delay, fill: 'both', easing: 'linear' });
    a.pause(); a.currentTime = 0; a.playbackRate = speed; state.animations.push(a); return a;
  }
  function prepare(state) {
    state.animations.forEach(a => a.cancel()); state.animations = []; state.started = false; state.finished = false;
    state.el.dataset.emPhase = 'waiting';
    for (const [index, method] of data.methods.entries()) {
      const delay = index * 540;
      const pieces = qsa(state.el, `[data-em-method="${method.id}"].em-method-piece`);
      const dots = pieces.filter(piece => piece.dataset.emPart === 'dot');
      for (const piece of pieces) {
        const part = piece.dataset.emPart;
        const [x, y] = piece.dataset.emOrigin.split(' ');
        piece.style.transformBox = 'view-box'; piece.style.transformOrigin = `${x}px ${y}px`;
        if (part === 'bar') animate(state, piece, [
          { transform: 'scaleY(0)', opacity: .5, offset: 0, easing: 'cubic-bezier(.2,.8,.25,1)' },
          { transform: 'scaleY(1.055)', opacity: 1, offset: .6, easing: 'ease-in-out' },
          { transform: 'scaleY(.987)', offset: .81, easing: 'ease-out' },
          { transform: 'scaleY(1)', offset: 1 }
        ], 1120, delay);
        if (part === 'value') animate(state, piece, [
          { opacity: 0, transform: 'translateY(10px) scale(.88)', easing: 'cubic-bezier(.15,.8,.2,1)' },
          { opacity: 1, transform: 'translateY(-4px) scale(1.06)', offset: .7 },
          { opacity: 1, transform: 'none' }
        ], 500, delay + 520);
        if (part === 'curve') animate(state, piece.firstElementChild, [
          { strokeDasharray: '1 1', strokeDashoffset: '1', easing: 'cubic-bezier(.25,.5,.25,1)' },
          { strokeDasharray: '1 1', strokeDashoffset: '0' }
        ], 1100, delay + 80);
        if (part === 'dot') animate(state, piece, [
          { transform: 'scale(0)', opacity: 0, easing: 'cubic-bezier(.12,.8,.24,1)' },
          { transform: 'scale(1.28)', opacity: 1, offset: .67 },
          { transform: 'scale(1)', opacity: 1 }
        ], 390, delay + 100 + dots.indexOf(piece) / Math.max(1, dots.length - 1) * 900);
        if (part === 'label') animate(state, piece, [{ opacity: .42 }, { opacity: 1 }], 450, delay);
      }
    }
    animate(state, qs(state.el, '.em-gain'), [
      { opacity: .25, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }
    ], 600, 1900);
    const batch = state.animations;
    Promise.all(batch.map(a => a.finished)).then(() => {
      if (destroyed || state.animations !== batch) return;
      state.finished = true; state.el.dataset.emPhase = 'complete'; updateStatus();
    }).catch(() => {}); // Cancellation is expected on replay and unmount.
    if (reduced()) {
      state.started = true; state.finished = true; state.animations.forEach(a => a.finish()); state.el.dataset.emPhase = 'complete';
    }
  }
  function startLegend() {
    if (legendStarted || reduced()) return;
    legendStarted = true;
    data.methods.forEach((method, i) => {
      const a = qs(root, `[data-em-legend="${method.id}"] .em-step-fill`).animate([
        { transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }
      ], { duration: 1080, delay: i * 540, fill: 'both', easing: 'cubic-bezier(.2,.75,.2,1)' });
      a.playbackRate = speed; a.finished.catch(() => {}); legendAnimations.push(a);
    });
  }
  function sync() {
    if (destroyed || !data) return;
    for (const state of states) {
      const run = state.visible && !document.hidden && !paused;
      if (run && !state.started) { state.started = true; state.el.dataset.emPhase = 'growing'; startLegend(); }
      state.animations.forEach(a => {
        if (a.playState !== 'finished') run && state.started ? a.play() : a.pause();
      });
    }
    const anyVisible = states.some(s => s.visible);
    legendAnimations.forEach(a => { if (a.playState !== 'finished') anyVisible && !document.hidden && !paused ? a.play() : a.pause(); });
    updateStatus();
  }
  function updateStatus() {
    if (!data || destroyed) return;
    root.dataset.emState = reduced() ? 'static' : paused ? 'paused' : states.every(s => s.finished) ? 'complete' : 'growing';
    qs(root, '.em-state-label').textContent = reduced() ? 'Reduced motion' : paused ? 'Paused' : states.every(s => s.finished || !s.visible) ? 'Explore the results' : 'Results taking shape';
  }
  const sameSelection = (a, b) => a?.method === b?.method && a?.task === b?.task;
  function updateHover(selection) {
    // Respond in the same pointer event; visual transitions provide the softness.
    if (!destroyed && !pinned && !sameSelection(active, selection)) show(selection);
  }
  function show(selection) {
    const previous = active;
    active = selection;
    const selected = selection?.method;
    root.classList.toggle('em-has-selection', Boolean(selected));
    for (const piece of qsa(root, '[data-em-method]')) {
      piece.classList.toggle('em-is-muted', Boolean(selected && piece.dataset.emMethod !== selected));
      piece.classList.toggle('em-is-active', Boolean(selected && piece.dataset.emMethod === selected));
      if (piece.matches('.em-bar-hit')) piece.setAttribute('aria-pressed', String(Boolean(pinned?.task && piece.dataset.emTask === pinned.task && piece.dataset.emMethod === pinned.method)));
    }
    for (const button of qsa(root, '[data-em-legend]')) button.setAttribute('aria-pressed', String(pinned?.method === button.dataset.emLegend && !pinned.task));
    qs(root, '.em-legend-help').textContent = selected ? data.methods.find(m => m.id === selected).description : 'Hover a bar or curve to explore · click to keep a comparison';
    for (const state of states) {
      const open = Boolean(selected && selection.task === state.task.id);
      const detail = qs(state.el, '.em-detail');
      state.el.classList.toggle('em-detail-open', open); detail.setAttribute('aria-hidden', String(!open));
      if (!open) {
        state.valueAnimations?.forEach(a => a.cancel());
        continue;
      }
      const method = data.methods.find(m => m.id === selected);
      const value = state.task.finalSuccess[selected];
      detail.style.setProperty('--em-accent', method.color);
      const digits = qs(detail, '.em-detail-value');
      const oldDigits = qs(detail, '.em-detail-previous');
      const oldValue = digits.textContent;
      const oldOpacity = Number.parseFloat(getComputedStyle(digits).opacity);
      state.valueAnimations?.forEach(a => a.cancel());
      oldDigits.textContent = oldValue;
      digits.textContent = value;
      qs(detail, '.em-detail-context').textContent = `${method.label} · final success`;
      const hit = qs(state.el, `.em-bar-hit[data-em-method="${selected}"]`);
      const bar = qs(state.el, `.em-method-piece[data-em-method="${selected}"][data-em-part="bar"]`);
      const cardRect = state.el.getBoundingClientRect();
      const hitRect = hit.getBoundingClientRect();
      const svg = qs(state.el, 'svg');
      const svgRect = svg.getBoundingClientRect();
      const view = svg.viewBox.baseVal;
      const finalTop = svgRect.top + (bar.firstElementChild.getBBox().y - view.y) * svgRect.height / view.height;
      detail.style.left = `${Math.max(9, Math.min(cardRect.width - 81, hitRect.left + hitRect.width / 2 - cardRect.left - 36))}px`;
      detail.style.top = `${Math.max(43, finalTop - cardRect.top - 54)}px`;
      // Keep the same bubble alive between columns. Only its digits crossfade;
      // position, highlight and the small entrance spring transition independently.
      if (!reduced() && !sameSelection(previous, selection)) {
        state.valueAnimations = [
          oldDigits.animate([
            { opacity: previous?.task === state.task.id ? oldOpacity : 0, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-5px)' }
          ], { duration: 160, easing: 'ease-out' }),
          digits.animate([
            { opacity: 0, transform: 'translateY(6px) scale(.96)', easing: 'cubic-bezier(.18,.75,.25,1)' },
            { opacity: 1, transform: 'translateY(-1px) scale(1.025)', offset: .75 },
            { opacity: 1, transform: 'none' }
          ], { duration: 360, easing: 'ease-out' })
        ];
      }
    }
    options.onSelect?.(selection ? { ...selection, value: selection.task ? data.tasks.find(t => t.id === selection.task).finalSuccess[selected] : null } : null);
  }
  try {
    const response = await fetch(asset('data.json'), { signal: abort.signal }); if (!response.ok) throw new Error('Experiment data could not load.');
    data = await response.json();
    const svgs = await Promise.all(data.tasks.map(async task => {
      const r = await fetch(asset(task.file), { signal: abort.signal }); if (!r.ok) throw new Error(`${task.label} could not load.`); return r.text();
    }));
    if (destroyed) return api;
    root.innerHTML = `
      ${options.intro === false ? '' : '<div class="em-intro"><div><span class="em-eyebrow">Real-world evaluation</span><h2>Small iterations. Meaningful gains.</h2></div><p>Four tasks, four methods.<br> Watch final success and learning curves take shape.</p></div>'}
      <div class="em-toolbar"><div class="em-sequence" aria-label="Animation and comparison order">${data.methods.map((m,i) => `<button type="button" data-em-legend="${m.id}" data-em-method="${m.id}" aria-pressed="false" style="--em-accent:${m.color}"><span class="em-step-fill"></span><span class="em-step-number">0${i+1}</span><i></i><b>${m.label}</b>${i===3?'<span class="em-ours">Ours</span>':''}</button>`).join('')}</div><button class="em-replay" type="button" data-em-action="replay" aria-label="Replay the growth animation">↻ <span>replay</span></button></div>
      <p class="em-legend-help">Hover a bar or curve to explore · click to keep a comparison</p>
      <div class="em-grid">${data.tasks.map((task,i) => `<article class="em-task" data-em-task="${task.id}" aria-labelledby="${uid}-${task.id}-title"><header class="em-task-header"><span class="em-task-index">0${i+1}</span><h3 id="${uid}-${task.id}-title">${task.label}</h3><span class="em-rounds">${task.rounds} iterations</span></header><div class="em-plot"></div><aside class="em-detail" id="${uid}-${task.id}-detail" aria-hidden="true"><strong class="em-detail-value"></strong><span class="em-detail-percent">%</span><span class="em-sr-only em-detail-context"></span></aside><footer class="em-task-footer"><span>GR-BC advantage</span><strong class="em-gain">+${task.grbcGain}<small>pp</small></strong></footer><table class="em-sr-only"><caption>${task.label}: final success rate</caption><thead><tr><th scope="col">Method</th><th scope="col">Success</th></tr></thead><tbody>${data.methods.map(m => `<tr><th scope="row">${m.label}</th><td>${task.finalSuccess[m.id]}%</td></tr>`).join('')}</tbody></table></article>`).join('')}</div>
      <div class="em-caption"><span><i></i><span class="em-state-label">Results taking shape</span></span><p>Bars: final success (0–1) · Lines: success (%) across iterations · pp: percentage points</p></div>`;
    states = data.tasks.map((task, index) => {
      const card = qs(root, `.em-task[data-em-task="${task.id}"]`);
      const svg = new DOMParser().parseFromString(svgs[index], 'image/svg+xml').documentElement;
      namespace(svg, `${uid}-${task.id}`); qs(card, '.em-plot').append(document.importNode(svg, true));
      // Hover opacity belongs to a separate wrapper, so it never overrides the
      // entrance's animated opacity or snaps when those animations finish.
      for (const piece of qsa(card, '.em-method-piece')) {
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapper.classList.add('em-method-hover'); wrapper.dataset.emMethod = piece.dataset.emMethod;
        wrapper.dataset.emPart = piece.dataset.emPart;
        const [x, y] = piece.dataset.emOrigin.split(' ');
        wrapper.style.transformBox = 'view-box'; wrapper.style.transformOrigin = `${x}px ${y}px`;
        piece.before(wrapper); wrapper.append(piece);
      }
      const digits = qs(card, '.em-detail-value');
      const oldDigits = document.createElement('span'); oldDigits.className = 'em-detail-previous'; oldDigits.setAttribute('aria-hidden', 'true');
      const number = document.createElement('span'); number.className = 'em-detail-number';
      digits.before(number); number.append(oldDigits, digits);
      for (const hit of qsa(card, '.em-bar-hit')) hit.setAttribute('aria-describedby', `${uid}-${task.id}-detail`);
      return { el: card, task, animations: [], visible: false, started: false, finished: false };
    });
    for (const state of states) prepare(state);
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const state = states.find(s => s.el === entry.target); state.visible = entry.isIntersecting;
      }
      sync();
    }, { threshold: .12 });
    states.forEach(state => observer.observe(state.el));
    listen(document, 'visibilitychange', sync);
    listen(media, 'change', () => { if (motion === 'system') api.replay(); });
    const selectionFor = target => {
      const node = target.closest('[data-em-method]'); if (!node || !root.contains(node)) return null;
      return { method: node.dataset.emMethod, task: node.closest('.em-task')?.dataset.emTask || null };
    };
    listen(root, 'pointerover', event => {
      if (event.pointerType === 'touch' || pinned) return;
      const next = selectionFor(event.target); if (next) updateHover(next);
    });
    listen(root, 'pointerout', event => {
      if (pinned || event.pointerType === 'touch') return;
      const next = event.relatedTarget instanceof Element ? selectionFor(event.relatedTarget) : null;
      updateHover(next);
    });
    listen(root, 'focusin', event => {
      const next = selectionFor(event.target);
      if (next) updateHover(next);
    });
    listen(root, 'focusout', event => {
      if (!pinned && !(event.relatedTarget instanceof Element && selectionFor(event.relatedTarget))) updateHover(null);
    });
    listen(root, 'click', event => {
      const action = event.target.closest('[data-em-action]')?.dataset.emAction;
      if (action === 'replay') { api.replay(); return; }
      const next = selectionFor(event.target);
      if (next) { pinned = sameSelection(pinned, next) ? null : next; show(pinned); }
      else api.clearSelection();
    });
    listen(root, 'keydown', event => {
      if (event.key === 'Escape') api.clearSelection();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.em-bar-hit')) {
        event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    listen(document, 'pointerdown', event => { if (!root.contains(event.target) && active) api.clearSelection(); });
    api.setSpeed(speed); sync(); return api;
  } catch (error) {
    if (destroyed || error.name === 'AbortError') return api;
    root.dataset.emState = 'error'; root.innerHTML = '<p class="em-loading" role="alert">The interactive figure could not load. <a href="'+asset('source.svg')+'">View the original figure</a> or reload this page.</p>';
    throw error;
  }
}

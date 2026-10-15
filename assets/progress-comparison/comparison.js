import { comparisonConfig as defaults } from './comparison.config.js?v=0fb4edf588bb';

const mounts = new WeakMap();
let serial = 0;
const RELEASE = 'c69dc3936fbe';
const assetURL = name => new URL(`${name}?v=${RELEASE}`, import.meta.url);
const icon = (body, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const replayIcon = icon('<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>');
const pointerIcon = icon('<path d="m6 3 12 10-6 1-3 6z"/>');

/** Mount the self-contained Frame 21 comparison. No homepage globals or build step. */
export async function mountProgressComparison(container, options = {}) {
  if (!(container instanceof Element)) throw new TypeError('A container element is required.');
  mounts.get(container)?.destroy();
  const config = { ...defaults, ...options.config, colors: { ...defaults.colors, ...options.config?.colors }, reveal: { ...defaults.reveal, ...options.config?.reveal } };
  const abort = new AbortController();
  const signal = abort.signal;
  const instance = ++serial;
  let destroyed = false;
  let observer;
  let resizeObserver;
  let pendingReplay = false;
  let seen = false;
  let visible = false;
  let pinned = null;
  let hovered;
  let focused;
  let activeEvent = null;
  let pinnedEvent = null;
  let entrance = [];
  const springs = new Map();
  const pulses = new Map();
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let forcedReduced = Boolean(options.reducedMotion);
  const isReduced = () => motionQuery.matches || forcedReduced;
  const methods = new Map(config.methods.map(method => [method.id, method]));
  const frameIDs = new Set(config.frames.map(frame => frame.id));
  const root = document.createElement('section');
  root.className = 'pc-comparison';
  root.setAttribute('aria-label', 'Interactive progress comparison');
  root.dataset.state = 'loading';
  root.innerHTML = '<div class="pc-loading" role="status">Preparing the trajectory…</div>';
  container.replaceChildren(root);

  const api = {
    selectMethod(id) {
      if (id !== null && !methods.has(id)) throw new RangeError(`Unknown method: ${id}`);
      pinned = id; hovered = undefined; focused = undefined;
      updateSelection(); emitSelection();
    },
    selectFrame(id) {
      if (id !== null && !frameIDs.has(id)) throw new RangeError(`Unknown frame: ${id}`);
      pinnedEvent = id; updateEvent(id);
    },
    replay() {
      if (!seen || !visible || document.hidden) { pendingReplay = true; return; }
      runEntrance();
    },
    setReducedMotion(value) { forcedReduced = Boolean(value); updateMotionPreference(); },
    getState() { return { selectedMethod: pinned, effectiveMethod: effectiveMethod(), selectedFrame: pinnedEvent, visible, revealed: seen, reducedMotion: isReduced(), destroyed }; },
    destroy() {
      if (destroyed) return;
      destroyed = true; abort.abort(); observer?.disconnect(); resizeObserver?.disconnect();
      cancelEntrance();
      for (const spring of springs.values()) spring.stop();
      for (const animation of pulses.values()) animation.cancel();
      if (mounts.get(container) === api) { mounts.delete(container); root.remove(); }
    },
  };
  mounts.set(container, api);
  let svg;
  let indicator;
  let buttons = [];
  let curves = [];
  let frames = [];

  try {
    const response = await fetch(assetURL('plot.svg'), { signal });
    if (!response.ok) throw new Error(`Artwork could not load (${response.status}).`);
    const doc = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (doc.querySelector('parsererror')) throw new Error('The SVG artwork is invalid.');
    if (destroyed) return api;
    svg = document.importNode(doc.documentElement, true);
    // Namespace embedded masks/title IDs so multiple mounted instances remain independent.
    const prefix = `pc-${instance}-`;
    for (const element of svg.querySelectorAll('[id]')) {
      const id = element.id;
      element.id = prefix + id;
      for (const ref of svg.querySelectorAll('*')) {
        for (const attr of [...ref.attributes]) {
          if (attr.value.includes(`url(#${id})`)) ref.setAttribute(attr.name, attr.value.replaceAll(`url(#${id})`, `url(#${prefix}${id})`));
        }
      }
    }
    svg.setAttribute('aria-labelledby', `${prefix}plot-title ${prefix}plot-description`);
    svg.classList.add('pc-chart');
    root.innerHTML = `
      <div class="pc-topline">
        <span class="pc-eyebrow"><span class="pc-status-dot"></span>Trajectory, under the lens</span>
        <button type="button" class="pc-replay" aria-label="Replay entrance animation">${replayIcon}<span>Replay</span></button>
      </div>
      <div class="pc-controls-scroll">
        <div class="pc-method-track" role="group" aria-label="Highlight a comparison method">
          <span class="pc-method-indicator" aria-hidden="true"></span>
          <button type="button" class="pc-method" data-method-button="all" aria-pressed="true"><span class="pc-method-lift"><i class="pc-method-swatch"></i>All methods</span></button>
          ${config.methods.map(m => `<button type="button" class="pc-method" data-method-button="${m.id}" style="--method-color:${m.color}" aria-pressed="false"><span class="pc-method-lift"><i class="pc-method-swatch"></i>${m.label}</span></button>`).join('')}
        </div>
      </div>
      <div class="pc-selection-line"><span class="pc-selection" aria-live="polite" aria-atomic="true"><span class="pc-selection-name">All five methods</span><span class="pc-selection-mode">Overview</span></span><span class="pc-selection-help">Hover to compare · Click to keep in focus</span></div>
      <div class="pc-frames" aria-label="Annotated trajectory detail frames">
        ${config.frames.map((f, i) => `<button type="button" class="pc-frame" data-frame="${f.id}" aria-label="${f.label}, detail frame ${i + 1}" aria-pressed="false"><span class="pc-frame-label"><span class="pc-frame-number">0${i + 1}</span>${f.label}</span><span class="pc-frame-motion"><img class="pc-frame-image" src="${assetURL(f.id + '.svg')}" width="347" height="264" alt="${f.label} detail from the original robot trajectory" draggable="false"><span class="pc-frame-tooltip">${f.note}</span></span></button>`).join('')}
      </div>
      <div class="pc-chart-scroll" tabindex="0" role="region" aria-label="Progress curves. Scroll horizontally on narrow screens."></div>
      <div class="pc-bottomline"><span class="pc-hint">${pointerIcon}<span class="pc-desktop-hint">Explore a curve or gently move across a detail frame.</span><span class="pc-scroll-hint">Swipe the frames and chart to explore.</span></span><span>Original trajectory · Five progress estimators</span></div>`;
    root.querySelector('.pc-chart-scroll').append(svg);
    root.dataset.state = 'ready';
    indicator = root.querySelector('.pc-method-indicator');
    buttons = [...root.querySelectorAll('[data-method-button]')];
    curves = [...svg.querySelectorAll('.pc-series')];
    frames = [...root.querySelectorAll('[data-frame]')];
    root.style.setProperty('--pc-ink', config.colors.ink);
    root.style.setProperty('--pc-blue', config.colors.blue);
    root.querySelector('.pc-replay').addEventListener('click', () => api.replay(), { signal });
    for (const button of buttons) {
      const id = button.dataset.methodButton === 'all' ? null : button.dataset.methodButton;
      button.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        hovered = id; updateSelection(); pulse(button);
      }, { signal });
      button.addEventListener('pointerleave', () => { hovered = undefined; updateSelection(); }, { signal });
      button.addEventListener('focus', () => { hovered = undefined; focused = id; updateSelection(); }, { signal });
      button.addEventListener('blur', () => { focused = undefined; updateSelection(); }, { signal });
      button.addEventListener('click', () => {
        pinned = id;
        updateSelection(); emitSelection();
      }, { signal });
    }
    for (const curve of curves) {
      const hit = curve.querySelector('.pc-curve-hit');
      const id = curve.dataset.method;
      hit.addEventListener('pointerenter', event => {
        if (event.pointerType === 'touch') return;
        hovered = id; updateSelection();
      }, { signal });
      hit.addEventListener('pointerleave', () => { hovered = undefined; updateSelection(); }, { signal });
      hit.addEventListener('click', event => {
        event.stopPropagation(); pinned = pinned === id ? null : id; focused = undefined;
        updateSelection(); emitSelection();
      }, { signal });
    }
    for (const frame of frames) {
      const id = frame.dataset.frame;
      const spring = makeSpring(frame);
      springs.set(id, spring);
      frame.addEventListener('pointerenter', event => {
        if (event.pointerType !== 'touch') updateEvent(id);
      }, { signal });
      frame.addEventListener('pointerleave', () => { updateEvent(pinnedEvent); spring.release(); }, { signal });
      frame.addEventListener('pointermove', event => {
        if (event.pointerType === 'mouse' && !isReduced() && visible) spring.move(event);
      }, { signal });
      frame.addEventListener('focus', () => updateEvent(id), { signal });
      frame.addEventListener('blur', () => updateEvent(pinnedEvent), { signal });
      frame.addEventListener('click', () => { pinnedEvent = pinnedEvent === id ? null : id; updateEvent(pinnedEvent); }, { signal });
    }
    for (const hit of svg.querySelectorAll('[data-event-hit]')) {
      const id = hit.dataset.eventHit;
      hit.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') updateEvent(id); }, { signal });
      hit.addEventListener('pointerleave', () => updateEvent(pinnedEvent), { signal });
      hit.addEventListener('click', event => { event.stopPropagation(); pinnedEvent = pinnedEvent === id ? null : id; updateEvent(pinnedEvent); }, { signal });
    }
    svg.addEventListener('click', event => {
      if (event.target.closest('.pc-curve-hit, .pc-event-hit')) return;
      pinned = null; hovered = undefined; focused = undefined; pinnedEvent = null; updateEvent(null); updateSelection(); emitSelection();
    }, { signal });
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape') { pinned = null; hovered = undefined; focused = undefined; pinnedEvent = null; updateSelection(); updateEvent(null); emitSelection(); }
    }, { signal });
    document.addEventListener('visibilitychange', syncVisibility, { signal });
    motionQuery.addEventListener('change', updateMotionPreference, { signal });
    resizeObserver = new ResizeObserver(() => positionIndicator());
    resizeObserver.observe(root.querySelector('.pc-method-track'));
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (visible && !seen) { seen = true; pendingReplay = false; runEntrance(); }
      syncVisibility();
    }, { threshold: 0.08 });
    updateSelection(); updateMotionPreference();
    // Prevent a flash of the final artwork before the first viewport entrance.
    if (!isReduced()) prepareEntrance();
    observer.observe(root);
    return api;
  } catch (error) {
    if (destroyed || error.name === 'AbortError') return api;
    root.dataset.state = 'error';
    root.innerHTML = '<div class="pc-error" role="alert">The comparison could not load. Please reload this page.</div>';
    throw error;
  }

  function effectiveMethod() {
    if (hovered !== undefined) return hovered;
    if (focused !== undefined) return focused;
    return pinned;
  }
  function updateSelection() {
    if (!svg || destroyed) return;
    const id = effectiveMethod();
    const method = methods.get(id);
    root.dataset.selectedMethod = pinned ?? 'all';
    root.dataset.effectiveMethod = id ?? 'all';
    svg.dataset.hasFocus = String(Boolean(id));
    svg.dataset.focusMethod = id ?? 'all';
    for (const curve of curves) curve.dataset.active = String(curve.dataset.method === id);
    // Only move when the selected series changes: repeated pointer events stay stable.
    const active = curves.find(curve => curve.dataset.method === id);
    if (active && root.dataset.reveal !== 'playing' && active.parentNode.lastElementChild !== active) active.parentNode.append(active);
    for (const button of buttons) {
      const key = button.dataset.methodButton;
      button.setAttribute('aria-pressed', String(key === (pinned ?? 'all')));
      button.dataset.effective = String(key === (id ?? 'all'));
    }
    root.querySelector('.pc-selection-name').textContent = method?.label ?? 'All five methods';
    root.querySelector('.pc-selection-mode').textContent = id ? (id === pinned ? 'Pinned' : 'Preview') : 'Overview';
    root.querySelector('.pc-selection').style.setProperty('--selection-color', method?.color ?? '#8fa6c3');
    positionIndicator();
  }
  function emitSelection() {
    options.onSelect?.(pinned);
    container.dispatchEvent(new CustomEvent('progress-comparison:select', { detail: { method: pinned } }));
  }
  function positionIndicator() {
    if (!indicator || destroyed) return;
    const button = buttons.find(button => button.dataset.effective === 'true');
    if (!button) return;
    indicator.style.width = `${button.offsetWidth}px`;
    indicator.style.transform = `translateX(${button.offsetLeft}px)`;
  }
  function updateEvent(id) {
    if (!svg || destroyed) return;
    activeEvent = id;
    root.dataset.activeFrame = activeEvent ?? '';
    for (const frame of frames) {
      frame.dataset.active = String(frame.dataset.frame === id);
      frame.setAttribute('aria-pressed', String(frame.dataset.frame === pinnedEvent));
    }
    for (const event of svg.querySelectorAll('.pc-event')) event.dataset.active = String(event.dataset.event === id);
  }
  function pulse(button) {
    if (isReduced()) return;
    const inner = button.querySelector('.pc-method-lift');
    pulses.get(button)?.cancel();
    const animation = inner.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-3px) scale(1.045)', offset: .38 },
      { transform: 'translateY(-1px) scale(.99)', offset: .7 },
      { transform: 'translateY(-2px) scale(1)' },
    ], { duration: 520, easing: 'cubic-bezier(.2,.8,.3,1)' });
    pulses.set(button, animation);
    animation.onfinish = () => { if (pulses.get(button) === animation) pulses.delete(button); };
  }
  function cancelEntrance() {
    for (const animation of entrance) animation.cancel();
    entrance = [];
  }
  function revealTargets() { return [...frames, svg.querySelector('.pc-plot-foundation'), ...curves.map(c => c.querySelector('.pc-curve-line')), svg.querySelector('.pc-annotations'), svg.querySelector('.pc-timeline')]; }
  function prepareEntrance() {
    for (const element of revealTargets()) {
      if (element.classList.contains('pc-curve-line')) { element.style.strokeDasharray = '1'; element.style.strokeDashoffset = '1'; }
      else element.style.opacity = '0';
    }
  }
  function finishEntrance() {
    cancelEntrance();
    for (const element of revealTargets()) {
      element.style.removeProperty('opacity'); element.style.removeProperty('stroke-dasharray'); element.style.removeProperty('stroke-dashoffset');
    }
    root.dataset.reveal = 'complete';
    updateSelection();
  }
  function runEntrance() {
    if (destroyed) return;
    cancelEntrance();
    if (isReduced()) { finishEntrance(); return; }
    root.dataset.reveal = 'playing';
    prepareEntrance();
    const animate = (element, keyframes, timing) => {
      const animation = element.animate(keyframes, { fill: 'both', ...timing });
      entrance.push(animation); return animation;
    };
    const timing = config.reveal;
    for (const [i, frame] of frames.entries()) {
      animate(frame, [
        { opacity: 0, transform: 'translateY(-21px) scale(.9)' },
        { opacity: 1, transform: 'translateY(4px) scale(1.025)', offset: .65 },
        { opacity: 1, transform: 'translateY(-1px) scale(.995)', offset: .84 },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ], { duration: timing.duration, delay: i * timing.photoStagger, easing: 'cubic-bezier(.2,.75,.25,1)' });
    }
    animate(svg.querySelector('.pc-plot-foundation'), [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: timing.duration, delay: timing.plotDelay, easing: 'cubic-bezier(.16,1,.3,1)' });
    for (const [i, curve] of curves.entries()) {
      const line = curve.querySelector('.pc-curve-line');
      animate(line, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: timing.curveDuration, delay: timing.curveDelay + i * timing.curveStagger, easing: 'cubic-bezier(.42,0,.2,1)' });
    }
    animate(svg.querySelector('.pc-annotations'), [{ opacity: 0 }, { opacity: 1 }], { duration: 650, delay: timing.annotationDelay });
    animate(svg.querySelector('.pc-timeline'), [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 700, delay: timing.timelineDelay, easing: 'cubic-bezier(.16,1,.3,1)' });
    const current = entrance;
    for (const animation of current) animation.onfinish = () => {
      if (!destroyed && entrance === current && current.every(item => item.playState === 'finished')) finishEntrance();
    };
    syncVisibility();
  }
  function updateMotionPreference() {
    if (!svg || destroyed) return;
    root.dataset.reducedMotion = String(isReduced());
    if (isReduced()) {
      finishEntrance();
      for (const spring of springs.values()) spring.stop();
      for (const animation of pulses.values()) animation.cancel();
      pulses.clear();
    }
  }
  function syncVisibility() {
    if (destroyed) return;
    const running = visible && !document.hidden;
    root.dataset.visible = String(running);
    if (running && pendingReplay) { pendingReplay = false; runEntrance(); return; }
    for (const animation of entrance) {
      if (animation.playState === 'finished' || animation.playState === 'idle') continue;
      if (running) animation.play(); else animation.pause();
    }
    if (!running) {
      for (const spring of springs.values()) spring.stop();
      for (const animation of pulses.values()) animation.cancel();
      pulses.clear();
    }
  }
  function makeSpring(frame) {
    const inner = frame.querySelector('.pc-frame-motion');
    let x = 0, y = 0, vx = 0, vy = 0, tx = 0, ty = 0, raf = 0, previous = 0;
    const clamp = value => Math.max(-1, Math.min(1, value));
    const tick = now => {
      const dt = Math.min(2, previous ? (now - previous) / 16.667 : 1); previous = now;
      vx = (vx + (tx - x) * .095 * dt) * Math.pow(.76, dt);
      vy = (vy + (ty - y) * .095 * dt) * Math.pow(.76, dt);
      x += vx * dt; y += vy * dt;
      inner.style.transform = `perspective(650px) translate3d(${(x * 3).toFixed(3)}px,${(y * 2).toFixed(3)}px,0) rotateX(${(-y * 5).toFixed(3)}deg) rotateY(${(x * 6).toFixed(3)}deg) rotateZ(${(x * .75).toFixed(3)}deg)`;
      frame.dataset.moving = 'true';
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(vx) + Math.abs(vy) < .0015) {
        raf = 0; previous = 0; frame.dataset.moving = 'false';
        if (tx === 0 && ty === 0) inner.style.removeProperty('transform');
      } else raf = requestAnimationFrame(tick);
    };
    const start = () => { if (!raf) raf = requestAnimationFrame(tick); };
    return {
      move(event) {
        const box = frame.getBoundingClientRect();
        const nextX = clamp((event.clientX - box.left) / box.width * 2 - 1);
        const nextY = clamp((event.clientY - box.top) / box.height * 2 - 1);
        vx += clamp(nextX - tx) * .035; vy += clamp(nextY - ty) * .035;
        tx = nextX; ty = nextY; start();
      },
      release() { tx = ty = 0; if (!isReduced() && visible && !document.hidden) start(); },
      stop() { cancelAnimationFrame(raf); raf = 0; previous = 0; tx = ty = x = y = vx = vy = 0; inner.style.removeProperty('transform'); frame.dataset.moving = 'false'; },
    };
  }
}

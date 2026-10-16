const section = document.querySelector('[data-state-progress]');
if (section) mount(section);

async function mount(section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = section.querySelector('[data-sp-toggle]');
  let paused = false;
  let visible = false;
  const svgs = [];

  function updateMotion() {
    section.dataset.spRunning = String(visible && !paused && !reduced.matches && !document.hidden);
    section.dataset.spReduced = String(reduced.matches);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume state-to-progress motion' : 'Pause state-to-progress motion');
    toggle.title = paused ? 'Resume motion' : 'Pause motion';
  }
  toggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
  document.addEventListener('visibilitychange', updateMotion);
  reduced.addEventListener('change', updateMotion);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    updateMotion();
  }, {threshold: .08}).observe(section);
  updateMotion();

  const viewport = section.querySelector('.sp-viewport');
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      viewport.scrollBy({left: (event.key === 'ArrowRight' ? 1 : -1) * viewport.clientWidth * .9, behavior: reduced.matches ? 'auto' : 'smooth'});
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      viewport.scrollTo({left: event.key === 'Home' ? 0 : viewport.scrollWidth, behavior: reduced.matches ? 'auto' : 'smooth'});
    }
  });

  function clearFocus(svg) {
    svg.querySelectorAll('.is-focused').forEach(part => part.classList.remove('is-focused'));
    svg.classList.remove('has-focus');
    delete svg.dataset.spFocus;
  }
  function focusPart(svg, part) {
    if (svg.dataset.spFocus === part?.dataset.spPart) return;
    clearFocus(svg);
    if (!part) return;
    part.classList.add('is-focused');
    svg.classList.add('has-focus');
    svg.dataset.spFocus = part.dataset.spPart;
  }
  function wireParts(svg) {
    const parts = [...svg.querySelectorAll('[data-sp-part]')].map(part => {
      const [x, y, width, height] = part.dataset.bounds.split(' ').map(Number);
      return {part, x, y, width, height, area: width * height};
    }).sort((a, b) => a.area - b.area);
    // Hit testing uses the original SVG coordinates, never the lifted bounds.
    // This prevents one active part from covering its neighbors' hover regions.
    svg.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
      const hit = parts.find(({x,y,width,height}) => p.x >= x - 2 && p.x <= x + width + 2 && p.y >= y - 2 && p.y <= y + height + 2);
      focusPart(svg, hit?.part);
    });
    svg.addEventListener('pointerleave', () => clearFocus(svg));
    svg.addEventListener('focusin', event => focusPart(svg, event.target.closest('[data-sp-part]')));
    svg.addEventListener('focusout', () => clearFocus(svg));
    svg.addEventListener('keydown', event => {
      if (event.key === 'Escape') { clearFocus(svg); event.target.blur(); }
    });
  }

  const results = await Promise.allSettled([...section.querySelectorAll('[data-sp-figure]')].map(async host => {
    const response = await fetch(host.dataset.svg);
    if (!response.ok) throw new Error(`State diagram: HTTP ${response.status}`);
    const document = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
    if (document.querySelector('parsererror')) throw new Error('State diagram SVG is invalid.');
    const svg = window.document.importNode(document.documentElement, true);
    host.append(svg);
    wireParts(svg);
    svgs.push(svg);
    host.classList.add('is-ready');
  }));
  for (const result of results) if (result.status === 'rejected') console.warn(result.reason);

  section.querySelector('[data-sp-replay]').addEventListener('click', () => {
    svgs.forEach(clearFocus);
    for (const svg of svgs) for (const animation of svg.getAnimations({subtree: true})) animation.currentTime = 0;
    paused = false;
    updateMotion();
  });
  section.dataset.spReady = String(results.every(result => result.status === 'fulfilled'));
}

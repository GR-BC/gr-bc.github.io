const section = document.querySelector('[data-state-progress]');
if (section) mount(section);

async function mount(section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = section.querySelector('[data-sp-toggle]');
  const replay = section.querySelector('[data-sp-replay]');
  const stage = section.querySelector('[data-sp-stage]');
  const detail = section.querySelector('.sp-case-detail .sp-art');
  const transfer = section.querySelector('[data-sp-transfer]');
  const link = section.querySelector('[data-sp-link]');
  const line = section.querySelector('[data-sp-link-line]');
  const flow = section.querySelector('[data-sp-link-flow]');
  const svgs = [];
  let paused = false;
  let visible = false;
  let ready = false;
  let started = false;
  let scene = [];
  let generation = 0;
  let lastSize = '';

  const running = () => visible && !paused && !reduced.matches && !document.hidden;

  function finishScene() {
    generation++;
    scene.forEach(animation => animation.cancel());
    scene = [];
    section.dataset.spIntro = 'complete';
  }

  function updateMotion() {
    section.dataset.spRunning = String(running());
    section.dataset.spReduced = String(reduced.matches);
    toggle.disabled = reduced.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume state-to-progress motion' : 'Pause state-to-progress motion');
    toggle.title = reduced.matches ? 'Reduced motion enabled' : paused ? 'Resume motion' : 'Pause motion';
    if (reduced.matches) {
      finishScene();
    } else {
      for (const animation of scene) {
        if (running() && animation.playState === 'paused') animation.play();
        else if (!running() && animation.playState === 'running') animation.pause();
      }
    }
    if (ready && visible && !started) {
      started = true;
      if (reduced.matches) finishScene();
      else playScene(true);
    }
  }

  toggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
  document.addEventListener('visibilitychange', updateMotion);
  reduced.addEventListener('change', updateMotion);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .14;
    updateMotion();
  }, {threshold:.14}).observe(section);
  updateMotion();

  function clearFocus(svg) {
    svg.querySelectorAll('.is-focused').forEach(part => part.classList.remove('is-focused'));
    svg.classList.remove('has-focus');
    delete svg.dataset.spFocus;
    if (svg.classList.contains('sp-frame-26')) delete section.dataset.spNodeFocus;
  }

  function focusPart(svg, part) {
    if (svg.dataset.spFocus === part?.dataset.spPart) return;
    clearFocus(svg);
    if (!part) return;
    part.classList.add('is-focused');
    svg.classList.add('has-focus');
    svg.dataset.spFocus = part.dataset.spPart;
    if (svg.classList.contains('sp-frame-26')) section.dataset.spNodeFocus = String(part.dataset.spPart === 'node');
  }

  function wireParts(svg) {
    const parts = [...svg.querySelectorAll('[data-sp-part]')].map(part => {
      const [x,y,width,height] = part.dataset.bounds.split(' ').map(Number);
      return {part,x,y,width,height,area:width * height};
    }).sort((a,b) => a.area - b.area);
    // Fixed source-space regions are independent of hover and reveal transforms.
    svg.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse') return;
      const matrix = svg.getScreenCTM();
      if (!matrix) return;
      const p = new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());
      const hit = parts.find(({x,y,width,height}) => p.x >= x - 2 && p.x <= x + width + 2 && p.y >= y - 2 && p.y <= y + height + 2);
      if (hit && section.dataset.spIntro === 'playing') finishScene();
      focusPart(svg,hit?.part);
    });
    svg.addEventListener('pointerleave', () => clearFocus(svg));
    svg.addEventListener('focusin', event => {
      if (section.dataset.spIntro === 'playing') finishScene();
      focusPart(svg,event.target.closest('[data-sp-part]'));
    });
    svg.addEventListener('focusout', () => clearFocus(svg));
    svg.addEventListener('keydown', event => {
      if (event.key === 'Escape') { clearFocus(svg); event.target.blur(); }
    });
    const node = svg.querySelector('[data-sp-part="node"]');
    if (node) {
      node.setAttribute('role','button');
      node.setAttribute('aria-label','Magnify the graph node and reveal its connections');
      node.addEventListener('click', () => playScene(false));
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); playScene(false); }
      });
    }
  }

  const results = await Promise.allSettled([...section.querySelectorAll('[data-sp-figure]')].map(async host => {
    const response = await fetch(host.dataset.svg);
    if (!response.ok) throw new Error(`State diagram: HTTP ${response.status}`);
    const parsed = new DOMParser().parseFromString(await response.text(),'image/svg+xml');
    if (parsed.querySelector('parsererror')) throw new Error('State diagram SVG is invalid.');
    const svg = document.importNode(parsed.documentElement,true);
    host.append(svg);
    wireParts(svg);
    svgs.push(svg);
    host.classList.add('is-ready');
  }));
  for (const result of results) if (result.status === 'rejected') console.warn(result.reason);
  ready = results.every(result => result.status === 'fulfilled');
  section.dataset.spReady = String(ready);
  replay.disabled = !ready;
  if (!ready) return;

  const encoding = section.querySelector('.sp-frame-26');
  const connections = section.querySelector('.sp-frame-23');
  const node = encoding.querySelector('[data-sp-part="node"]');
  const miniature = encoding.querySelector('.sp-node-miniature');

  // Map source geometry through the root CTM, excluding any lifted child part.
  function sourceRect(x,y,width,height) {
    const matrix = encoding.getScreenCTM();
    const a = new DOMPoint(x,y).matrixTransform(matrix);
    const b = new DOMPoint(x + width,y + height).matrixTransform(matrix);
    return {left:a.x,top:a.y,right:b.x,bottom:b.y,width:b.x-a.x,height:b.y-a.y};
  }

  function measure() {
    const base = stage.getBoundingClientRect();
    const small = sourceRect(...['x','y','width','height'].map(key => Number(miniature.getAttribute(key))));
    const tile = sourceRect(...node.dataset.bounds.split(' ').map(Number));
    const large = connections.getBoundingClientRect();
    const relative = r => ({x:r.left-base.left,y:r.top-base.top,width:r.width,height:r.height});
    const mini = relative(small);
    const target = relative(large);
    const stacked = matchMedia('(max-width: 760px)').matches;
    const sx = tile.right - base.left + 5;
    const sy = mini.y + mini.height / 2;
    const ex = stacked ? target.x + target.width * .72 : target.x - 13;
    const ey = stacked ? target.y - 8 : target.y + target.height / 2;
    const bend = Math.max(15,(ex-sx)*.36);
    const path = stacked
      ? `M${sx} ${sy}C${base.width-6} ${sy+35} ${base.width-6} ${ey-8} ${ex} ${ey}`
      : `M${sx} ${sy}C${sx+bend} ${sy} ${ex-bend} ${ey} ${ex} ${ey}`;
    link.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);
    line.setAttribute('d',path);
    flow.setAttribute('d',path);
    section.querySelector('[data-sp-link-source]').setAttribute('cx',sx);
    section.querySelector('[data-sp-link-source]').setAttribute('cy',sy);
    section.querySelector('[data-sp-link-lens]').setAttribute('transform',`translate(${(sx+ex)/2} ${(sy+ey)/2})`);
    transfer.style.width = `${target.width}px`;
    transfer.style.height = `${target.height}px`;
    lastSize = `${base.width.toFixed(1)} ${base.height.toFixed(1)}`;
    return {mini,target};
  }

  function animate(element,keyframes,delay,duration,easing='cubic-bezier(.22,.75,.18,1)') {
    const animation = element.animate(keyframes,{duration,delay,easing,fill:'backwards'});
    scene.push(animation);
    if (!running()) animation.pause();
    return animation;
  }

  function reveal(element,delay,duration=420,slide=0) {
    return animate(element,[{opacity:0,transform:`translateX(${slide}px)`},{opacity:1,transform:'translateX(0)'}],delay,duration);
  }

  function playScene(full) {
    if (!ready) return;
    svgs.forEach(clearFocus);
    finishScene();
    if (reduced.matches) return;
    started = true;
    paused = false;
    const {mini,target} = measure();
    const token = generation;
    section.dataset.spIntro = 'playing';
    section.dataset.spScene = full ? 'encode-and-magnify' : 'magnify';
    if (full) {
      reveal(encoding.parentElement,0,160);
      const delays = {'views':0,'camera-1':40,'camera-2':90,'camera-3':140,'gripper':120,'encoder':290,'grip-filter':480,'features':560,'feature-1':620,'feature-2':700,'feature-3':780,'merge':820,'node':1010};
      encoding.querySelectorAll('[data-sp-part]').forEach(part => reveal(part,delays[part.dataset.spPart] ?? 500,440,-12));
      const arrowDelays = {'5':260,'6':260,'7':310,'8':310,'9':360,'10':360,'11':580,'12':580,'13':660,'14':660,'15':740,'16':740,'38':420,'39':420};
      for (const [source,delay] of Object.entries(arrowDelays)) {
        const element = encoding.querySelector(`[data-source="${source}"]`);
        if (element) animate(element,[{opacity:0},{opacity:1}],delay,300);
      }
    }
    const pulseAt = full ? 1120 : 0;
    animate(node,[{filter:'drop-shadow(0 0 0 #7bafd000)'},{filter:'drop-shadow(0 0 12px #79aacf88)'},{filter:'drop-shadow(0 0 0 #7bafd000)'}],pulseAt,700);
    const linkAt = full ? 1180 : 80;
    const length = line.getTotalLength();
    animate(link,[{opacity:0},{opacity:.85}],linkAt,450);
    animate(line,[{strokeDasharray:`${length}`,strokeDashoffset:length},{strokeDasharray:`${length}`,strokeDashoffset:0}],linkAt,650);
    const start = `translate(${mini.x}px,${mini.y}px) scale(${mini.width/target.width},${mini.height/target.height})`;
    const end = `translate(${target.x}px,${target.y}px) scale(1)`;
    animate(transfer,[
      {offset:0,transform:start,opacity:0,filter:'blur(0px)'},
      {offset:.1,transform:start,opacity:.95,filter:'blur(0px)'},
      {offset:.77,transform:end,opacity:1,filter:'blur(0px)'},
      {offset:1,transform:end,opacity:0,filter:'blur(0px)'},
    ],full ? 1450 : 250,1100,'cubic-bezier(.32,.05,.15,1)');
    animate(detail,[{opacity:0,transform:'scale(.94)'},{opacity:1,transform:'scale(1)'}],full ? 1980 : 760,550);
    const order = {'neighborhood-i':0,'neighborhood-j':0,'before-i':80,'after-i':80,'before-j':80,'after-j':80,'state-i':130,'state-j':130,'cross-distance':220,'distance':300,'scale-i':300,'scale-j':300};
    connections.querySelectorAll('[data-sp-part]').forEach(part => animate(part,[{opacity:0},{opacity:1}],(full ? 2050 : 820) + (order[part.dataset.spPart] ?? 0),380));
    const completion = animate(section.querySelector('.sp-retrieval'),[{opacity:full ? 0 : 1},{opacity:1}],full ? 2650 : 1400,full ? 350 : 150);
    completion.finished.then(() => {
      if (token === generation) section.dataset.spIntro = 'complete';
    }).catch(() => {});
    updateMotion();
  }

  measure();
  new ResizeObserver(() => {
    const rect = stage.getBoundingClientRect();
    const size = `${rect.width.toFixed(1)} ${rect.height.toFixed(1)}`;
    if (size !== lastSize) {
      finishScene();
      measure();
    }
  }).observe(stage);
  replay.addEventListener('click', () => playScene(true));
  section.dataset.spIntro = 'waiting';
  updateMotion();
}

const section = document.querySelector('[data-state-progress]');
if (section) mount(section);

async function mount(section) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = section.querySelector('[data-sp-toggle]');
  const replay = section.querySelector('[data-sp-replay]');
  const stage = section.querySelector('[data-sp-stage]');
  const detail = section.querySelector('.sp-case-detail .sp-art');
  const packet = section.querySelector('[data-sp-packet]');
  const packetRoute = section.querySelector('[data-sp-packet-route]');
  const link = section.querySelector('[data-sp-link]');
  const line = section.querySelector('[data-sp-link-line]');
  const flow = section.querySelector('[data-sp-link-flow]');
  const formula = section.querySelector('.sp-formula');
  const svgs = [];
  let paused = false;
  let visible = false;
  let ready = false;
  let started = false;
  let detailVisible = false;
  let detailSeen = false;
  let formulaVisible = false;
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
    section.dataset.spFormulaRunning = String((visible || formulaVisible) && !paused && !reduced.matches && !document.hidden);
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
      detailSeen = detailVisible;
      if (reduced.matches) finishScene();
      else playScene(true);
    } else if (ready && visible && started && detailVisible && !detailSeen && matchMedia('(max-width:760px)').matches) {
      detailSeen = true;
      playScene(false);
    }
  }

  toggle.addEventListener('click', () => { paused = !paused; updateMotion(); });
  document.addEventListener('visibilitychange', updateMotion);
  reduced.addEventListener('change', updateMotion);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .28;
    updateMotion();
  }, {threshold:.28}).observe(stage);
  new IntersectionObserver(entries => {
    detailVisible = entries[0].isIntersecting && entries[0].intersectionRatio >= .25;
    if (detailVisible && !matchMedia('(max-width:760px)').matches) detailSeen = true;
    updateMotion();
  }, {threshold:.25}).observe(detail);
  new IntersectionObserver(entries => {
    formulaVisible = entries[0].isIntersecting;
    updateMotion();
  }, {threshold:0}).observe(formula);
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
    if (svg.classList.contains('sp-frame-23')) {
      const family = part.dataset.spPart.match(/^(?:state|neighborhood)-(i|j)$/)?.[1];
      if (family) for (const name of [`state-${family}`,`neighborhood-${family}`]) {
        svg.querySelector(`[data-sp-part="${name}"]`).classList.add('is-focused');
      }
    }
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
      if (section.dataset.spIntro === 'playing') return;
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
      node.setAttribute('aria-label','Build the connections from this graph node');
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
  const sourcePoint = encoding.querySelector('[data-source="2-7"]');
  const targetPoint = connections.querySelector('[data-source="12"]');

  // Map source geometry through the root CTM, excluding any lifted child part.
  function sourceRect(svg,x,y,width,height) {
    const matrix = svg.getScreenCTM();
    const a = new DOMPoint(x,y).matrixTransform(matrix);
    const b = new DOMPoint(x + width,y + height).matrixTransform(matrix);
    return {left:a.x,top:a.y,right:b.x,bottom:b.y,width:b.x-a.x,height:b.y-a.y};
  }

  function measure() {
    const base = stage.getBoundingClientRect();
    const small = sourceRect(encoding,Number(sourcePoint.getAttribute('cx')),Number(sourcePoint.getAttribute('cy')),0,0);
    const tile = sourceRect(encoding,...node.dataset.bounds.split(' ').map(Number));
    const large = connections.getBoundingClientRect();
    const destination = sourceRect(connections,Number(targetPoint.getAttribute('cx')),Number(targetPoint.getAttribute('cy')),0,0);
    const relative = r => ({x:r.left-base.left,y:r.top-base.top,width:r.width,height:r.height});
    const origin = relative(small);
    const goal = relative(destination);
    const target = relative(large);
    const stacked = matchMedia('(max-width: 760px)').matches;
    const sx = tile.right - base.left + 5;
    const sy = origin.y;
    const ex = stacked ? target.x + target.width * .72 : target.x - 13;
    const ey = stacked ? target.y - 8 : goal.y;
    const bend = Math.max(15,(ex-sx)*.36);
    const path = stacked
      ? `M${sx} ${sy}C${base.width-6} ${sy+35} ${base.width-6} ${ey-8} ${ex} ${ey}`
      : `M${sx} ${sy}C${sx+bend} ${sy} ${ex-bend} ${ey} ${ex} ${ey}`;
    link.setAttribute('viewBox',`0 0 ${base.width} ${base.height}`);
    line.setAttribute('d',path);
    flow.setAttribute('d',path);
    section.querySelector('[data-sp-link-source]').setAttribute('cx',sx);
    section.querySelector('[data-sp-link-source]').setAttribute('cy',sy);
    packetRoute.setAttribute('d', stacked
      ? `M${origin.x} ${origin.y}C${base.width-8} ${origin.y} ${base.width-8} ${goal.y} ${goal.x} ${goal.y}`
      : `M${origin.x} ${origin.y}C${origin.x+70} ${origin.y} ${goal.x-100} ${goal.y} ${goal.x} ${goal.y}`);
    lastSize = `${base.width.toFixed(1)} ${base.height.toFixed(1)}`;
    return {origin,goal};
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
    measure();
    const token = generation;
    section.dataset.spIntro = 'playing';
    section.dataset.spScene = full ? 'encode-and-connect' : 'connect';
    if (full) {
      reveal(encoding.parentElement,0,160);
      const delays = {'views':0,'camera-1':20,'camera-2':60,'camera-3':100,'gripper':80,'encoder':170,'grip-filter':290,'features':350,'feature-1':400,'feature-2':460,'feature-3':520,'merge':520,'node':660};
      encoding.querySelectorAll('[data-sp-part]').forEach(part => reveal(part,delays[part.dataset.spPart] ?? 300,360,-16));
      const arrowDelays = {'5':160,'6':160,'7':210,'8':210,'9':260,'10':260,'11':360,'12':360,'13':420,'14':420,'15':480,'16':480,'38':270,'39':270};
      for (const [source,delay] of Object.entries(arrowDelays)) {
        const element = encoding.querySelector(`[data-source="${source}"]`);
        if (element) animate(element,[{opacity:0},{opacity:1}],delay,300);
      }
    }
    const pulseAt = full ? 760 : 0;
    animate(node,[{filter:'drop-shadow(0 0 0 #7bafd000)'},{filter:'drop-shadow(0 0 12px #79aacf88)'},{filter:'drop-shadow(0 0 0 #7bafd000)'}],pulseAt,700);
    const linkAt = full ? 780 : 40;
    const length = line.getTotalLength();
    animate(link,[{opacity:0},{opacity:.85}],linkAt,450);
    animate(line,[{strokeDasharray:`${length}`,strokeDashoffset:length},{strokeDasharray:`${length}`,strokeDashoffset:0}],linkAt,650);
    const travelLength = packetRoute.getTotalLength();
    const travel = Array.from({length:33}, (_,i) => {
      const progress = i/32;
      const p = packetRoute.getPointAtLength(travelLength * progress);
      return {offset:progress,transform:`translate(${p.x}px,${p.y}px) scale(${.8 + progress*.5})`,opacity:i===0||i===32 ? 0 : Math.min(1,i/3,(32-i)/4)};
    });
    animate(packet,travel,full ? 880 : 60,650,'cubic-bezier(.28,.08,.2,1)');

    const rightAt = full ? 1390 : 500;
    animate(detail,[{opacity:0},{opacity:1}],rightAt-160,220);
    const order = {'state-i':0,'before-i':90,'after-i':90,'neighborhood-i':150,'cross-distance':300,'state-j':380,'before-j':470,'after-j':470,'neighborhood-j':550,'distance':720,'scale-i':650,'scale-j':720};
    connections.querySelectorAll('[data-sp-part]').forEach(part => {
      const neighborhood = part.dataset.spPart.startsWith('neighborhood') || part.dataset.spPart === 'cross-distance';
      animate(part,[
        {opacity:0,transform:`translateY(${neighborhood ? 0 : 9}px) scale(${neighborhood ? .48 : .78})`},
        {offset:.75,opacity:1,transform:`translateY(0) scale(${neighborhood ? 1.035 : 1.025})`},
        {opacity:1,transform:'translateY(0) scale(1)'},
      ],rightAt+(order[part.dataset.spPart]??0),neighborhood ? 560 : 380,'cubic-bezier(.18,.8,.25,1)');
    });
    for (const [source,offset] of [['8',70],['24',460]]) {
      const path = connections.querySelector(`[data-source="${source}"]`);
      const distance = path.getTotalLength();
      animate(path,[{strokeDasharray:`${distance}`,strokeDashoffset:distance,opacity:0},{strokeDasharray:`${distance}`,strokeDashoffset:0,opacity:1}],rightAt+offset,470);
    }
    connections.querySelectorAll('.sp-trajectory-flow').forEach((path,i) => reveal(path,rightAt+(i?460:70),350));
    for (const [source,offset] of [['14',350],['15',770],['80',360],['81',310],['82',790]]) {
      const path = connections.querySelector(`[data-source="${source}"]`);
      if (path) animate(path,[{opacity:0},{opacity:source==='80'||source==='81'||source==='82' ? .85 : 1}],rightAt+offset,300);
    }
    connections.querySelectorAll('.sp-arrow-pulse').forEach((path,i) => reveal(path,rightAt+300+i*140,380));
    animate(formula,[{opacity:0,transform:'translateY(6px) scale(.98)'},{opacity:1,transform:'translateY(0) scale(1)'}],full ? 2150 : 1280,350);
    const completion = animate(section.querySelector('.sp-retrieval'),[{opacity:full ? 0 : 1},{opacity:1}],full ? 2150 : 1490,full ? 350 : 150);
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

(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const enterSelector = [
    '.wordmark', '.desktop-nav', '.header-paper',
    '.hero-copy > .conference-badge', '.hero-copy > h1', '.author-row', '.affiliations > p',
    '.hero-actions', '.hero-data',
    '.section-intro > div:first-child', '.trajectory-intro > div:first-child', '.results-heading > div:first-child',
    '.demo-theatre', '.motivation-case', '.pipeline-figure',
    '.sp-heading', '.sp-grid', '.sp-retrieval', '.sp-footer',
    '.wl-heading', '.wl-case', '.wl-footer',
    '.rack-eyebrow', '.rack-stage', '.rack-card', '.collection-expand', '.rack-hint',
    '.collection-toolbar', '.trajectory-index', '.trajectory-header', '.camera-deck', '.signal-panel',
    '.trajectory-transport', '.dip-toggle', '.dip-selector', '.dip-copy', '.dip-keyframes', '.trajectory-method-note',
    '.homepage-module', '.em-toolbar', '.em-legend-help', '.em-task', '.em-caption',
    '.ec-heading', '.ec-scroll', '.ablation > summary', '.ablation-grid > div', '.ablation > p',
    '.robustness-heading > div:first-child', '.robust-rack-heading-side', '.robust-rack-item', '.robust-rack-bottom',
    '.citation-box', '.site-footer > div',
  ].join(',');
  const typeSelector = [
    '.hero-deck', '.section-intro > p', '.section-intro > div:last-child:not(:first-child) > p',
    '.trajectory-intro > p', '.results-heading > p', '.robust-rack-heading-side > p',
    '.sp-case > figcaption', '.sp-retrieval-copy > p', '.pipeline-insight-panel > p',
    '.em-intro > p', '.dip-copy > p',
  ].join(',');
  const fadeSelector = '.pipeline-figure,.sp-grid,.homepage-module,.rack-card,.robust-rack-item,.ec-scroll';
  const interactionScope = '.trajectory-collection,.pipeline-figure,[data-state-progress],[data-weight-lab],[data-task-curtain],.grbc-experiments,.pc-comparison,[data-robustness-rack]';
  const entrances = new Map();
  const copies = new Map();
  const seenCopy = new Set();
  const morphedCollections = new WeakSet();
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(document.documentElement.lang || 'en',{granularity:'grapheme'}) : null;
  let frame = 0;
  let previousTime = 0;
  let scanFrame = 0;

  function exposed(element) {
    if (!element.isConnected || element.namespaceURI !== 'http://www.w3.org/1999/xhtml') return false;
    if (element.closest('[hidden],[inert],[aria-hidden="true"],.is-transitioning,.rack-ghost,.collection-morph-card')) return false;
    const closed = element.closest('details:not([open])');
    if (closed && !closed.querySelector(':scope > summary')?.contains(element)) return false;
    return element.getClientRects().length > 0;
  }

  function finishEntrance(record) {
    record.animation?.cancel();
    record.animation = null;
    record.element.dataset.pageEnter = 'done';
    enterObserver.unobserve(record.element);
  }

  function startEntrance(record) {
    const element = record.element;
    if (element.dataset.pageEnter !== 'waiting' || !exposed(element)) return;
    if (reduced.matches || typeof element.animate !== 'function') { finishEntrance(record); return; }
    element.dataset.pageEnter = 'playing';
    const frames = record.fade ? [{opacity:0},{opacity:1}] : [{opacity:0,translate:'0 20px'},{opacity:1,translate:'0 0'}];
    record.animation = element.animate(frames,{
      duration:650,delay:record.delay,fill:'backwards',easing:'cubic-bezier(.18,.72,.2,1)',
    });
    record.animation.finished.then(() => finishEntrance(record)).catch(() => {});
    enterObserver.unobserve(element);
  }

  const enterObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = entrances.get(entry.target);
      if (!record) continue;
      record.intersects = entry.isIntersecting;
      if (record.intersects) startEntrance(record);
    }
  },{threshold:0,rootMargin:'0px 0px -5% 0px'});

  function registerEntrance(element) {
    if (entrances.has(element) || !exposed(element)) return;
    const siblings = [...element.parentElement.children].filter(node => node.matches(enterSelector));
    const heroOrder = [...document.querySelectorAll('.hero-copy .conference-badge,.hero-copy h1,.hero-copy .author-row,.hero-copy .affiliations p,.hero-actions,.hero-data')];
    const order = element.closest('.hero-copy') ? heroOrder.indexOf(element) : siblings.indexOf(element);
    const record = {element,fade:element.matches(fadeSelector),delay:Math.min(Math.max(0,order),4)*65,animation:null,intersects:false};
    entrances.set(element,record);
    element.dataset.pageEnterMode = record.fade ? 'fade' : 'lift';
    element.dataset.pageEnter = 'waiting';
    const collection = element.closest('.trajectory-collection');
    const alreadyMorphed = element.closest('.collection-open') && morphedCollections.has(collection) && element.matches('.collection-toolbar,.trajectory-index,.trajectory-header,.camera-deck,.signal-panel,.dip-toggle,.trajectory-method-note');
    if (alreadyMorphed) element.dataset.pageEnterMode = 'owned';
    if (reduced.matches || alreadyMorphed) finishEntrance(record);
    else enterObserver.observe(element);
  }

  function finishCopy(record) {
    record.element.style.removeProperty('clip-path');
    record.element.dataset.typeState = 'done';
    record.element.dataset.typeCount = String(record.plan?.length || record.element.dataset.typeTotal || 0);
    record.caret?.remove();
    record.caret = null;
    record.plan = null;
    typeObserver.unobserve(record.element);
    copyResize.unobserve(record.element);
  }

  // Character ranges preserve the original text, inline markup, kerning, and
  // final paragraph dimensions. No per-letter spans or duplicate accessible copy.
  function planCopy(record) {
    const element = record.element;
    const base = element.getBoundingClientRect();
    const walker = document.createTreeWalker(element,NodeFilter.SHOW_TEXT,{
      acceptNode:node => node.parentElement.closest('.pm-type-caret') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const range = document.createRange();
    const plan = [];
    let node;
    let weight = 0;
    while ((node = walker.nextNode())) {
      let offset = 0;
      const pieces = segmenter ? [...segmenter.segment(node.data)] : Array.from(node.data,segment => {const item={segment,index:offset};offset+=segment.length;return item;});
      for (const {segment,index} of pieces) {
        range.setStart(node,index);
        range.setEnd(node,index+segment.length);
        const rect = range.getBoundingClientRect();
        if (rect.width < .1 || rect.height < 1) continue;
        weight += /[.!?;:]/.test(segment) ? 3 : /\s/.test(segment) ? .5 : 1;
        plan.push({x:Math.min(base.width,rect.right-base.left+3),top:Math.max(0,rect.top-base.top-2),
          bottom:Math.min(base.height,rect.bottom-base.top+3),height:rect.height,weight});
      }
    }
    range.detach();
    record.plan = plan;
    record.weight = weight;
    record.duration = Math.min(2350,Math.max(850,650+plan.length*5.5));
    record.element.dataset.typeTotal = String(plan.length);
    record.dirty = false;
    record.index = -1;
  }

  function startCopy(record) {
    if (!record || !exposed(record.element)) return;
    if (record.element.dataset.typeState === 'waiting') {
      if (reduced.matches || seenCopy.has(record.signature)) { finishCopy(record); return; }
      seenCopy.add(record.signature);
      record.element.dataset.typeState = 'typing';
      record.elapsed = -140;
      record.dirty = true;
      const caret = document.createElement('span');
      caret.className = 'pm-type-caret';
      caret.setAttribute('aria-hidden','true');
      record.element.append(caret);
      record.caret = caret;
      record.element.style.clipPath = 'inset(0 100% 100% 0)';
    }
    requestTyping();
  }

  function requestTyping() {
    if (!frame && !document.hidden && [...copies.values()].some(record => record.visible && record.element.dataset.typeState === 'typing' && exposed(record.element))) {
      previousTime = 0;
      frame = requestAnimationFrame(typeFrame);
    }
  }

  function typeFrame(time) {
    frame = 0;
    const delta = previousTime ? Math.min(70,time-previousTime) : 0;
    previousTime = time;
    let more = false;
    for (const record of copies.values()) {
      if (record.element.dataset.typeState !== 'typing' || !record.visible || !exposed(record.element)) continue;
      if (reduced.matches) { finishCopy(record); continue; }
      if (record.dirty) planCopy(record);
      if (!record.plan.length) { finishCopy(record); continue; }
      record.elapsed += delta;
      const fraction = Math.max(0,record.elapsed)/record.duration;
      if (fraction >= 1) { finishCopy(record); continue; }
      more = true;
      const progress = fraction*record.weight;
      let lo=0,hi=record.plan.length-1;
      while (lo < hi) { const mid=(lo+hi)>>1; if (record.plan[mid].weight < progress) lo=mid+1; else hi=mid; }
      if (record.elapsed < 0 || lo === record.index) continue;
      record.index = lo;
      const glyph = record.plan[lo];
      record.element.style.clipPath = `polygon(0 0,100% 0,100% ${glyph.top}px,${glyph.x}px ${glyph.top}px,${glyph.x}px ${glyph.bottom}px,0 ${glyph.bottom}px)`;
      record.element.dataset.typeCount = String(lo+1);
      Object.assign(record.caret.style,{left:`${Math.max(0,glyph.x-1)}px`,top:`${glyph.top+2}px`,height:`${glyph.height*.86}px`});
    }
    if (more && !document.hidden) frame = requestAnimationFrame(typeFrame);
    else previousTime = 0;
  }

  const typeObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const record = copies.get(entry.target);
      if (!record) continue;
      record.visible = entry.isIntersecting;
      if (record.visible) startCopy(record);
    }
  },{threshold:0,rootMargin:'0px 0px -5% 0px'});
  const copyResize = new ResizeObserver(entries => {
    for (const entry of entries) {
      const record = copies.get(entry.target);
      if (record?.element.dataset.typeState === 'typing') record.dirty = true;
    }
    requestTyping();
  });

  function registerCopy(element) {
    if (copies.has(element) || !exposed(element)) return;
    const signature = element.textContent.replace(/\s+/g,' ').trim();
    if (!signature) return;
    const record = {element,signature,visible:false,elapsed:0,plan:null,caret:null,dirty:true};
    copies.set(element,record);
    element.classList.add('pm-typewriter');
    element.dataset.typeState = 'waiting';
    if (reduced.matches || seenCopy.has(signature)) finishCopy(record);
    else { typeObserver.observe(element); copyResize.observe(element); }
  }

  function scan() {
    scanFrame = 0;
    for (const element of document.querySelectorAll(enterSelector)) registerEntrance(element);
    for (const element of document.querySelectorAll(typeSelector)) registerCopy(element);
    // Previously hidden panels can become exposed without crossing an IO edge.
    for (const record of entrances.values()) if (record.intersects && record.element.dataset.pageEnter === 'waiting' && exposed(record.element)) startEntrance(record);
    for (const record of copies.values()) if (record.visible && record.element.dataset.typeState !== 'done' && exposed(record.element)) startCopy(record);
    for (const [element,record] of copies) if (!element.isConnected) { finishCopy(record); copies.delete(element); }
    for (const [element,record] of entrances) if (!element.isConnected) { finishEntrance(record); entrances.delete(element); }
  }

  function scheduleScan() { if (!scanFrame) scanFrame = requestAnimationFrame(scan); }
  const mutations = new MutationObserver(records => {
    for (const record of records) if (record.type === 'attributes' && record.target.matches('.trajectory-collection.is-transitioning')) morphedCollections.add(record.target);
    if (records.some(record => {
      if (record.type === 'attributes') return record.attributeName !== 'class' || record.target.matches('.trajectory-collection,.pipeline-insight-panel');
      return [...record.addedNodes].some(node => node.nodeType === 1 && !node.matches('.pm-type-caret') && !node.closest('svg,.collection-morph-card,.rack-ghost'));
    })) scheduleScan();
  });

  function settleInteraction(event) {
    if (!(event.target instanceof Element)) return;
    const scope = event.target.closest(interactionScope) || event.target;
    for (const record of entrances.values()) if (scope.contains(record.element) || record.element.contains(event.target)) finishEntrance(record);
    for (const record of copies.values()) if (record.element.contains(event.target)) finishCopy(record);
  }
  document.addEventListener('pointerdown',settleInteraction,true);
  document.addEventListener('focusin',settleInteraction,true);
  document.addEventListener('visibilitychange',() => {
    if (document.hidden) { cancelAnimationFrame(frame); frame=0; previousTime=0; }
    else requestTyping();
  });
  reduced.addEventListener('change',() => {
    if (!reduced.matches) return;
    entrances.forEach(finishEntrance);
    copies.forEach(finishCopy);
  });
  window.addEventListener('beforeprint',() => { entrances.forEach(finishEntrance); copies.forEach(finishCopy); });
  window.addEventListener('pageshow',scheduleScan);
  window.addEventListener('pagehide',event => {
    if (event.persisted) return;
    mutations.disconnect();enterObserver.disconnect();typeObserver.disconnect();copyResize.disconnect();
    cancelAnimationFrame(frame);cancelAnimationFrame(scanFrame);
  });
  scan();
  mutations.observe(document.querySelector('main'),{subtree:true,childList:true,attributes:true,
    attributeFilter:['hidden','inert','open','aria-hidden','data-state','data-ready','class']});
  document.documentElement.dataset.pageMotion = 'ready';
})();

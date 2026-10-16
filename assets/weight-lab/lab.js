import {gsap} from './vendor/gsap-3.14.2/index.js';
import {examples, parameters, sampleProgress, evaluateChunk} from './model.js?v=3a6369f85f7b';

const x=u=>36+284*u, y=p=>152-(p-.25)/.30*128;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const number=v=>Math.abs(v)<.01?v.toFixed(4):v.toFixed(3);
const signed=v=>`${v>=0?'+':'−'}${number(Math.abs(v))}`;
const formulas=[
  '<mi>w</mi><mo>=</mo><mi mathvariant="normal">clip</mi><mo>(</mo><mn>1</mn><mo>+</mo><mi>β</mi><mi mathvariant="normal">tanh</mi><mo>(</mo><mi>γ</mi><mi>Δ</mi><mo>)</mo><mo>)</mo>',
  '<mi>Δ</mi><mo>≤</mo><msub><mi>δ</mi><mi mathvariant="normal">min</mi></msub><mo>⇒</mo><mi>w</mi><mo>=</mo><mn>0</mn>',
  '<mi>d</mi><mo>&gt;</mo><mi>η</mi><mo>⇒</mo><mi>w</mi><mo>=</mo><mn>0</mn>',
];
function chart(id,isRegression){
  const bars=Array.from({length:20},(_,i)=>`<rect class="wl-weight-bar" x="${36+i*14}" y="212" width="10" height="20" rx="1"/>`).join('');
  return `<svg class="wl-chart" viewBox="0 0 332 244" role="img" aria-label="Illustrative progress and action-chunk weight">
    <defs><clipPath id="wl-clip-${id}"><rect class="wl-reveal" x="34" y="16" width="290" height="150"/></clipPath></defs>
    <rect class="wl-tolerance" x="36" y="${y(.4)}" width="284" height="${y(.4-parameters.eta)-y(.4)}"/>
    <path class="wl-axis" d="M36 20V162H320"/><path class="wl-reference" d="M36 ${y(.4)}H320"/>
    <path class="wl-reference" d="M36 ${y(.4-parameters.eta)}H320" opacity=".4"/>
    <text x="18" y="27" font-style="italic">p</text><text x="36" y="179">t</text><text x="320" y="179" text-anchor="end">t + N</text>
    <text x="326" y="${y(.4-parameters.eta)+3}" text-anchor="end">η</text>
    <path class="wl-underlay"/><g clip-path="url(#wl-clip-${id})"><path class="wl-trace"/></g>
    <g class="wl-measure"><path class="wl-gain wl-bracket"/><path class="wl-depth wl-bracket wl-depth-mark"/>
      <circle class="wl-minimum wl-dot wl-depth-dot" r="3.5"/>
      <circle class="wl-end wl-dot" r="4"/>
      <circle class="wl-handle" data-wl-handle="${isRegression?'depth':'gain'}" r="14" fill="transparent"><title>Drag to change ${isRegression?'regression depth':'net gain'}</title></circle>
    </g>
    <path class="wl-axis" d="M36 194H320" opacity=".45"/>
    <g aria-hidden="true"><path class="wl-weight-ghost" d="M36 212H312V232H36Z"/></g>
    <g class="wl-weight-layer">${bars}<path class="wl-cut-line" d="M36 222H312" stroke="#a76751" stroke-width="1" fill="none"/></g>
    <text x="36" y="244">action chunk</text>
  </svg>`;
}

export function mountWeightLab(root){
  const uid=root.id||'weight-lab';
  root.innerHTML=`<header class="wl-heading"><div><span class="wl-eyebrow">Chunk weighting</span><h3>How progress becomes weight.</h3></div><div class="wl-tools"><button type="button" data-wl-play aria-label="Pause weight animation" title="Pause animation"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg></button><button type="button" data-wl-replay aria-label="Replay weight animation" title="Replay"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 6a6 6 0 1 1-1 6M5 2v5h5"/></svg></button></div></header>
    <div class="wl-viewport" tabindex="0" role="region" aria-label="Three interactive weighting examples; swipe horizontally on small screens"><div class="wl-grid">${examples.map((example,i)=>`<article class="wl-case" data-case="${example.id}" data-outcome="${i===0?'keep':'cut'}"><header class="wl-case-header"><span class="wl-number">0${i+1}</span><h4>${example.title}</h4><span class="wl-status">${i===0?'KEEP':'CUT'}</span></header><div class="wl-function"><math xmlns="http://www.w3.org/1998/Math/MathML">${formulas[i]}</math></div>${chart(`${uid}-${example.id}`,example.id==='regressed')}<div class="wl-summary"><div class="wl-metrics"><span>Δ <b data-delta></b></span><span>d <b data-depth></b></span></div><output class="wl-result"><small>w</small><span data-weight></span></output></div><div class="wl-control"><label for="${uid}-${example.id}-input" title="${example.label}">${example.symbol}</label><input id="${uid}-${example.id}-input" aria-label="${example.title}: ${example.label.toLowerCase()}" type="range" min="${example.min}" max="${example.max}" step="${example.step}" value="${example.value}"/><output data-control-value for="${uid}-${example.id}-input"></output></div></article>`).join('')}</div></div>
    <footer class="wl-footer"><span>Illustrative functions · drag to explore</span><details class="wl-rule-details"><summary>The rule</summary><p>Δ = p(t + N) − p(t), d = p(t) − min p. Keep only Δ &gt; δ<sub>min</sub> and d ≤ η; otherwise w = 0. Here δ<sub>min</sub> = 0.003, η = 0.030, β = 0.5, γ = 20, and clip bounds are [0.5, 1.5]. Zero weight masks the supervised gradient; the states stay in the graph. <a href="https://arxiv.org/pdf/2610.20504#page=6" data-wl-paper target="_blank" rel="noopener">Paper §4.3 ↗</a></p></details></footer>`;
  root.querySelector('[data-wl-paper]').href=new URL(root.dataset.paperUrl||'https://arxiv.org/pdf/2610.20504#page=6',document.baseURI).href;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const play=root.querySelector('[data-wl-play]');
  const cards=examples.map(example=>({example,value:example.value,node:root.querySelector(`[data-case="${example.id}"]`)}));
  const capture=root.dataset.capture==='true';
  let started=false,visible=capture,requested=true,drag=null;
  function paint(card,animate=false){
    const samples=sampleProgress(card.example.id,card.value),result=evaluateChunk(samples);
    card.result=result;
    const node=card.node,path=samples.map((p,i)=>`${i?'L':'M'}${x(i/(samples.length-1)).toFixed(2)} ${y(p).toFixed(2)}`).join(' ');
    node.querySelector('.wl-trace').setAttribute('d',path);node.querySelector('.wl-underlay').setAttribute('d',path);
    node.dataset.outcome=result.reason==='keep'?'keep':'cut';node.dataset.reason=result.reason;
    node.querySelector('.wl-status').textContent=result.reason==='keep'?'KEEP':'CUT';
    node.querySelector('[data-delta]').textContent=signed(result.delta);node.querySelector('[data-depth]').textContent=number(result.depth);
    node.querySelector('[data-weight]').textContent=result.weight===0?'0':result.weight.toFixed(2);
    node.querySelector('[data-control-value]').textContent=number(card.value);
    const range=node.querySelector('input');range.value=card.value;range.setAttribute('aria-valuetext',`${number(card.value)}; weight ${result.weight.toFixed(2)}; ${result.reason==='keep'?'kept':'masked'}`);
    const end=samples.at(-1),minimumIndex=samples.indexOf(result.minimum),minimumX=card.example.id==='regressed'?x(.44):x(minimumIndex/(samples.length-1));
    const endDot=node.querySelector('.wl-end');endDot.setAttribute('cx',320);endDot.setAttribute('cy',y(end));
    node.querySelector('.wl-gain').setAttribute('d',`M306 ${y(.4)}h8M310 ${y(.4)}V${y(end)}M306 ${y(end)}h8`);
    node.querySelector('.wl-depth').setAttribute('d',result.depth>.0001?`M${minimumX-4} ${y(.4)}h8M${minimumX} ${y(.4)}V${y(result.minimum)}M${minimumX-4} ${y(result.minimum)}h8`:'');
    const minimum=node.querySelector('.wl-minimum');minimum.setAttribute('cx',minimumX);minimum.setAttribute('cy',y(result.minimum));minimum.style.opacity=result.depth>.0001?'1':'0';
    const handle=node.querySelector('[data-wl-handle]');handle.setAttribute('cx',card.example.id==='regressed'?minimumX:320);handle.setAttribute('cy',y(card.example.id==='regressed'?result.minimum:end));
    const bars=node.querySelectorAll('.wl-weight-bar'),vars={scaleY:result.weight/parameters.wMax,opacity:result.weight?1:0,svgOrigin:'0 232'};
    card.tween?.kill();
    if(animate&&!reduced.matches)card.tween=gsap.to(bars,{...vars,duration:.35,ease:'power2.out',overwrite:true});else gsap.set(bars,vars);
    gsap.set(node.querySelector('.wl-cut-line'),{opacity:result.weight?0:.65});
    node.querySelector('svg').setAttribute('aria-label',`${card.example.title}. Net progress ${number(result.delta)}, regression depth ${number(result.depth)}, weight ${result.weight.toFixed(2)}.`);
  }
  cards.forEach(card=>paint(card));
  const timeline=gsap.timeline({paused:true,onComplete:()=>{requested=false;sync();}});
  // Explicit destination states keep a replay correct even if the reader
  // restarts before the first entrance has finished.
  timeline.fromTo(root.querySelectorAll('.wl-reveal'),{scaleX:0,svgOrigin:'34 0'},{scaleX:1,svgOrigin:'34 0',duration:2.1,stagger:.055,ease:'sine.inOut'},.2)
    .fromTo(root.querySelectorAll('.wl-measure'),{opacity:0,y:3},{opacity:1,y:0,duration:.42,stagger:.04,ease:'power2.out'},2.25)
    .fromTo(root.querySelectorAll('.wl-weight-layer'),{opacity:0,y:4},{opacity:1,y:0,duration:.28,ease:'expo.out'},2.8)
    .fromTo(root.querySelectorAll('.wl-summary, .wl-status'),{opacity:0},{opacity:1,duration:.4,ease:'power3.out'},3.25);
  cards.forEach((card,i)=>{
    timeline.fromTo(card.node.querySelectorAll('.wl-weight-bar'),{scaleY:1/parameters.wMax,opacity:.9,svgOrigin:'0 232'},
      {scaleY:()=>card.result.weight/parameters.wMax,opacity:()=>card.result.weight?1:0,svgOrigin:'0 232',duration:.5,stagger:.009,ease:card.result.weight?'power2.out':'power2.in'},3.12+i*.06);
    timeline.fromTo(card.node.querySelector('.wl-cut-line'),{scaleX:0,svgOrigin:'36 222'},{scaleX:1,svgOrigin:'36 222',duration:.3,ease:'power1.inOut'},3.4+i*.06);
  });
  window.__timelines=window.__timelines||{};
  window.__timelines['weight-lab']=timeline;
  window.dispatchEvent(new CustomEvent('weight-lab:ready',{detail:{timeline}}));
  function sync(){
    const running=requested&&visible&&!document.hidden&&!reduced.matches&&!capture;
    root.dataset.running=String(running);
    play.setAttribute('aria-label',running?'Pause weight animation':'Play weight animation');play.title=running?'Pause animation':'Play animation';
    play.innerHTML=running?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 5v10M13 5v10"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 8 6-8 6Z"/></svg>';
    play.disabled=reduced.matches;
    running?timeline.play():timeline.pause();
  }
  function finish(){if(timeline.progress()<1)timeline.progress(1);timeline.pause();requested=false;started=true;sync();}
  function change(card,value){
    finish();const e=card.example;
    card.value=clamp(Math.round(value/e.step)*e.step,e.min,e.max);paint(card,true);
  }
  for(const card of cards){
    card.node.querySelector('input').addEventListener('input',event=>change(card,Number(event.target.value)));
    const svg=card.node.querySelector('svg');
    svg.addEventListener('pointerdown',event=>{
      if(event.button!==0||!event.target.closest('[data-wl-handle]'))return;
      event.preventDefault();finish();drag={card,id:event.pointerId,svg};svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove',event=>{
      if(!drag||drag.svg!==svg||drag.id!==event.pointerId)return;
      const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
      const progress=.25+(152-point.y)/128*.30;
      change(card,card.example.id==='regressed'?.4-progress:progress-.4);
    });
    const release=event=>{if(drag?.svg===svg&&drag.id===event.pointerId){drag=null;if(svg.hasPointerCapture(event.pointerId))svg.releasePointerCapture(event.pointerId);}};
    svg.addEventListener('pointerup',release);svg.addEventListener('pointercancel',release);svg.addEventListener('lostpointercapture',release);
  }
  root.querySelector('[data-wl-replay]').addEventListener('click',()=>{
    cards.forEach(card=>{card.tween?.kill();card.value=card.example.value;paint(card);});
    timeline.invalidate().restart().pause();requested=true;started=true;if(reduced.matches)finish();else sync();
  });
  play.addEventListener('click',()=>{if(timeline.progress()===1)timeline.invalidate().restart().pause();requested=!requested;sync();});
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible&&!started){started=true;if(reduced.matches)finish();}sync();},{threshold:.12});
  if(!capture)observer.observe(root);document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(reduced.matches)finish();else sync();});
  root.dataset.ready='true';sync();
  return {timeline,destroy(){observer.disconnect();timeline.kill();cards.forEach(card=>card.tween?.kill());}};
}
export const instances=[...document.querySelectorAll('[data-weight-lab]')].map(mountWeightLab);
window.addEventListener('pagehide',event=>{if(!event.persisted)instances.forEach(instance=>instance.destroy());});

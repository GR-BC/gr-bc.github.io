import {createCloth} from './cloth.js?v=8f03d3208da3';
const ASSET_VERSION = 'd2c59bc3324c';
const asset=name=>new URL(`${name}?v=${ASSET_VERSION}`,import.meta.url);
const shell=document.querySelector('[data-task-curtain]');
if(shell)mount().catch(error=>{
  shell.classList.remove('is-ready');
  const video=shell.querySelector('video');video.inert=false;video.controls=true;video.removeAttribute('aria-hidden');
  console.error('Task curtain unavailable; showing the demo and task figure.',error);
});
async function mount(){
  const response=await fetch(asset('tasks.svg'));if(!response.ok)throw Error('Task artwork could not load.');
  const parsed=new DOMParser().parseFromString(await response.text(),'image/svg+xml');
  if(parsed.querySelector('parsererror'))throw Error('Task artwork is invalid.');
  const svg=document.importNode(parsed.documentElement,true);
  svg.setAttribute('viewBox','82 0 1466 756');svg.setAttribute('width','1466');svg.setAttribute('height','756');
  svg.setAttribute('role','img');svg.setAttribute('aria-label','Assembly model, graphics card insertion, screw tightening, and memory stick insertion: five original steps per task.');
  for(const image of svg.querySelectorAll('image')){
    const href=image.getAttributeNS('http://www.w3.org/1999/xlink','href')||image.getAttribute('href');
    image.setAttributeNS('http://www.w3.org/1999/xlink','href',asset(href).href);
  }
  const ids=new Map([...svg.querySelectorAll('[id]')].map(element=>[element.id,`task-cloth-${element.id}`]));
  for(const element of [svg,...svg.querySelectorAll('*')])for(const attribute of [...element.attributes]){
    let value=attribute.value;
    if(attribute.name==='id')value=ids.get(value)||value;
    if(value.startsWith('#')&&ids.has(value.slice(1)))value=`#${ids.get(value.slice(1))}`;
    value=value.replace(/url\(#([^)]+)\)/g,(_,id)=>`url(#${ids.get(id)||id})`);
    if(value!==attribute.value)element.setAttribute(attribute.name,value);
  }
  const stage=shell.querySelector('.demo-stage'),sheet=shell.querySelector('.curtain-sheet');
  const video=shell.querySelector('.demo-video video'),play=shell.querySelector('.demo-play');
  const teaser=document.createElement('span');teaser.className='demo-teaser';teaser.setAttribute('aria-hidden','true');teaser.textContent='▶';video.parentElement.append(teaser);
  const peel=shell.querySelector('.curtain-peel'),cta=shell.querySelector('.curtain-cta');
  const rail=[...shell.querySelectorAll('[data-curtain-task]')],toggles=[...shell.querySelectorAll('[data-curtain-toggle]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const art=shell.querySelector('.curtain-art');art.append(svg);
  const canvas=document.createElement('canvas');canvas.className='curtain-canvas';canvas.setAttribute('aria-hidden','true');sheet.append(canvas);
  let cloth=null;
  try{cloth=await createCloth(svg,canvas);}catch(error){console.warn('Using the vector curtain fallback.',error);}
  if(cloth)shell.classList.add('has-cloth-mesh');
  const initialSpread=.985,breezeSeed=Math.random()*Math.PI*2;
  let open=true,peek=true,peekAmount=1,peekVelocity=0,position=initialSpread,velocity=0,topPosition=1,topVelocity=0,energy=0,raf=0,last=0,visible=false,windTime=0;
  let inviting=true,invitationAmount=1,attention=0,attentionAmount=0;
  const breeze={phase:breezeSeed,sway:0,strength:0,curl:0};
  let width=1,railWidth=1,height=1,drag=null,suppressClick=false,corner={x:0,y:0};
  const clothTop=30,hangers=[...shell.querySelectorAll('.curtain-hangers span')];
  const pointer={x:0,y:0,vx:0,vy:0,strength:0},pull={active:false,x:0,y:0};
  const refreshPlay=()=>{play.hidden=open||!video.paused;};
  function measure(){
    const next=stage.getBoundingClientRect().width;
    const nextRail=shell.querySelector('.curtain-rail').getBoundingClientRect().width;
    if(Math.abs(next-width)<.1&&Math.abs(nextRail-railWidth)<.1)return;
    width=next;railWidth=nextRail;draw(1/60);
  }
  function draw(dt){
    const p=Math.max(0,Math.min(1,position)),w=width-railWidth,artHeight=w*756/1466;
    const clothHead=12,hem=Math.max(56,Math.min(100,w*.09));
    height=clothHead+artHeight+hem;
    const demoHeight=(w-36)*9/16;
    stage.style.height=`${Math.max(clothTop+height+12,44+demoHeight+18)}px`;
    shell.style.setProperty('--demo-height',`${demoHeight}px`);
    shell.style.setProperty('--cloth-height',`${height}px`);
    shell.style.setProperty('--cloth-head',`${clothHead}px`);
    shell.style.setProperty('--cloth-label-top',`${clothTop+clothHead}px`);
    shell.style.setProperty('--task-art-height',`${artHeight}px`);
    for(const [index,hanger] of hangers.entries())hanger.style.left=`${railWidth+(index+.25)/(hangers.length-.5)*w*Math.max(.025,topPosition)}px`;
    art.style.clipPath=`inset(0 ${100*(1-p)}% 0 0)`;
    const isStatic=reduced.matches;
    const gust=Math.pow(.5+.5*Math.sin(windTime*1.32-.6+.2*Math.sin(windTime*.25+breezeSeed)),4);
    const envelope=.7+.3*Math.sin(windTime*.45+breezeSeed)**2;
    breeze.phase=windTime*1.42+breezeSeed;
    breeze.sway=Math.sin(windTime*1.09+breezeSeed)*.7+Math.sin(windTime*1.78+breezeSeed*1.3)*.3;
    breeze.strength=isStatic||!open?0:1.2+.52*Math.sin(windTime*.64+breezeSeed)**2;
    breeze.curl=isStatic||!open||drag?0:gust*envelope*invitationAmount*1.4+attentionAmount*.2;
    if(cloth){
      cloth.draw({width:w,height,bodyStart:clothHead/height,bodyEnd:(clothHead+artHeight)/height,progress:p,topProgress:Math.max(0,Math.min(1,topPosition)),pointer,pull,peek:peekAmount,time:windTime,breeze,wind:open&&!drag,dt,staticMotion:isStatic});
      corner=cloth.corner;
    }else{
      corner={x:w*p+pull.x-breeze.curl*w*.026,y:height+pull.y-breeze.curl*height*.105};
      sheet.style.clipPath=`polygon(0 0,${w*Math.max(0,Math.min(1,topPosition))}px 0,${corner.x}px ${corner.y}px,0 ${height}px)`;
      art.style.transform=isStatic?'none':`perspective(1300px) rotateY(${pointer.vx*.004*pointer.strength+breeze.sway*breeze.strength*.7}deg)`;
    }
    const size=25+p*Math.min(30,w*.028);
    peel.style.width=`${size}px`;peel.style.height=`${size}px`;
    peel.style.left=`${Math.max(2,railWidth+corner.x-size*.82)}px`;
    peel.style.top=`${Math.max(0,clothTop+corner.y-size*.82)}px`;
    peel.style.setProperty('--corner-lift',`${pull.active?Math.min(14,4+Math.abs(pull.y)*.08):0}px`);
    peel.style.setProperty('--tease',String(breeze.curl));
  }
  function tick(time){
    const elapsed=last?Math.min((time-last)/1000,.1):1/60,dt=Math.min(elapsed,.032);last=time;
    windTime+=elapsed;
    invitationAmount+=(Number(inviting)-invitationAmount)*(1-Math.exp(-dt*3));
    attentionAmount+=(attention-attentionAmount)*(1-Math.exp(-dt*5));
    peekVelocity+=((Number(peek)-peekAmount)*90-peekVelocity*18)*dt;peekAmount+=peekVelocity*dt;
    if(drag)updateGrip();
    const target=open?(peek?initialSpread:1):0;
    if(!drag){velocity+=((target-position)*65-velocity*16)*dt;position+=velocity*dt;}
    const topTarget=peek?1:drag?drag.startTop+(position-drag.startProgress)*.28:position;
    topVelocity+=((topTarget-topPosition)*90-topVelocity*18)*dt;topPosition+=topVelocity*dt;
    pointer.strength*=Math.exp(-dt*3);pointer.vx*=Math.exp(-dt*3);pointer.vy*=Math.exp(-dt*3);
    energy*=Math.exp(-dt*2.5);
    const settled=!drag&&Math.abs(position-target)<.0004&&Math.abs(velocity)<.003&&Math.abs(topPosition-topTarget)<.0004&&Math.abs(topVelocity)<.003&&Math.abs(peekAmount-Number(peek))<.0004&&Math.abs(peekVelocity)<.003;
    if(settled){position=target;topPosition=topTarget;peekAmount=Number(peek);velocity=topVelocity=peekVelocity=0;shell.dataset.curtainMotion=open&&!reduced.matches?'breeze':'settled';}
    draw(dt);
    if(!settled||energy>.001||pointer.strength>.001||drag||(open&&!reduced.matches))raf=requestAnimationFrame(tick);else{raf=0;last=0;}
  }
  function animate(){
    if(reduced.matches&&!drag){position=open?(peek?initialSpread:1):0;topPosition=peek?1:position;peekAmount=Number(peek);velocity=topVelocity=peekVelocity=0;pointer.strength=0;energy=0;shell.dataset.curtainMotion='settled';draw(1/60);return;}
    if(!raf&&visible&&!document.hidden){last=0;raf=requestAnimationFrame(tick);}
  }
  function setOpen(value,preview=false){
    open=value;peek=preview;shell.dataset.curtainOpen=String(open);shell.dataset.curtainMotion='moving';
    sheet.inert=!open;sheet.setAttribute('aria-hidden',String(!open));sheet.style.pointerEvents=open?'auto':'none';
    if(open)video.pause();video.inert=open;video.controls=!open;video.setAttribute('aria-hidden',String(open));
    for(const button of [...rail,...toggles])button.setAttribute('aria-expanded',String(open));
    if(cta){
      cta.querySelector('.curtain-cta-action').textContent=open?'掀起':'放下';
      cta.querySelector('.curtain-cta-purpose').textContent=open?'for demo':'for tasks';
    }
    for(const button of rail)button.setAttribute('aria-label',`${open?'Draw curtain aside':'Reveal task curtain'}: ${button.querySelector('img').alt}`);
    peel.setAttribute('aria-label',open?'Drag curtain corner to reveal the demo':'Drag curtain corner to reveal the task map');
    peel.title='Hold and drag the cloth corner · Click to toggle';
    refreshPlay();energy=Math.max(energy,.8);animate();
  }
  function brush(event){
    if(reduced.matches||event.pointerType==='touch'||drag)return;
    const rect=sheet.getBoundingClientRect(),now=performance.now(),x=event.clientX-rect.left,y=event.clientY-rect.top;
    const seconds=pointer.time?Math.max(.016,(now-pointer.time)/1000):.1;
    pointer.vx=Math.max(-650,Math.min(650,(x-pointer.x)/seconds));pointer.vy=Math.max(-500,Math.min(500,(y-pointer.y)/seconds));
    pointer.x=x;pointer.y=y;pointer.time=now;pointer.strength=1;energy=1;animate();
  }
  function endInvitation(){inviting=false;shell.dataset.curtainInviting='false';}
  for(const button of toggles)button.addEventListener('click',()=>{
    if(button===peel&&suppressClick){suppressClick=false;return;}endInvitation();setOpen(!open);
  });
  for(const button of rail)button.addEventListener('click',()=>{endInvitation();setOpen(!open);});
  sheet.addEventListener('pointermove',brush);
  sheet.addEventListener('pointerleave',()=>{pointer.time=0;});
  peel.addEventListener('pointerenter',()=>{attention=1;animate();});
  peel.addEventListener('pointerleave',()=>{attention=0;});
  peel.addEventListener('focus',()=>{attention=1;animate();});
  peel.addEventListener('blur',()=>{attention=0;});
  peel.addEventListener('pointerdown',event=>{
    if(event.button!==0)return;
    endInvitation();
    const rect=stage.getBoundingClientRect();
    drag={id:event.pointerId,startX:event.clientX,startY:event.clientY,clientX:event.clientX,clientY:event.clientY,startProgress:position,startTop:topPosition,offsetX:event.clientX-rect.left-railWidth-corner.x,offsetY:event.clientY-rect.top-clothTop-corner.y,moved:false};
    peel.setPointerCapture(event.pointerId);pull.active=true;setOpen(true);shell.classList.add('is-grabbing');
  });
  function updateGrip(){
    const rect=stage.getBoundingClientRect(),w=width-railWidth;
    const x=drag.clientX-rect.left-railWidth-drag.offsetX+peekAmount*w*.012;
    position=Math.max(0,Math.min(1,x/w));velocity=0;
    pull.x=Math.max(-80,Math.min(80,x-w*position));
    pull.y=Math.max(-height*.55,Math.min(height*.2,drag.clientY-rect.top-clothTop-height-drag.offsetY+peekAmount*height*.075));
  }
  peel.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    drag.clientX=event.clientX;drag.clientY=event.clientY;updateGrip();
    drag.moved ||= Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>4;
    energy=1;animate();
  });
  function release(event,cancelled=false){
    if(!drag||drag.id!==event.pointerId)return;
    const previous=drag;drag=null;pull.active=false;pull.x=pull.y=0;shell.classList.remove('is-grabbing');
    suppressClick=previous.moved;
    if(peel.hasPointerCapture(event.pointerId))peel.releasePointerCapture(event.pointerId);
    // A press with no drag is a normal click; its click handler performs the toggle.
    if(previous.moved||cancelled)setOpen(position>.45);else setOpen(previous.startProgress>.5);
    energy=1;animate();
  }
  peel.addEventListener('pointerup',event=>release(event));
  peel.addEventListener('pointercancel',event=>release(event,true));
  peel.addEventListener('lostpointercapture',event=>{if(drag)release(event,true);});
  shell.addEventListener('keydown',event=>{if(event.key==='Escape'&&(open||drag)){endInvitation();if(drag)release({pointerId:drag.id},true);setOpen(false);peel.focus({preventScroll:true});}});
  play.addEventListener('click',()=>{video.play().catch(()=>{video.controls=true;});});
  for(const event of ['play','pause','ended'])video.addEventListener(event,refreshPlay);
  video.addEventListener('play',()=>{if(open)setOpen(false);});
  function sync(){if(document.hidden||!visible){if(raf)cancelAnimationFrame(raf);raf=0;last=0;}else animate();}
  const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});
  const resize=new ResizeObserver(measure);resize.observe(stage);observer.observe(stage);
  document.addEventListener('visibilitychange',sync);
  reduced.addEventListener('change',()=>{if(raf)cancelAnimationFrame(raf);raf=0;animate();});
  sheet.hidden=false;shell.classList.add('is-ready');shell.dataset.curtainInviting='true';setOpen(true,true);
  peel.querySelector('span').innerHTML='<svg viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M22 22 7 7M7 18V7h11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  peel.title='Hold and drag the cloth corner · Click to toggle';
  measure();refreshPlay();
  window.addEventListener('pagehide',event=>{if(!event.persisted){observer.disconnect();resize.disconnect();if(raf)cancelAnimationFrame(raf);cloth?.destroy();}});
}

import {frameworkConfig} from './framework.config.js?v=7e00b00c2e1d';
const bundleVersion='2a2f1426828b';
const NS='http://www.w3.org/2000/svg',XL='http://www.w3.org/1999/xlink';
const mounted=new WeakMap();let serial=0;
const svgEl=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
const clone=o=>JSON.parse(JSON.stringify(o));
const defaults={visible:true,dx:0,dy:0,scale:1,rotate:0,opacity:1};
const finite=(v,name,min,max)=>{v=Number(v);if(!Number.isFinite(v)||v<min||v>max)throw new RangeError(`${name} must be between ${min} and ${max}`);return v;};

export async function mountFramework(container,options={}) {
  if(!(container instanceof Element))throw new TypeError('A container element is required.');
  const base=new URL('./',import.meta.url),version=new URL(import.meta.url).search||`?v=${bundleVersion}`;
  const resource=path=>{const u=new URL(path,base);u.search=version;return u;};
  const [drawing,manifest]=await Promise.all([fetch(resource('framework.svg')).then(r=>{if(!r.ok)throw Error('Drawing could not load');return r.text();}),fetch(resource('components.json')).then(r=>{if(!r.ok)throw Error('Component inventory could not load');return r.json();})]);
  const config={...frameworkConfig,...options.config,stages:Object.fromEntries(Object.entries(frameworkConfig.stages).map(([id,s])=>[id,{...s,...options.config?.stages?.[id]}])),componentDescriptions:{...frameworkConfig.componentDescriptions,...options.config?.componentDescriptions},typeDescriptions:{...frameworkConfig.typeDescriptions,...options.config?.typeDescriptions},routes:options.config?.routes||frameworkConfig.routes};
  config.cycleDuration=finite(config.cycleDuration,'cycleDuration',1,120);
  finite(options.speed??config.speed,'speed',.1,4);
  mounted.get(container)?.destroy();
  const controller=new FrameworkController(container,drawing,manifest,config,options);
  mounted.set(container,controller);return controller;
}

class FrameworkController {
  constructor(container,drawing,manifest,config,options) {
    this.container=container;this.manifest=manifest;this.config=config;this.options=options;this.id=`fw${++serial}-`;this.aborter=new AbortController();this.signal=this.aborter.signal;
    this.components=new Map(manifest.components.map(c=>[c.id,{...c,description:config.componentDescriptions?.[c.id]||config.typeDescriptions?.[c.type]||c.description}]));this.elements=new Map();this.layout={};this.phase=0;this.elapsed=0;this.speed=finite(options.speed??config.speed,'speed',.1,4);
    this.requested=options.autoplay??config.autoplay;this.hovered=null;this.selected=null;this.focusedStage=null;this.soloStage=null;this.visible=true;this.destroyed=false;this.animations=[];
    this.forceReduced=options.reducedMotion===true;this.reduced=matchMedia('(prefers-reduced-motion: reduce)');
    const doc=new DOMParser().parseFromString(drawing,'image/svg+xml');if(doc.querySelector('parsererror'))throw Error('Invalid framework SVG');
    this.svg=document.importNode(doc.documentElement,true);this.svg.classList.add('fw-artwork');this.svg.removeAttribute('aria-labelledby');this.svg.setAttribute('role','group');this.svg.setAttribute('aria-label','Interactive GR-BC framework. Select a component to inspect it.');
    const ids=new Map([...this.svg.querySelectorAll('[id]')].map(e=>[e.id,this.id+e.id]));
    this.svg.querySelectorAll('*').forEach(e=>{
      if(e.id)e.id=ids.get(e.id);
      for(const attr of [...e.attributes]){
        if(attr.name==='id')continue;let v=attr.value;
        v=v.replace(/url\(#([^)]*)\)/g,(_,id)=>`url(#${ids.get(id)||id})`);
        if(v.startsWith('#')&&ids.has(v.slice(1)))v='#'+ids.get(v.slice(1));
        if(attr.name==='aria-labelledby')v=v.split(' ').map(x=>ids.get(x)||x).join(' ');
        if(v!==attr.value)e.setAttributeNS(attr.namespaceURI,attr.name,v);
      }
      if(e.localName==='image'){
        const href=e.getAttribute('href')||e.getAttributeNS(XL,'href');e.removeAttributeNS(XL,'href');const mediaURL=new URL(href,new URL('./',import.meta.url));mediaURL.search=new URL(import.meta.url).search||`?v=${bundleVersion}`;e.setAttribute('href',mediaURL.href);
      }
      if(e.dataset.component){const id=e.dataset.component;if(!this.elements.has(id))this.elements.set(id,[]);this.elements.get(id).push(e);}
    });
    this.filterRegions=[...this.svg.querySelectorAll('g[filter]')].map(g=>{const ref=g.getAttribute('filter').match(/#([^)]*)/)[1],node=[...this.svg.querySelectorAll('filter')].find(n=>n.id===ref);return {node,initial:['x','y','width','height'].map(k=>Number(node.getAttribute(k))),components:new Set([...g.querySelectorAll('[data-component]')].map(e=>e.dataset.component))};});
    for(const [stage,s] of Object.entries(config.stages))this.svg.querySelectorAll(`[data-stage="${stage}"]`).forEach(g=>g.style.setProperty('--fw-accent',s.color));
    this.overlay=svgEl('g',{'class':'fw-overlay','pointer-events':'none','aria-hidden':'true'});this.svg.append(this.overlay);
    this.stageHighlights=manifest.stages.map(s=>{const [x,y,w,h]=s.bounds,r=svgEl('rect',{x,y,width:w,height:h,rx:17,class:'fw-stage-light',stroke:config.stages[s.id].color,fill:config.stages[s.id].color});this.overlay.append(r);return r;});
    this.routes=config.routes.map(route=>{
      const group=svgEl('g',{'class':'fw-flow'}),path=svgEl('path',{d:route.d,fill:'none',stroke:config.stages[route.from].color,'class':'fw-flow-path'});group.append(path);
      const dots=[8,4.5,2.5].map((r,i)=>{const dot=svgEl('circle',{r,fill:i?'#fff':config.stages[route.from].color,class:'fw-flow-dot',opacity:i===2?.7:1});group.append(dot);return dot;});this.overlay.append(group);
      const animation=path.animate([{strokeDashoffset:0},{strokeDashoffset:-36}],{duration:1500,iterations:Infinity});animation.pause();this.animations.push(animation);
      return {...route,group,path,dots,length:path.getTotalLength()};
    });
    this.selectionGroup=svgEl('g',{'class':'fw-selection'});this.selectionBox=svgEl('rect',{'class':'fw-selection-box',rx:5});this.selectionGroup.append(this.selectionBox);this.overlay.append(this.selectionGroup);this.selectionGroup.style.display='none';
    this.surface=document.createElement('div');this.surface.className='fw-surface';this.surface.append(this.svg);container.append(this.surface);
    const on=(target,type,fn)=>target.addEventListener(type,fn,{signal:this.signal});
    const componentAt=target=>target instanceof Element?target.closest('[data-component]')?.dataset.component:null;
    if(options.interactive!==false){
    on(this.svg,'pointerover',e=>{const id=componentAt(e.target);if(id&&id!==this.hovered){this.hovered=id;this.paint();this.sync();this.emit('hover',this.components.get(id));}});
    on(this.svg,'pointerout',e=>{const id=componentAt(e.relatedTarget);if(id!==this.hovered){this.hovered=id||null;this.paint();this.sync();}});
    on(this.svg,'pointerleave',()=>{this.hovered=null;this.paint();this.sync();});
    on(this.svg,'focusin',e=>{this.hovered=componentAt(e.target);this.paint();this.sync();});
    on(this.svg,'focusout',e=>{if(!this.svg.contains(e.relatedTarget)){this.hovered=null;this.paint();this.sync();}});
    on(this.svg,'click',e=>{const id=componentAt(e.target);this.selectComponent(id||null);});
    on(this.svg,'keydown',e=>{if(e.key==='Escape'){this.selectComponent(null);this.svg.blur();}else if(['Enter',' '].includes(e.key)&&componentAt(e.target)){e.preventDefault();this.selectComponent(componentAt(e.target));}});
    }
    on(document,'visibilitychange',()=>this.sync());on(this.reduced,'change',()=>this.sync());
    this.observer=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;this.sync();});this.observer.observe(this.surface);
    if(options.layout)for(const [id,patch] of Object.entries(options.layout))this.setComponent(id,patch);
    this.paint();this.draw(0);this.sync();
  }
  assertLive(){if(this.destroyed)throw Error('Framework controller has been destroyed.');}
  require(id){if(!this.components.has(id))throw Error(`Unknown component: ${id}`);return this.components.get(id);}
  emit(type,detail){this.container.dispatchEvent(new CustomEvent(`framework:${type}`,{detail}));if(type==='select')this.options.onSelect?.(detail);}
  state(){return {playing:this.requested,running:!!this.raf,reducedMotion:(this.forceReduced||this.reduced.matches),speed:this.speed,phase:'ABCD'[this.phase],selected:this.selected,focusedStage:this.focusedStage,soloStage:this.soloStage,visible:this.visible,elapsed:this.elapsed};}
  getState(){return clone(this.state());}
  sync(){
    if(this.destroyed)return;
    const running=this.requested&&this.visible&&!document.hidden&&!(this.forceReduced||this.reduced.matches)&&!this.hovered&&!this.selected&&!this.focusedStage;
    this.animations.forEach(a=>{a.playbackRate=this.speed;running?a.play():a.pause();});
    if(running&&!this.raf){this.last=null;this.raf=requestAnimationFrame(t=>this.tick(t));}
    if(!running&&this.raf){cancelAnimationFrame(this.raf);this.raf=null;this.last=null;}
    this.surface.dataset.running=String(running);this.surface.dataset.speed=this.speed;this.surface.dataset.selected=this.selected||'';this.surface.dataset.focusedStage=this.focusedStage||'';this.overlay.classList.toggle('fw-motion-reduced',(this.forceReduced||this.reduced.matches));this.emit('state',this.state());
  }
  tick(t){
    if(this.destroyed)return;
    this.elapsed+=this.last==null?0:Math.min(100,t-this.last)/1000*this.speed;this.last=t;
    this.draw(this.elapsed);this.raf=requestAnimationFrame(n=>this.tick(n));
  }
  draw(seconds){
    const cycle=this.config.cycleDuration,part=cycle/4,p=(seconds%cycle)/part,phase=Math.floor(p),fraction=p-phase;
    if(phase!==this.phase){this.phase=phase;this.paint();this.emit('phase',{stage:'ABCD'[phase],description:this.config.stages['ABCD'[phase]].description});}
    this.surface?.setAttribute('data-phase','ABCD'[phase]);
    this.routes.forEach((r,i)=>{
      r.group.style.opacity=i===phase?'1':'.13';r.dots.forEach((dot,j)=>{const offset=Math.max(0,fraction-j*.065),pt=r.path.getPointAtLength(offset*r.length);dot.setAttribute('cx',pt.x);dot.setAttribute('cy',pt.y);dot.style.display=i===phase?'':'none';});
    });
    this.stageHighlights.forEach((r,i)=>{const active=(this.focusedStage||this.components.get(this.selected||this.hovered)?.stage||'ABCD'[phase])==='ABCD'[i];r.style.opacity=active?'1':'0';});
  }
  paint(){
    const id=this.selected||this.hovered,c=id?this.components.get(id):null,related=new Set(c?.related||[]),stage=this.focusedStage||c?.stage;
    this.elements.forEach((els,cid)=>{const data=this.components.get(cid);els.forEach(e=>{e.classList.toggle('fw-dimmed',!!stage&&data.stage!==stage);e.classList.toggle('fw-related',related.has(cid));e.classList.toggle('fw-chosen',cid===id);e.setAttribute('aria-pressed',String(cid===this.selected));});});
    this.svg.querySelectorAll('.fw-stage').forEach(g=>g.style.display=this.soloStage&&g.dataset.stage!==this.soloStage?'none':'');
    if(c&&(!this.soloStage||c.stage===this.soloStage)){
      const v={...defaults,...this.layout[c.id]},[x,y,w,h]=c.bounds;this.selectionGroup.style.display=v.visible?'':'none';
      for(const [key,val] of Object.entries({x:x-4,y:y-4,width:w+8,height:h+8}))this.selectionBox.setAttribute(key,val);
      this.selectionBox.setAttribute('stroke',this.config.stages[c.stage].color);this.selectionGroup.setAttribute('transform',this.transform(c,v));
    }else this.selectionGroup.style.display='none';
    this.drawHighlight(stage||'ABCD'[this.phase]);
  }
  drawHighlight(stage){this.stageHighlights.forEach((r,i)=>r.style.opacity=stage==='ABCD'[i]?'1':'0');}
  transform(c,v){const [x,y,w,h]=c.bounds,cx=x+w/2,cy=y+h/2;return `translate(${v.dx} ${v.dy}) translate(${cx} ${cy}) rotate(${v.rotate}) scale(${v.scale}) translate(${-cx} ${-cy})`;}
  play(){this.assertLive();this.requested=true;this.selected=null;this.focusedStage=null;this.hovered=null;this.soloStage=null;this.paint();this.sync();this.emit('select',null);return this;}
  setReducedMotion(value){this.assertLive();this.forceReduced=!!value;this.sync();return this;}
  pause(){this.assertLive();this.requested=false;this.sync();return this;}
  setSpeed(speed){this.assertLive();this.speed=finite(speed,'speed',.1,4);this.sync();return this;}
  selectComponent(id,{focus=false}={}){
    this.assertLive();if(id)this.require(id);this.selected=id;this.focusedStage=null;
    if(id&&this.soloStage&&this.require(id).stage!==this.soloStage)this.soloStage=null;
    this.paint();this.sync();this.emit('select',id?clone(this.require(id)):null);
    if(focus&&id){const first=this.elements.get(id)[0];first.focus({preventScroll:true});}
    if(id&&!(this.forceReduced||this.reduced.matches)){this.selectionBox.getAnimations().forEach(a=>a.cancel());this.selectionBox.animate([{strokeWidth:3,strokeOpacity:.35},{strokeWidth:1.5,strokeOpacity:1}],{duration:350,easing:'ease-out'});}
    return this;
  }
  focusStage(stage){this.assertLive();if(stage!==null&&!this.config.stages[stage])throw Error('Unknown stage');this.selected=null;this.focusedStage=stage;this.soloStage=null;this.paint();this.sync();this.emit('select',null);return this;}
  isolateStage(stage){this.focusStage(stage);this.soloStage=stage;this.paint();this.sync();return this;}
  setComponent(id,patch){
    this.assertLive();const c=this.require(id),v={...defaults,...this.layout[id]};
    for(const [key,value] of Object.entries(patch)){
      if(key==='visible'){if(typeof value!=='boolean')throw TypeError('visible must be boolean');v.visible=value;}
      else if(['dx','dy'].includes(key))v[key]=finite(value,key,-2000,2000);
      else if(key==='scale')v.scale=finite(value,key,.05,10);
      else if(key==='rotate')v.rotate=finite(value,key,-360,360);
      else if(key==='opacity')v.opacity=finite(value,key,0,1);
      else throw Error(`Unknown component property: ${key}`);
    }
    this.layout[id]=v;this.elements.get(id).forEach(e=>{e.style.display=v.visible?'':'none';e.style.setProperty('--fw-opacity',v.opacity);e.setAttribute('transform',this.transform(c,v));});this.refreshFilterBounds();this.paint();this.emit('edit',{id,value:clone(v)});return this;
  }
  refreshFilterBounds(){
    for(const region of this.filterRegions){
      let [x,y,w,h]=region.initial,right=x+w,bottom=y+h;
      for(const id of region.components){const v=this.layout[id];if(!v||!v.visible||(!v.dx&&!v.dy&&v.scale===1&&!v.rotate))continue;
        const [a,b,u,t]=this.require(id).bounds,cx=a+u/2,cy=b+t/2,angle=v.rotate*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
        for(const [px,py] of [[a,b],[a+u,b],[a+u,b+t],[a,b+t]]){const dx=(px-cx)*v.scale,dy=(py-cy)*v.scale,nx=cx+v.dx+dx*c-dy*s,ny=cy+v.dy+dx*s+dy*c;x=Math.min(x,nx-12);y=Math.min(y,ny-12);right=Math.max(right,nx+12);bottom=Math.max(bottom,ny+12);}
      }
      ['x','y','width','height'].forEach((key,i)=>region.node.setAttribute(key,[x,y,right-x,bottom-y][i]));
    }
  }
  getComponent(id){this.require(id);return {...clone(this.require(id)),edit:{...defaults,...this.layout[id]}};}
  exportLayout(){return clone(this.layout);}
  reset(){this.assertLive();for(const [id,els] of this.elements)els.forEach(e=>{e.style.display='';e.style.removeProperty('--fw-opacity');e.removeAttribute('transform');});this.layout={};this.refreshFilterBounds();this.soloStage=null;this.selected=null;this.hovered=null;this.focusedStage=null;this.elapsed=0;this.phase=0;this.speed=this.config.speed;this.paint();this.draw(0);this.sync();this.emit('select',null);this.emit('reset',null);return this;}
  destroy(){if(this.destroyed)return;this.destroyed=true;cancelAnimationFrame(this.raf);this.raf=null;this.animations.forEach(a=>a.cancel());this.observer.disconnect();this.aborter.abort();this.svg.getAnimations({subtree:true}).forEach(a=>a.cancel());this.surface.remove();if(mounted.get(this.container)===this)mounted.delete(this.container);}
}

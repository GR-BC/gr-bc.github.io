(() => {
  'use strict';
  const root = document.querySelector('#trajectory-modules');
  if (!root) return;
  const base = 'assets/progress/';
  const dataVersion = new URL(document.currentScript.src).searchParams.get('v');
  const cameraNames = {cam_0:'Camera 0',cam_1:'Camera 1',cam_2:'Camera 2'};
  const titles = {screw_ep092:'Screw tightening',gpu_ep044:'Graphics card insertion',block_ep075:'Block assembly',ram_ep006:'Memory stick insertion'};
  const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = t => `${Math.floor(t/60)}:${(t%60).toFixed(2).padStart(5,'0')}`;
  const playIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m7 4 9 6-9 6Z" fill="currentColor"/></svg>';
  const pauseIcon = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 4v12M14 4v12" stroke="currentColor" stroke-width="3"/></svg>';
  const motionReduced=matchMedia('(prefers-reduced-motion: reduce)');
  let collection;
  let activePlayer = null;
  const players = [];
  async function json(url) {const r=await fetch(dataVersion?`${url}?v=${dataVersion}`:url);if(!r.ok)throw Error(`Unable to load ${url}`);return r.json();}
  class Trajectory {
    constructor(data,index,annotations) {
      this.d=data;this.annotations=annotations||{};this.frame=0;this.camera=data.default_camera;this.playing=false;this.speed=1;this.raw=false;this.loop=false;this.event=null;this.pending=null;this.seeking=false;this.loaded=false;this.token=0;this.detailsOpen=false;this.detailAnimation=null;
      this.interventionFlags=data.intervention?.flags||[];this.interventionRanges=[];
      let start=null;for(let i=0;i<=this.interventionFlags.length;i++){if(this.interventionFlags[i]===true){if(start===null)start=i;}else if(start!==null){this.interventionRanges.push([start,i]);start=null;}}
      this.el=document.createElement('article');this.el.className='trajectory';this.el.tabIndex=0;this.el.id=`trajectory-${data.id}`;this.el.setAttribute('aria-labelledby',`${data.id}-title`);
      const cameras=[this.camera,...Object.keys(data.cameras).filter(c=>c!==this.camera)];
      this.el.innerHTML=`<header class="trajectory-header"><div class="trajectory-identity"><span class="trajectory-number">0${index+1}</span><div><span class="trajectory-overline">TRAJECTORY / EPISODE ${String(data.id.split('ep')[1]).padStart(3,'0')}</span><h3 id="${data.id}-title">${titles[data.id]}</h3></div></div><div class="trajectory-tags"><span><i></i>Successful rollout</span><span>${(data.duration+1/data.fps).toFixed(1)} s</span><span>${data.events.length} dips to explore</span></div></header>
      <div class="trajectory-workspace"><div class="camera-deck" aria-label="Three synchronized camera views">${cameras.map(cam=>`<button class="camera-view ${cam===this.camera?'is-main':''}" type="button" data-camera="${cam}" aria-label="Focus ${cameraNames[cam]} for ${titles[data.id]}" aria-pressed="${cam===this.camera}"><video muted playsinline preload="none" poster="${base+data.cameras[cam].poster}" data-camera="${cam}"></video><span class="camera-label">${cameraNames[cam]}<span>${cam===this.camera?'FOCUSED':'CLICK TO FOCUS'}</span></span><span class="camera-frame">FRAME 0000</span><span class="camera-intervention" aria-hidden="true">Intervention</span></button>`).join('')}<span class="camera-sync" aria-live="polite">3 VIEWS · ONE TIMELINE</span></div>
      <div class="signal-panel"><div class="signal-heading"><div><span class="trajectory-overline">FOLLOW THE CONSEQUENCE</span><h4>Every advance. Every setback.</h4></div><button class="chart-mode" type="button" aria-pressed="false" title="Toggle raw or 15-frame smoothed graph progress">Raw trace</button></div><div class="signal-metrics"><div><span class="metric-dot progress-dot"></span><span>Graph progress</span><strong data-readout="progress">0.000</strong></div><div><span class="metric-dot weight-dot"></span><span>Transition weight</span><strong data-readout="weight">0.000</strong></div></div><div class="trace-chart" role="group" aria-label="Interactive progress and weight charts. Drag to inspect a frame."></div><div class="signal-footnote"><span class="curve-mode-label">15-frame moving average</span><span class="intervention-legend" title="Recorded human intervention"><i aria-hidden="true"></i>Intervention</span><span>Drag chart ↔</span></div></div></div>
      <div class="trajectory-transport" hidden inert><button class="transport-play" type="button" aria-label="Play ${titles[data.id]}">${playIcon}<span>Play</span></button><div class="frame-step"><button type="button" data-step="-1" aria-label="Previous frame for ${titles[data.id]}">−1</button><button type="button" data-step="1" aria-label="Next frame for ${titles[data.id]}">+1</button></div><div class="timeline-control"><div class="timeline-labels"><span data-readout="time">0:00.00</span><span data-readout="frame">FRAME 0000 / ${data.frame_count-1}</span><span>${fmt(data.duration)}</span></div><input class="trajectory-slider" type="range" min="0" max="${data.frame_count-1}" step="1" value="0" aria-label="Scrub ${titles[data.id]} trajectory"/><div class="timeline-events">${data.events.map(e=>`<button type="button" data-jump="${e.id}" style="left:${e.peak_frame/(data.frame_count-1)*100}%" aria-label="Jump to ${e.id} in ${titles[data.id]}">${e.id}</button>`).join('')}</div></div><label class="speed-control"><span>Speed</span><select aria-label="Playback speed for ${titles[data.id]}"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div>
      <button class="dip-toggle" type="button" aria-expanded="false" aria-controls="${data.id}-details"><span><span data-detail-label>Expand trajectory</span><small>Weight · playback · ${data.events.length} dips</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button><div class="dip-panel" id="${data.id}-details" hidden inert><div class="dip-explorer"><div class="dip-selector"><span class="trajectory-overline">INSPECT A DIP</span><div class="dip-buttons">${data.events.map(e=>`<button type="button" data-jump="${e.id}" aria-pressed="false"><span>${e.id}</span><strong>−${e.smoothed_drop.toFixed(3)}</strong><small>${(e.peak_frame/data.fps).toFixed(1)} s</small></button>`).join('')}</div><div class="dip-tools"><button type="button" data-loop aria-pressed="false" disabled>Loop dip</button><button type="button" data-expand>Expand camera ↗</button></div></div><div class="dip-detail"><div class="dip-copy"><span class="dip-caption">SMALL SETBACKS, IN CONTEXT</span><h4>What changed when progress fell?</h4><p>Select a dip to compare the moments before and after it. Switch the focused camera to inspect the same motion from another view.</p></div><div class="dip-keyframes" aria-label="Before, peak, trough, and after keyframes"></div></div></div>
      </div><div class="trajectory-status" role="status" aria-live="polite"></div>`;
      root.append(this.el);
      this.videos=[...this.el.querySelectorAll('video')];this.slider=this.el.querySelector('input');this.chart=this.el.querySelector('.trace-chart');this.master=this.videos.find(v=>v.dataset.camera===data.default_camera);
      this.videos.forEach(v=>{v.muted=true;v.addEventListener('error',()=>this.error('A camera could not load. Check your connection and retry.'));v.addEventListener('ended',()=>{if(this.playing)this.pause();});});
      this.bind();this.drawChart();this.render(0);
    }
    status(s){this.el.querySelector('.trajectory-status').textContent=s;}
    error(s){this.pause();this.status(s);this.el.classList.remove('is-seeking');}
    async activate(){
      if(this.loaded)return this.ready;
      this.loaded=true;this.el.classList.add('is-loading');
      this.ready=Promise.all(this.videos.map(v=>new Promise((resolve,reject)=>{
        const done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('Camera load failed'));};
        const timer=setTimeout(fail,20000),cleanup=()=>{clearTimeout(timer);v.removeEventListener('loadeddata',done);v.removeEventListener('error',fail);};
        v.addEventListener('loadeddata',done);v.addEventListener('error',fail);v.src=base+this.d.cameras[v.dataset.camera].src;v.preload='auto';v.load();
      }))).then(()=>{this.el.classList.remove('is-loading');this.status('');}).catch(e=>{this.el.classList.remove('is-loading');this.loaded=false;this.error('The camera views are taking too long to load. Press Play to retry.');throw e;});
      return this.ready;
    }
    bind(){
      this.el.querySelector('.dip-toggle').onclick=()=>this.setDetails(!this.detailsOpen);
      this.el.addEventListener('click',e=>{
        if(this.detailsOpen||collection?.moving)return;
        if(e.target.closest('button,a,input,select,textarea,label,summary,[role="button"],[role="slider"],.trace-chart,.dip-panel'))return;
        if(window.getSelection()?.isCollapsed===false)return;
        this.setDetails(true);
      });
      this.el.addEventListener('keydown',e=>{
        if(e.target!==this.el||!['Enter',' '].includes(e.key)||collection?.moving)return;
        e.preventDefault();this.setDetails(!this.detailsOpen);
      });
      this.el.querySelector('.transport-play').onclick=()=>this.playing?this.pause():this.play();
      this.slider.addEventListener('input',()=>this.seek(+this.slider.value));
      this.el.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>this.seek(this.frame+ +b.dataset.step));
      this.el.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>this.selectEvent(b.dataset.jump));
      this.el.querySelector('select').onchange=e=>{this.speed=+e.target.value;this.videos.forEach(v=>v.playbackRate=this.speed);};
      this.el.querySelectorAll('[data-camera].camera-view').forEach(b=>b.onclick=()=>this.setCamera(b.dataset.camera));
      this.el.querySelector('.chart-mode').onclick=e=>{this.raw=!this.raw;e.currentTarget.setAttribute('aria-pressed',this.raw);this.el.querySelector('.curve-mode-label').textContent=this.raw?'Raw graph progress':'15-frame moving average';this.el.querySelectorAll('.dip-buttons [data-jump]').forEach(b=>{const e=this.d.events.find(e=>e.id===b.dataset.jump);b.querySelector('strong').textContent='−'+(this.raw?e.dense_drop:e.smoothed_drop).toFixed(3);});this.drawChart();this.render(this.frame);};
      this.el.querySelector('[data-loop]').onclick=e=>{this.loop=!this.loop;e.currentTarget.setAttribute('aria-pressed',this.loop);if(this.loop){const work=this.seek(this.event.keyframes[0].frame_index), intent=this.token;work.then(()=>{if(this.token===intent)this.play();});}};
      this.el.querySelector('[data-expand]').onclick=()=>this.expand();
      const point=e=>{const rect=this.chart.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*680;const [a,b]=this.domain();return Math.round(a+Math.max(0,Math.min(1,(x-44)/616))*(b-a));};
      this.chart.addEventListener('pointerdown',e=>{if(e.button!==0)return;this.dragging=true;this.chart.setPointerCapture(e.pointerId);this.seek(point(e));});
      this.chart.addEventListener('pointermove',e=>{if(this.dragging)this.seek(point(e));});
      const end=()=>this.dragging=false;this.chart.addEventListener('pointerup',end);this.chart.addEventListener('pointercancel',end);
    }
    domain(){return [0,this.d.frame_count-1];}
    drawChart(){
      const [a,b]=this.domain(),x=f=>44+(f-a)/(b-a)*616,prog=i=>168-this.d.samples[i][this.raw?0:1]*140,weight=i=>292-this.d.samples[i][2]/1.5*72;
      const path=fn=>Array.from({length:b-a+1},(_,j)=>`${j?'L':'M'}${x(a+j).toFixed(2)},${fn(a+j).toFixed(2)}`).join(' ');
      const grid=[0,.25,.5,.75,1].map(v=>`<path d="M44 ${168-v*140}H660" class="chart-grid"/><text x="33" y="${172-v*140}" text-anchor="end">${v===0?'0':v===1?'1.0':v.toFixed(2)}</text>`).join('');
      const ticks=Array.from({length:5},(_,i)=>{let f=a+(b-a)*i/4;return `<text x="${x(f)}" y="320" text-anchor="middle">${(f/this.d.fps).toFixed(1)}s</text>`;}).join('');
      const previewTicks=Array.from({length:5},(_,i)=>{const f=a+(b-a)*i/4;return `<text x="${x(f)}" y="190" text-anchor="middle">${(f/this.d.fps).toFixed(1)}s</text>`;}).join('');
      const spans=this.d.events.map(e=>{let l=Math.max(a,e.paper_highlight_span_frames[0]),r=Math.min(b,e.paper_highlight_span_frames[1]);return r>l?`<rect x="${x(l)}" y="22" width="${x(r)-x(l)}" height="277" class="drop-region"/><text x="${x((l+r)/2)}" y="16" text-anchor="middle" class="drop-chart-label">${e.id}</text>`:'';}).join('');
      const interventions=this.interventionRanges.map(([start,end])=>{const l=Math.max(a,start),r=Math.min(b,end);return r>l?`<g><rect x="${x(l)}" y="22" width="${x(r)-x(l)}" height="146" class="intervention-region"/><path d="M${x(l)} 23H${x(r)}" class="intervention-edge"/></g>`:'';}).join('');
      this.chart.innerHTML=`<svg viewBox="0 0 680 338" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fill-${this.d.id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2f6fd5" stop-opacity=".15"/><stop offset="1" stop-color="#2f6fd5" stop-opacity="0"/></linearGradient><clipPath id="clip-${this.d.id}"><rect x="44" y="22" width="616" height="278"/></clipPath></defs>${interventions}${grid}${spans}<text x="44" y="205" class="weight-axis-title">TRANSITION WEIGHT</text><text x="33" y="225" text-anchor="end">1.5</text><text x="33" y="296" text-anchor="end">0</text><path d="M44 220H660M44 292H660" class="chart-grid"/><g clip-path="url(#clip-${this.d.id})"><path d="${path(prog)}L660 168H44Z" fill="url(#fill-${this.d.id})"/><path d="${path(prog)}" class="progress-trace"/><path d="${path(weight)}" class="weight-trace"/><g class="chart-cursor"><path d="M0 22V299"/><circle class="progress-point" r="4.5"/><circle class="weight-point" r="3.5"/></g></g>${ticks}<g class="progress-time-axis">${previewTicks}</g></svg>`;
      this.cursor=this.chart.querySelector('.chart-cursor');
    }
    render(frame, synced=true){
      frame=Math.max(0,Math.min(this.d.frame_count-1,frame));this.frame=frame;const s=this.d.samples[frame],p=s[this.raw?0:1], [a,b]=this.domain();
      this.slider.value=frame;this.slider.style.setProperty('--played',`${frame/(this.d.frame_count-1)*100}%`);this.slider.setAttribute('aria-valuetext',`Frame ${frame}, ${(frame/this.d.fps).toFixed(2)} seconds, progress ${p.toFixed(3)}${this.interventionFlags[frame]===true?', human intervention':''}`);
      this.el.querySelector('[data-readout="progress"]').textContent=p.toFixed(3);this.el.querySelector('[data-readout="weight"]').textContent=s[2].toFixed(3);
      this.el.querySelector('[data-readout="time"]').textContent=fmt(frame/this.d.fps);this.el.querySelector('[data-readout="frame"]').textContent=`FRAME ${String(frame).padStart(4,'0')} / ${this.d.frame_count-1}`;
      const intervening=this.interventionFlags[frame]===true;this.el.querySelector('.signal-panel').classList.toggle('is-intervention',intervening);
      if(synced){this.el.querySelectorAll('.camera-frame').forEach(n=>n.textContent=`FRAME ${String(frame).padStart(4,'0')}`);this.el.querySelector('.camera-deck').classList.toggle('is-intervention',intervening);const label=this.el.querySelector('.camera-sync'),text=intervening?'3 VIEWS · HUMAN INTERVENTION':'3 VIEWS · ONE TIMELINE';if(label.textContent!==text)label.textContent=text;}
      this.cursor.setAttribute('transform',`translate(${44+(frame-a)/(b-a)*616} 0)`);this.cursor.querySelector('.progress-point').setAttribute('cy',168-p*140);this.cursor.querySelector('.weight-point').setAttribute('cy',292-s[2]/1.5*72);
      this.el.querySelectorAll('.keyframe-button').forEach(b=>b.classList.toggle('is-current',+b.dataset.frame===frame));
    }
    async seek(frame){
      this.pause();frame=Math.max(0,Math.min(this.d.frame_count-1,Math.round(frame)));this.pending=frame;this.render(frame,false);this.el.classList.add('is-seeking');
      if(this.seeking)return this.seekWork;
      this.seeking=true;
      this.seekWork=(async()=>{try{await this.activate();while(this.pending!==null){const next=this.pending;this.pending=null;await Promise.all(this.videos.map(v=>this.seekVideo(v,next/this.d.fps)));if(this.pending===null)this.render(next);}}catch(e){this.error('Could not seek all three views. Try another frame or reload.');}finally{this.seeking=false;this.el.classList.remove('is-seeking');}})();
      return this.seekWork;
    }
    seekVideo(v,time){return new Promise((resolve,reject)=>{if(Math.abs(v.currentTime-time)<.001&&!v.seeking){resolve();return;}const cleanup=()=>{clearTimeout(timer);v.removeEventListener('seeked',done);v.removeEventListener('error',fail);},done=()=>{cleanup();resolve();},fail=()=>{cleanup();reject(Error('Seek failed'));},timer=setTimeout(fail,12000);v.addEventListener('seeked',done);v.addEventListener('error',fail);v.currentTime=time;});}
    async play(){
      if(this.playing)return;
      if(activePlayer&&activePlayer!==this)activePlayer.pause();activePlayer=this;
      const token=++this.token;
      try{await this.activate();if(this.seeking)await this.seekWork;if(token!==this.token)return;
        if(this.frame>=this.d.frame_count-2){await this.seek(0);return this.play();}
        this.videos.forEach(v=>v.playbackRate=this.speed);await Promise.all(this.videos.map(v=>v.play()));
        if(token!==this.token){this.videos.forEach(v=>v.pause());return;}
        this.playing=true;this.el.classList.add('is-playing');const b=this.el.querySelector('.transport-play');b.innerHTML=pauseIcon+'<span>Pause</span>';b.setAttribute('aria-label',`Pause ${titles[this.d.id]}`);this.tick();
      }catch(e){this.error('Playback could not start. Press Play to try again.');}
    }
    tick(){if(!this.playing)return;const time=this.master.currentTime,frame=Math.min(this.d.frame_count-1,Math.floor(time*this.d.fps+1e-5));this.render(frame);
      if(this.loop&&this.event&&frame>=this.event.keyframes.at(-1).frame_index){const work=this.seek(this.event.keyframes[0].frame_index), intent=this.token;work.then(()=>{if(this.token===intent)this.play();});return;}
      if(frame>=this.d.frame_count-1){this.pause();return;}
      this.videos.forEach(v=>{if(v!==this.master&&!v.seeking&&Math.abs(v.currentTime-time)>.08)v.currentTime=time;});this.raf=requestAnimationFrame(()=>this.tick());
    }
    pause(){this.token++;this.playing=false;cancelAnimationFrame(this.raf);this.videos.forEach(v=>v.pause());this.el.classList.remove('is-playing');const b=this.el.querySelector('.transport-play');b.innerHTML=playIcon+'<span>Play</span>';b.setAttribute('aria-label',`Play ${titles[this.d.id]}`);}
    setCamera(cam){this.camera=cam;this.el.querySelectorAll('.camera-view').forEach(b=>{const active=b.dataset.camera===cam;b.classList.toggle('is-main',active);b.setAttribute('aria-pressed',active);b.querySelector('.camera-label span').textContent=active?'FOCUSED':'CLICK TO FOCUS';});if(this.event)this.showEvent();}
    selectEvent(id,jump=true){this.event=this.d.events.find(e=>e.id===id);this.el.querySelectorAll('.dip-buttons [data-jump]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.jump===id));this.el.querySelectorAll('[data-loop]').forEach(b=>b.disabled=false);this.showEvent();if(jump){this.setDetails(true);this.seek(this.event.peak_frame);}}
    setDetails(open,{animate=true}={}) {
      if(open===this.detailsOpen&&!this.detailAnimation)return;
      const panel=this.el.querySelector('.dip-panel'),button=this.el.querySelector('.dip-toggle'),transport=this.el.querySelector('.trajectory-transport');
      const from=this.el.offsetHeight;
      this.detailAnimation?.cancel();this.detailAnimation=null;this.detailsOpen=open;
      if(open&&!this.event){const nearest=this.d.events.reduce((a,b)=>Math.abs(a.peak_frame-this.frame)<Math.abs(b.peak_frame-this.frame)?a:b);this.selectEvent(nearest.id,false);}
      if(!open){this.loop=false;this.el.querySelector('[data-loop]').setAttribute('aria-pressed','false');}
      this.el.classList.toggle('is-details-open',open);
      button.setAttribute('aria-expanded',String(open));button.querySelector('[data-detail-label]').textContent=open?'Collapse trajectory':'Expand trajectory';
      panel.hidden=!open;panel.inert=!open;transport.hidden=!open;transport.inert=!open;
      if(!animate||motionReduced.matches||typeof this.el.animate!=='function')return;
      // Keep the camera and progress plot fixed while the rest of the card unfolds.
      const target=this.el.offsetHeight;
      const animation=this.el.animate([{height:`${from}px`},{height:`${target}px`}],{duration:620,easing:'cubic-bezier(.25,.75,.25,1)',fill:'both'});
      this.detailAnimation=animation;
      animation.finished.then(()=>{if(this.detailAnimation!==animation)return;animation.cancel();this.detailAnimation=null;}).catch(()=>{});
    }
    showEvent(){const e=this.event,a=this.annotations[e.id]||{title:'A local setback',description:'Compare the pose and contact configuration before and after the dip across all three camera views.'};
      this.el.querySelector('.dip-copy').innerHTML=`<span class="dip-caption">${e.id} · ${(e.peak_frame/this.d.fps).toFixed(2)}–${(e.trough_frame/this.d.fps).toFixed(2)} s · ${esc((a.confidence||'Visual interpretation').toUpperCase())}</span><h4>${esc(a.title)}</h4><p>${esc(a.description)}</p>${a.cameraHint?`<p class="camera-hint">${esc(a.cameraHint.replace(/cam_([0-2])/g,'Camera $1'))}</p>`:''}`;
      this.el.querySelector('.dip-keyframes').innerHTML=e.keyframes.map(k=>`<button class="keyframe-button" type="button" data-frame="${k.frame_index}" aria-label="View ${k.role} at frame ${k.frame_index}"><img loading="lazy" src="${base+k.images[this.camera]}" alt="${esc(titles[this.d.id])}: ${k.role} of ${e.id}, ${cameraNames[this.camera]}" width="480" height="360"/><span>${k.role}<small>${(k.frame_index/this.d.fps).toFixed(2)}s</small></span></button>`).join('');
      this.el.querySelectorAll('.keyframe-button').forEach(b=>b.onclick=()=>this.seek(+b.dataset.frame));
    }
    async expand(){this.pause();try{await this.activate();if(this.seeking)await this.seekWork;const dialog=document.createElement('dialog');dialog.className='camera-dialog';dialog.innerHTML=`<header><div><span class="trajectory-overline">${esc(titles[this.d.id])} · FRAME ${this.frame}</span><h3>${cameraNames[this.camera]}</h3></div><button type="button" aria-label="Close expanded camera">Close ×</button></header><div class="expanded-camera ${this.interventionFlags[this.frame]===true?'is-intervention':''}"><video muted playsinline src="${base+this.d.cameras[this.camera].src}"></video><span class="camera-intervention">Intervention</span></div><p>Paused at ${fmt(this.frame/this.d.fps)} · Return to the timeline to inspect another frame.</p>`;document.body.append(dialog);dialog.showModal();const v=dialog.querySelector('video');v.addEventListener('loadedmetadata',()=>{v.currentTime=this.frame/this.d.fps;},{once:true});dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{v.pause();dialog.remove();});}catch(e){this.error('Unable to expand this camera.');}}
  }
  // Shared camera frames and curves travel between measured shelf/grid positions.
  class TrajectoryCollection {
    constructor(items) {
      this.items=items;this.open=false;this.moving=null;
      this.el=document.createElement('div');this.el.className='trajectory-collection';
      root.before(this.el);
      this.el.innerHTML=`<div class="trajectory-rack"><div class="rack-eyebrow"><span></span> THE TRAJECTORY COLLECTION <span></span></div><div class="rack-stage"><div class="rack-halo" aria-hidden="true"></div><div class="rack-back" aria-hidden="true"></div><div class="rack-cards"></div><div class="rack-front" aria-hidden="true"><span class="rack-mark">GR–BC <i></i></span><span>04 TRAJECTORIES / 12 VIEWS</span></div></div><button class="collection-expand" type="button" aria-expanded="false" aria-controls="trajectory-collection-open"><span>Expand</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v15m-6-6 6 6 6-6"/></svg></button><p class="rack-hint">Four perspectives on progress. Open the collection.</p></div><div class="collection-open" id="trajectory-collection-open" hidden><div class="collection-toolbar"><div><span class="trajectory-overline">COLLECTION / 04</span><span class="collection-toolbar-title">A closer look at every move.</span></div><button class="collection-collapse" type="button"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 7h14v10H3zM6 3h8v4M7 11h6"/></svg>Back to shelf</button></div></div>`;
      this.rack=this.el.querySelector('.trajectory-rack');this.panel=this.el.querySelector('.collection-open');
      this.expandButton=this.el.querySelector('.collection-expand');this.collapseButton=this.el.querySelector('.collection-collapse');
      const index=document.querySelector('.trajectory-index'),note=document.querySelector('.trajectory-method-note');
      this.panel.append(index,root,note);
      this.el.querySelector('.rack-cards').innerHTML=items.map((p,i)=>{
        const d=p.d,cams=[d.default_camera,...Object.keys(d.cameras).filter(c=>c!==d.default_camera)];
        const line=d.samples.map((s,f)=>`${f?'L':'M'}${(f/(d.frame_count-1)*250+3).toFixed(1)},${(27-s[1]*23).toFixed(1)}`).join(' ');
        return `<button type="button" class="rack-card" data-card="${i}" style="--slot:${i-1.5};--lift:${[20,7,-6,-19][i]}px;--angle:${[-5,-1.5,2,5][i]}deg;--depth:${4-i}" aria-label="Expand collection: ${esc(titles[d.id])}" aria-expanded="false" aria-controls="trajectory-collection-open"><span class="rack-mini"><span class="rack-mini-header"><span class="rack-mini-number">0${i+1}</span><span>${esc(titles[d.id])}</span><span class="rack-mini-dot"></span></span><span class="rack-mini-cameras">${cams.map((cam,j)=>`<img src="${base+d.cameras[cam].poster}" alt="" data-preview-camera="${cam}" width="${j?104:208}" height="${j?72:149}" loading="lazy" decoding="async"/>`).join('')}</span><svg class="rack-mini-trace" viewBox="0 0 256 32" preserveAspectRatio="none" aria-hidden="true"><path d="M3 28H253" class="rack-mini-axis"/><path d="${line}"/></svg><span class="rack-mini-footer"><span>3 SYNCHRONIZED VIEWS</span><span>${(d.duration+1/d.fps).toFixed(1)} s</span></span></span></button>`;
      }).join('');
      this.previews=[...this.el.querySelectorAll('.rack-card')];
      this.previews.forEach((b,i)=>{b.onclick=()=>this.setOpen(true,{focusIndex:i});b.onpointerenter=()=>this.shiver();b.onfocus=()=>this.shiver();});
      this.expandButton.onclick=()=>this.setOpen(true);
      this.collapseButton.onclick=()=>this.setOpen(false);
    }
    shiver(){
      if(this.open||this.moving||motionReduced.matches)return;
      this.previews.forEach((b,i)=>{const inner=b.querySelector('.rack-mini'),angle=getComputedStyle(b).getPropertyValue('--angle').trim();inner.getAnimations().forEach(a=>a.cancel());inner.animate([{transform:`translateY(0) rotate(${angle})`},{transform:`translateY(-4px) rotate(calc(${angle} - 1deg))`,offset:.28},{transform:`translateY(-2px) rotate(calc(${angle} + .8deg))`,offset:.55},{transform:`translateY(-3px) rotate(calc(${angle} - .3deg))`,offset:.78},{transform:`translateY(0) rotate(${angle})`}],{duration:520,delay:i*35,easing:'ease-out'});});
    }
    async setOpen(open,{focusIndex=0,focus=true,instant=false}={}) {
      if(this.moving)return this.moving;
      if(open===this.open)return;
      this.open=open;
      this.moving=this.transition(open,{focusIndex,focus,instant}).finally(()=>{this.moving=null;});
      return this.moving;
    }
    async refreshPreviews() {
      await Promise.allSettled(this.items.map(async(p,i)=>{
        p.pause();
        if(p.seeking)await p.seekWork;
        const preview=this.previews[i],deck=preview.querySelector('.rack-mini-cameras');
        const cameras=[p.camera,...p.videos.map(v=>v.dataset.camera).filter(c=>c!==p.camera)];
        cameras.forEach(cam=>{
          const img=deck.querySelector(`[data-preview-camera="${cam}"]`),video=p.videos.find(v=>v.dataset.camera===cam);
          if(video.readyState>=2&&video.videoWidth){
            // Capture only on shelving; the temporary stills keep the transition frame-aligned.
            try{const canvas=document.createElement('canvas');canvas.width=640;canvas.height=Math.round(640*video.videoHeight/video.videoWidth);canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);img.src=canvas.toDataURL('image/jpeg',.85);}catch{/* Keep the poster if a frame is unavailable. */}
          }
          deck.append(img);
        });
        preview.querySelector('.rack-mini-trace path:last-child').setAttribute('d',p.d.samples.map((v,f)=>`${f?'L':'M'}${(f/(p.d.frame_count-1)*250+3).toFixed(1)},${(27-v[p.raw?0:1]*23).toFixed(1)}`).join(' '));
        await Promise.allSettled([...deck.querySelectorAll('img')].map(img=>img.decode()));
      }));
    }
    measureCard(index,small) {
      const p=this.items[index],card=small?this.previews[index].querySelector('.rack-mini'):p.el;
      // Measure in the card's own coordinate system, before applying its shelf rotation.
      const saved=card.style.transform;if(small)card.style.transform='none';
      const rect=card.getBoundingClientRect();
      const local=node=>{const r=node.getBoundingClientRect();return {x:r.x-rect.x,y:r.y-rect.y,width:r.width,height:r.height};};
      const trace=local(card.querySelector(small?'.rack-mini-trace':'.trace-chart svg'));
      const result={rect,angle:small?parseFloat(getComputedStyle(this.previews[index]).getPropertyValue('--angle')):0,
        number:local(card.querySelector(small?'.rack-mini-number':'.trajectory-number')),
        title:local(card.querySelector(small?'.rack-mini-header > span:nth-child(2)':'.trajectory-header h3')),
        cameras:Object.fromEntries([...card.querySelectorAll(small?'[data-preview-camera]':'.camera-view')].map(n=>[small?n.dataset.previewCamera:n.dataset.camera,local(n)])),
        trace:small?{x:trace.x+trace.width*3/256,y:trace.y+trace.height*4/32,width:trace.width*250/256,height:trace.height*23/32}:{x:trace.x+trace.width*44/680,y:trace.y+trace.height*28/338,width:trace.width*616/680,height:trace.height*140/338}};
      if(small)card.style.transform=saved;
      return result;
    }
    morphCard(index,small,full,origin,open,animations,ghosts) {
      const p=this.items[index],preview=this.previews[index],ghost=document.createElement('div');
      ghost.className='collection-morph-card';ghost.setAttribute('aria-hidden','true');ghost.inert=true;
      ghost.style.zIndex=String(14-index);this.el.append(ghost);ghosts.push(ghost);
      const duration=1440,delay=(open?index:3-index)*65,easing='cubic-bezier(.4,0,.2,1)';
      const run=(node,frames,options={})=>{const a=node.animate(frames,{duration,delay,easing,fill:'both',...options});animations.push(a);};
      const frame=(state,lift=0)=>({transform:`translate(${state.rect.x-origin.x}px,${state.rect.y-origin.y+lift}px) rotate(${state.angle}deg)`,width:`${state.rect.width}px`,height:`${state.rect.height}px`,borderRadius:`${state===small?15:22}px`});
      const lifted={...frame(small,-14),transform:`translate(${small.rect.x-origin.x}px,${small.rect.y-origin.y-14}px) rotate(${small.angle*.55}deg)`};
      const travel=[{...frame(small),offset:0},{...lifted,offset:.14},{...frame(full),offset:1}];
      run(ghost,open?travel:travel.slice().reverse().map(f=>({...f,offset:1-f.offset})));
      // Move each visual independently, so the cameras keep their layout instead of
      // stretching the entire live card (including the controls) from a thumbnail.
      const shared=(node,a,b,resize=false)=>{
        ghost.append(node);node.classList.add('morph-part');node.style.width=`${b.width}px`;node.style.height=`${b.height}px`;
        const at=r=>resize?{transform:`translate(${r.x}px,${r.y}px)`,width:`${r.width}px`,height:`${r.height}px`}:{transform:`translate(${r.x}px,${r.y}px) scale(${r.width/b.width},${r.height/b.height})`};
        const frames=[{...at(a),offset:0},{...at(a),offset:.14},{...at(b),offset:1}];
        run(node,open?frames:frames.slice().reverse().map(f=>({...f,offset:1-f.offset})));
      };
      const typography=(node,source,target)=>{
        const a=getComputedStyle(source),b=getComputedStyle(target);
        const from={fontSize:a.fontSize,lineHeight:a.lineHeight,letterSpacing:a.letterSpacing},to={fontSize:b.fontSize,lineHeight:b.lineHeight,letterSpacing:b.letterSpacing};
        const frames=[{...from,offset:0},{...from,offset:.14},{...to,offset:1}];
        run(node,open?frames:frames.slice().reverse().map(f=>({...f,offset:1-f.offset})));
      };
      const number=p.el.querySelector('.trajectory-number').cloneNode(true);shared(number,small.number,full.number,true);typography(number,preview.querySelector('.rack-mini-number'),p.el.querySelector('.trajectory-number'));
      const title=p.el.querySelector('.trajectory-header h3').cloneNode(true);title.removeAttribute('id');title.className='morph-title';shared(title,small.title,full.title,true);typography(title,preview.querySelector('.rack-mini-header > span:nth-child(2)'),p.el.querySelector('.trajectory-header h3'));
      preview.querySelectorAll('[data-preview-camera]').forEach(img=>{
        const clone=img.cloneNode(true);clone.className='morph-camera';clone.removeAttribute('loading');clone.removeAttribute('data-preview-camera');shared(clone,small.cameras[img.dataset.previewCamera],full.cameras[img.dataset.previewCamera],true);
      });
      const trace=preview.querySelector('.rack-mini-trace').cloneNode(true);trace.removeAttribute('class');trace.classList.add('morph-trace');trace.setAttribute('viewBox','3 4 250 23');trace.querySelector('.rack-mini-axis').remove();shared(trace,small.trace,full.trace);
      run(trace.querySelector('path'),open?[{stroke:'#5686ca',strokeWidth:1.6},{stroke:'#2f6fd5',strokeWidth:2.5}]:[{stroke:'#2f6fd5',strokeWidth:2.5},{stroke:'#5686ca',strokeWidth:1.6}]);
      // Settle the shared visuals before crossfading the live controls and labels.
      if(open)run(ghost,[{opacity:1},{opacity:0}],{duration:240,delay:delay+duration-160,easing:'ease-in-out'});
      else run(ghost,[{opacity:0,offset:0},{opacity:1,offset:.14},{opacity:1,offset:.84},{opacity:0,offset:1}],{duration:duration+80,easing:'linear'});
      if(open)run(p.el,[{opacity:0},{opacity:1}],{duration:240,delay:delay+duration-160,easing:'ease-in-out'});
      else{
        run(p.el,[{opacity:1},{opacity:0}],{duration:220,delay:0,easing:'ease-in-out'});
        run(preview,[{opacity:0},{opacity:1}],{duration:240,delay:delay+duration-160,easing:'ease-in-out'});
      }
    }
    async transition(open,{focusIndex,focus,instant}) {
      const animate=!instant&&!motionReduced.matches&&typeof this.el.animate==='function';
      const animations=[],ghosts=[];
      this.expandButton.disabled=true;this.collapseButton.disabled=true;
      this.rack.inert=true;this.panel.inert=true;
      if(!open)await this.refreshPreviews();
      this.previews.forEach(b=>b.querySelector('.rack-mini').getAnimations().forEach(a=>a.cancel()));
      this.el.classList.add('is-transitioning');
      const startHeight=this.el.getBoundingClientRect().height;
      const before=animate?this.items.map((_,i)=>this.measureCard(i,open)):[];
      try{
        let shelfGhost;
        if(open&&animate){
          shelfGhost=this.rack.cloneNode(true);shelfGhost.classList.add('rack-ghost');shelfGhost.setAttribute('aria-hidden','true');shelfGhost.inert=true;
          shelfGhost.querySelector('.rack-cards').style.visibility='hidden';this.el.append(shelfGhost);ghosts.push(shelfGhost);
        }
        if(!open){this.panel.style.cssText='position:absolute;inset:0 0 auto;';this.rack.hidden=false;}
        else{this.rack.hidden=true;this.panel.hidden=false;}
        const endHeight=(open?this.panel:this.rack).getBoundingClientRect().height;
        if(animate){
          const after=this.items.map((_,i)=>this.measureCard(i,!open)),origin=this.el.getBoundingClientRect();
          const run=(node,frames,options)=>animations.push(node.animate(frames,{fill:'both',...options}));
          this.el.style.height=`${startHeight}px`;
          run(this.el,[{height:`${startHeight}px`},{height:`${endHeight}px`}],{duration:1715,easing:'cubic-bezier(.4,0,.2,1)'});
          if(shelfGhost)run(shelfGhost,[{opacity:1},{opacity:0}],{duration:650,delay:120,easing:'ease-in-out'});
          if(!open)run(this.rack,[{opacity:0},{opacity:1}],{duration:550,delay:1050,easing:'ease-in-out'});
          this.items.forEach((_,i)=>this.morphCard(i,open?before[i]:after[i],open?after[i]:before[i],origin,open,animations,ghosts));
          for(const node of [this.panel.querySelector('.collection-toolbar'),this.panel.querySelector('.trajectory-index'),this.panel.querySelector('.trajectory-method-note')]){
            run(node,open?[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}]:[{opacity:1},{opacity:0}],{duration:400,delay:open?1130:0,easing:'ease-in-out'});
          }
          await Promise.allSettled(animations.map(a=>a.finished));
        }
      }finally{
        this.rack.hidden=open;this.panel.hidden=!open;
        if(!open)this.items.forEach(p=>p.setDetails(false,{animate:false}));
        this.panel.style.cssText='';animations.forEach(a=>a.cancel());ghosts.forEach(n=>n.remove());
        this.el.style.height='';this.el.classList.remove('is-transitioning');
        this.rack.inert=open;this.panel.inert=!open;this.expandButton.disabled=false;this.collapseButton.disabled=false;
        this.expandButton.setAttribute('aria-expanded',String(open));this.previews.forEach(b=>b.setAttribute('aria-expanded',String(open)));
        if(!open&&location.hash.startsWith('#trajectory-'))history.replaceState(null,'','#trajectories');
        if(focus){if(open)this.items[focusIndex].el.focus({preventScroll:true});else this.expandButton.focus({preventScroll:true});}
      }
    }
  }

  async function init(){try{const [manifest,annotations]=await Promise.all([json(base+'manifest.json'),json(base+'annotations.json')]);const modules=await Promise.all(manifest.map(m=>json(base+m.data)));root.innerHTML='';modules.forEach((d,i)=>players.push(new Trajectory(d,i,annotations[d.id])));
    collection=new TrajectoryCollection(players);
    const followHash=async()=>{if(!location.hash.startsWith('#trajectory-'))return;const target=players.find(p=>`#${p.el.id}`===location.hash);if(target){await collection.setOpen(true,{focus:false,instant:true});target.el.scrollIntoView({block:'start',behavior:'instant'});}};
    await followHash();window.addEventListener('hashchange',followHash);
    const lazy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){players.find(p=>p.el===e.target).activate().catch(()=>{});lazy.unobserve(e.target);}}),{rootMargin:'150px'});players.forEach(p=>lazy.observe(p.el));
    const visibility=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)players.find(p=>p.el===e.target).pause();}));players.forEach(p=>visibility.observe(p.el));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pause());});
  }catch(e){root.innerHTML='<p class="trajectory-load-error" role="alert">The trajectories could not load. Please reload this page to try again.</p>';}}
  init();
})();

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
  let activePlayer = null;
  const players = [];
  async function json(url) {const r=await fetch(dataVersion?`${url}?v=${dataVersion}`:url);if(!r.ok)throw Error(`Unable to load ${url}`);return r.json();}
  class Trajectory {
    constructor(data,index,annotations) {
      this.d=data;this.annotations=annotations||{};this.frame=0;this.camera=data.default_camera;this.playing=false;this.speed=1;this.raw=false;this.loop=false;this.event=null;this.pending=null;this.seeking=false;this.loaded=false;this.token=0;
      this.interventionFlags=data.intervention?.flags||[];this.interventionRanges=[];
      let start=null;for(let i=0;i<=this.interventionFlags.length;i++){if(this.interventionFlags[i]===true){if(start===null)start=i;}else if(start!==null){this.interventionRanges.push([start,i]);start=null;}}
      this.el=document.createElement('article');this.el.className='trajectory';this.el.id=`trajectory-${data.id}`;this.el.setAttribute('aria-labelledby',`${data.id}-title`);
      const cameras=[this.camera,...Object.keys(data.cameras).filter(c=>c!==this.camera)];
      this.el.innerHTML=`<header class="trajectory-header"><div class="trajectory-identity"><span class="trajectory-number">0${index+1}</span><div><span class="trajectory-overline">TRAJECTORY / EPISODE ${String(data.id.split('ep')[1]).padStart(3,'0')}</span><h3 id="${data.id}-title">${titles[data.id]}</h3></div></div><div class="trajectory-tags"><span><i></i>Successful rollout</span><span>${(data.duration+1/data.fps).toFixed(1)} s</span><span>${data.events.length} dips to explore</span></div></header>
      <div class="trajectory-workspace"><div class="camera-deck" aria-label="Three synchronized camera views">${cameras.map(cam=>`<button class="camera-view ${cam===this.camera?'is-main':''}" type="button" data-camera="${cam}" aria-label="Focus ${cameraNames[cam]} for ${titles[data.id]}" aria-pressed="${cam===this.camera}"><video muted playsinline preload="none" poster="${base+data.cameras[cam].poster}" data-camera="${cam}"></video><span class="camera-label">${cameraNames[cam]}<span>${cam===this.camera?'FOCUSED':'CLICK TO FOCUS'}</span></span><span class="camera-frame">FRAME 0000</span><span class="camera-intervention" aria-hidden="true">Intervention</span></button>`).join('')}<span class="camera-sync" aria-live="polite">3 VIEWS · ONE TIMELINE</span></div>
      <div class="signal-panel"><div class="signal-heading"><div><span class="trajectory-overline">FOLLOW THE CONSEQUENCE</span><h4>Every advance. Every setback.</h4></div><button class="chart-mode" type="button" aria-pressed="false" title="Toggle raw or 15-frame smoothed graph progress">Raw trace</button></div><div class="signal-metrics"><div><span class="metric-dot progress-dot"></span><span>Graph progress</span><strong data-readout="progress">0.000</strong></div><div><span class="metric-dot weight-dot"></span><span>Transition weight</span><strong data-readout="weight">0.000</strong></div></div><div class="trace-chart" role="group" aria-label="Interactive progress and weight charts. Drag to inspect a frame."></div><div class="signal-footnote"><span class="curve-mode-label">15-frame moving average</span><span class="intervention-legend" title="Recorded human intervention"><i aria-hidden="true"></i>Intervention</span><span>Drag chart ↔</span></div></div></div>
      <div class="trajectory-transport"><button class="transport-play" type="button" aria-label="Play ${titles[data.id]}">${playIcon}<span>Play</span></button><div class="frame-step"><button type="button" data-step="-1" aria-label="Previous frame for ${titles[data.id]}">−1</button><button type="button" data-step="1" aria-label="Next frame for ${titles[data.id]}">+1</button></div><div class="timeline-control"><div class="timeline-labels"><span data-readout="time">0:00.00</span><span data-readout="frame">FRAME 0000 / ${data.frame_count-1}</span><span>${fmt(data.duration)}</span></div><input class="trajectory-slider" type="range" min="0" max="${data.frame_count-1}" step="1" value="0" aria-label="Scrub ${titles[data.id]} trajectory"/><div class="timeline-events">${data.events.map(e=>`<button type="button" data-jump="${e.id}" style="left:${e.peak_frame/(data.frame_count-1)*100}%" aria-label="Jump to ${e.id} in ${titles[data.id]}">${e.id}</button>`).join('')}</div></div><label class="speed-control"><span>Speed</span><select aria-label="Playback speed for ${titles[data.id]}"><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label></div>
      <div class="dip-explorer"><div class="dip-selector"><span class="trajectory-overline">INSPECT A DIP</span><div class="dip-buttons">${data.events.map(e=>`<button type="button" data-jump="${e.id}" aria-pressed="false"><span>${e.id}</span><strong>−${e.smoothed_drop.toFixed(3)}</strong><small>${(e.peak_frame/data.fps).toFixed(1)} s</small></button>`).join('')}</div><div class="dip-tools"><button type="button" data-loop aria-pressed="false" disabled>Loop dip</button><button type="button" data-expand>Expand camera ↗</button></div></div><div class="dip-detail"><div class="dip-copy"><span class="dip-caption">SMALL SETBACKS, IN CONTEXT</span><h4>What changed when progress fell?</h4><p>Select a dip to compare the moments before and after it. Switch the focused camera to inspect the same motion from another view.</p></div><div class="dip-keyframes" aria-label="Before, peak, trough, and after keyframes"></div></div></div>
      <div class="trajectory-status" role="status" aria-live="polite"></div>`;
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
      const spans=this.d.events.map(e=>{let l=Math.max(a,e.paper_highlight_span_frames[0]),r=Math.min(b,e.paper_highlight_span_frames[1]);return r>l?`<rect x="${x(l)}" y="22" width="${x(r)-x(l)}" height="277" class="drop-region"/><text x="${x((l+r)/2)}" y="16" text-anchor="middle" class="drop-chart-label">${e.id}</text>`:'';}).join('');
      const interventions=this.interventionRanges.map(([start,end])=>{const l=Math.max(a,start),r=Math.min(b,end);return r>l?`<g><rect x="${x(l)}" y="22" width="${x(r)-x(l)}" height="146" class="intervention-region"/><path d="M${x(l)} 23H${x(r)}" class="intervention-edge"/></g>`:'';}).join('');
      this.chart.innerHTML=`<svg viewBox="0 0 680 338" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fill-${this.d.id}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#2f6fd5" stop-opacity=".15"/><stop offset="1" stop-color="#2f6fd5" stop-opacity="0"/></linearGradient><clipPath id="clip-${this.d.id}"><rect x="44" y="22" width="616" height="278"/></clipPath></defs>${interventions}${grid}${spans}<text x="44" y="205" class="weight-axis-title">TRANSITION WEIGHT</text><text x="33" y="225" text-anchor="end">1.5</text><text x="33" y="296" text-anchor="end">0</text><path d="M44 220H660M44 292H660" class="chart-grid"/><g clip-path="url(#clip-${this.d.id})"><path d="${path(prog)}L660 168H44Z" fill="url(#fill-${this.d.id})"/><path d="${path(prog)}" class="progress-trace"/><path d="${path(weight)}" class="weight-trace"/><g class="chart-cursor"><path d="M0 22V299"/><circle class="progress-point" r="4.5"/><circle class="weight-point" r="3.5"/></g></g>${ticks}</svg>`;
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
    selectEvent(id){this.event=this.d.events.find(e=>e.id===id);this.el.querySelectorAll('.dip-buttons [data-jump]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.jump===id));this.el.querySelectorAll('[data-loop]').forEach(b=>b.disabled=false);this.showEvent();this.seek(this.event.peak_frame);}
    showEvent(){const e=this.event,a=this.annotations[e.id]||{title:'A local setback',description:'Compare the pose and contact configuration before and after the dip across all three camera views.'};
      this.el.querySelector('.dip-copy').innerHTML=`<span class="dip-caption">${e.id} · ${(e.peak_frame/this.d.fps).toFixed(2)}–${(e.trough_frame/this.d.fps).toFixed(2)} s · ${esc((a.confidence||'Visual interpretation').toUpperCase())}</span><h4>${esc(a.title)}</h4><p>${esc(a.description)}</p>${a.cameraHint?`<p class="camera-hint">${esc(a.cameraHint.replace(/cam_([0-2])/g,'Camera $1'))}</p>`:''}`;
      this.el.querySelector('.dip-keyframes').innerHTML=e.keyframes.map(k=>`<button class="keyframe-button" type="button" data-frame="${k.frame_index}" aria-label="View ${k.role} at frame ${k.frame_index}"><img loading="lazy" src="${base+k.images[this.camera]}" alt="${esc(titles[this.d.id])}: ${k.role} of ${e.id}, ${cameraNames[this.camera]}" width="480" height="360"/><span>${k.role}<small>${(k.frame_index/this.d.fps).toFixed(2)}s</small></span></button>`).join('');
      this.el.querySelectorAll('.keyframe-button').forEach(b=>b.onclick=()=>this.seek(+b.dataset.frame));
    }
    async expand(){this.pause();try{await this.activate();if(this.seeking)await this.seekWork;const dialog=document.createElement('dialog');dialog.className='camera-dialog';dialog.innerHTML=`<header><div><span class="trajectory-overline">${esc(titles[this.d.id])} · FRAME ${this.frame}</span><h3>${cameraNames[this.camera]}</h3></div><button type="button" aria-label="Close expanded camera">Close ×</button></header><div class="expanded-camera ${this.interventionFlags[this.frame]===true?'is-intervention':''}"><video muted playsinline src="${base+this.d.cameras[this.camera].src}"></video><span class="camera-intervention">Intervention</span></div><p>Paused at ${fmt(this.frame/this.d.fps)} · Return to the timeline to inspect another frame.</p>`;document.body.append(dialog);dialog.showModal();const v=dialog.querySelector('video');v.addEventListener('loadedmetadata',()=>{v.currentTime=this.frame/this.d.fps;},{once:true});dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{v.pause();dialog.remove();});}catch(e){this.error('Unable to expand this camera.');}}
  }
  async function init(){try{const [manifest,annotations]=await Promise.all([json(base+'manifest.json'),json(base+'annotations.json')]);const modules=await Promise.all(manifest.map(m=>json(base+m.data)));root.innerHTML='';modules.forEach((d,i)=>players.push(new Trajectory(d,i,annotations[d.id])));
    if(location.hash.startsWith('#trajectory-'))document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start'});
    const lazy=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){players.find(p=>p.el===e.target).activate().catch(()=>{});lazy.unobserve(e.target);}}),{rootMargin:'150px'});players.forEach(p=>lazy.observe(p.el));
    const visibility=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting)players.find(p=>p.el===e.target).pause();}));players.forEach(p=>visibility.observe(p.el));
    document.addEventListener('visibilitychange',()=>{if(document.hidden)players.forEach(p=>p.pause());});
  }catch(e){root.innerHTML='<p class="trajectory-load-error" role="alert">The trajectories could not load. Please reload this page to try again.</p>';}}
  init();
})();

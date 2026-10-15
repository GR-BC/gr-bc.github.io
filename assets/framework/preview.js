import {mountFramework} from './framework.js?v=e7a27d8d7140';
const $=s=>document.querySelector(s),mount=$('#framework-mount');let controller,selected=null;
const fields=[...document.querySelectorAll('[data-property]')];
const defaults={visible:true,dx:0,dy:0,scale:1,rotate:0,opacity:1};
function revealBounds(bounds){if(!controller||!bounds)return;const box=$('.drawing-scroll'),svg=mount.querySelector('svg');if(box.scrollWidth<=box.clientWidth+1)return;const scale=svg.getBoundingClientRect().width/1603;box.scrollTo({left:Math.max(0,(bounds[0]+bounds[2]/2)*scale-box.clientWidth/2),behavior:controller.getState().reducedMotion?'auto':'smooth'});}
function inspector(component){
  selected=component?.id||null;$('#edit-fields').disabled=!component;
  $('#selected-title').textContent=component?.label||'选择一个组件';$('#selected-stage').textContent=component?.stage||'—';
  $('#selected-description').textContent=component?.description||'点击图中的组件，或从目录选择。原始文字轮廓保留，可与所属组件一起移动和缩放。';
  $('#selected-id').textContent=component?.id||'No component selected';$('#selected-type').textContent=component?.type||'';
  $('#original-bounds').textContent=component?`原始位置 [x, y, width, height]：${component.bounds.map(n=>n.toFixed(1)).join(' · ')}`:'坐标系：1603 × 777 · 所有编辑均为相对原图的调整';
  const v=component?controller.getComponent(component.id).edit:defaults;fields.forEach(f=>f.value=v[f.dataset.property]);$('#component-visible').checked=v.visible;
  const related=$('#related-components');related.replaceChildren();
  if(component?.related.length)component.related.forEach(id=>{const b=document.createElement('button');b.type='button';b.textContent=id;b.onclick=()=>controller.selectComponent(id);related.append(b);});else related.textContent=component?'此组件没有额外关联。':'选择节点或连线后，可在这里跳转到关联组件。';
  document.querySelectorAll('.component-row').forEach(row=>row.classList.toggle('is-selected',row.dataset.id===selected));
}
function renderList(){
  if(!controller)return;const query=$('#component-search').value.toLowerCase(),stage=$('#stage-filter').value;
  const list=controller.manifest.components.filter(c=>(!stage||c.stage===stage)&&`${c.label} ${c.id} ${c.type}`.toLowerCase().includes(query));
  $('#result-count').textContent=`${list.length} / ${controller.manifest.components.length}`;
  const fragment=document.createDocumentFragment();
  for(const c of list){
    const row=document.createElement('div');row.className='component-row';row.dataset.id=c.id;row.classList.toggle('is-selected',c.id===selected);row.classList.toggle('is-hidden',!controller.getComponent(c.id).edit.visible);
    const b=document.createElement('button');b.type='button';b.className='component-pick';b.setAttribute('aria-label',`Select ${c.id}`);const badge=document.createElement('span');badge.className='list-stage';badge.textContent=c.stage;const text=document.createElement('span'),title=document.createElement('b'),sub=document.createElement('small');title.textContent=c.label;sub.textContent=c.id;text.append(title,sub);b.append(badge,text);b.onclick=()=>{controller.selectComponent(c.id);if(matchMedia('(max-width:760px)').matches)$('.inspector').scrollIntoView({block:'start',behavior:controller.getState().reducedMotion?'auto':'smooth'});};
    const eye=document.createElement('button');eye.type='button';eye.className='visibility-toggle';eye.textContent=controller.getComponent(c.id).edit.visible?'◉':'○';eye.setAttribute('aria-label',`Toggle visibility of ${c.id}`);eye.setAttribute('aria-pressed',String(controller.getComponent(c.id).edit.visible));eye.onclick=()=>controller.setComponent(c.id,{visible:!controller.getComponent(c.id).edit.visible});row.append(b,eye);fragment.append(row);
  }
  $('#component-list').replaceChildren(fragment);
}
function updateState(s){
  const activeIntent=s.playing&&!s.selected&&!s.focusedStage;$('#play').textContent=activeIntent?'Pause loop':'Play loop';$('#play').setAttribute('aria-pressed',String(activeIntent));$('#speed').value=String(s.speed);
  $('#motion-status').textContent=s.reducedMotion?'Reduced motion · static view':s.running?'Loop in motion':!s.visible?'Loop held · out of view':s.playing?'Exploring · loop held':'Loop paused';
  document.querySelectorAll('.stage-tabs [data-stage]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.stage===(s.focusedStage||s.phase))));
}
mount.addEventListener('framework:select',e=>{inspector(e.detail);if(e.detail)revealBounds(e.detail.bounds);});
mount.addEventListener('framework:state',e=>updateState(e.detail));
mount.addEventListener('framework:phase',e=>{$('#stage-description').textContent=e.detail.description;updateState(controller.getState());});
mount.addEventListener('framework:edit',()=>{renderList();if(selected)inspector(controller.getComponent(selected));});
mount.addEventListener('framework:reset',()=>{renderList();$('#edit-error').textContent='';$('#layout-panel').hidden=true;});
async function load(){
  $('#remount').disabled=true;$('#play').disabled=true;
  try{controller=await mountFramework(mount,{reducedMotion:$('#static-mode').checked});window.frameworkStudio=controller;mount.querySelector('.loading-message')?.remove();mount.setAttribute('aria-busy','false');$('#component-count').textContent=`${controller.manifest.components.length} components`;$('#play').disabled=false;renderList();inspector(null);updateState(controller.getState());$('#load-error').hidden=true;}
  catch(e){$('#load-error').textContent='主图组件未能加载，请刷新页面重试。';$('#load-error').hidden=false;console.error(e);}
  finally{$('#remount').disabled=false;}
}
$('#play').onclick=()=>{if(!controller)return;const s=controller.getState();if(s.playing&&!s.selected&&!s.focusedStage)controller.pause();else controller.play();};
$('#speed').onchange=e=>controller?.setSpeed(e.target.value);
$('#static-mode').onchange=e=>controller?.setReducedMotion(e.target.checked);
$('#reset').onclick=()=>controller?.reset();
$('#show-all').onclick=()=>{controller?.focusStage(null);inspector(null);};
document.querySelectorAll('.stage-tabs [data-stage]').forEach(b=>b.onclick=()=>{controller?.focusStage(b.dataset.stage);inspector(null);$('#stage-description').textContent=controller.config.stages[b.dataset.stage].description;revealBounds(controller.manifest.stages.find(s=>s.id===b.dataset.stage).bounds);});
$('#component-search').oninput=renderList;$('#stage-filter').onchange=renderList;
fields.forEach(f=>{f.oninput=()=>{if(f.value!==''&&f.validity.valid)f.onchange();};f.onkeydown=e=>{if(e.key==='Enter')$('#apply-edits').click();};f.onchange=()=>{if(!selected)return;try{controller.setComponent(selected,{[f.dataset.property]:Number(f.value)});$('#edit-error').textContent='';}catch(e){$('#edit-error').textContent=e.message;}};});
$('#apply-edits').onclick=()=>{if(!selected)return;try{const patch=Object.fromEntries(fields.map(f=>[f.dataset.property,Number(f.value)]));patch.visible=$('#component-visible').checked;controller.setComponent(selected,patch);$('#edit-error').textContent='';}catch(e){$('#edit-error').textContent=e.message;}};
$('#component-visible').onchange=e=>{if(selected)controller.setComponent(selected,{visible:e.target.checked});};
$('#component-reset').onclick=()=>{if(selected)controller.setComponent(selected,defaults);};
$('#solo').onclick=()=>{if(selected){controller.isolateStage(controller.getComponent(selected).stage);inspector(null);}};
$('#export-layout').onclick=()=>{if(controller){$('#layout-output').value=JSON.stringify(controller.exportLayout(),null,2);$('#layout-panel').hidden=false;}};
$('#remount').onclick=load;
load();

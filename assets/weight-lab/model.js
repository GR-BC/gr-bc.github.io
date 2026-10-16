// Illustrative functions, not experimental trajectories. Section 4.3 defines
// one gated weight rule; the three examples expose its accepted and zero branches.
export const parameters = Object.freeze({deltaMin:.003, eta:.03, beta:.5, gamma:20, wMin:.5, wMax:1.5});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = u => u*u*(3-2*u);
export const examples = [
  {id:'forward', title:'Stable progress', label:'Net gain', symbol:'Δ', value:.06, min:-.02, max:.12, step:.001},
  {id:'stalled', title:'Too little progress', label:'Net gain', symbol:'Δ', value:.001, min:-.015, max:.025, step:.0005},
  {id:'regressed', title:'A hidden setback', label:'Regression depth', symbol:'d', value:.08, min:0, max:.12, step:.001},
];
export function progressAt(id, value, u) {
  u=clamp(u,0,1);
  if(id==='forward')return .4+value*smooth(u)+.002*Math.sin(u*Math.PI*4)*u*(1-u);
  if(id==='stalled')return .4+value*smooth(u)+.007*Math.sin(u*Math.PI*2)*Math.sin(u*Math.PI);
  return u<=.44 ? .4-value*smooth(u/.44) : .4-value+(value+.06)*smooth((u-.44)/.56);
}
export function sampleProgress(id,value,count=201) {
  return Array.from({length:count},(_,i)=>progressAt(id,value,i/(count-1)));
}
export function evaluateChunk(samples, p=parameters) {
  if(samples.length<2||samples.some(v=>!Number.isFinite(v)))return {delta:0,depth:0,weight:0,reason:'unreachable',minimum:0};
  const minimum=Math.min(...samples),delta=samples.at(-1)-samples[0],depth=samples[0]-minimum;
  // Preserve the paper's strict gain boundary and inclusive depth boundary
  // despite floating-point subtraction at a slider's exact threshold.
  const epsilon=1e-12;
  const reason=delta<=p.deltaMin+epsilon?'progress':depth>p.eta+epsilon?'regression':'keep';
  const weight=reason==='keep'?clamp(1+p.beta*Math.tanh(p.gamma*delta),p.wMin,p.wMax):0;
  return {delta,depth,weight,reason,minimum};
}

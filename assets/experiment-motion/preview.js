import { mountExperimentMotion } from './experiment-motion.js?v=20261015-1';
const embed = new URLSearchParams(location.search).has('embed');
if (embed) document.body.classList.add('is-embed');
const code = `<div id="grbc-experiment-results"></div>
<script type="module">
  import { mountExperimentMotion } from
    'https://gr-bc.github.io/assets/experiment-motion/experiment-motion.js?v=20261015-1';
  const experiment = await mountExperimentMotion(
    document.querySelector('#grbc-experiment-results')
  );
<\/script>`;
const dialog = document.querySelector('#embed-dialog');
const textarea = document.querySelector('#embed-code'); textarea.value = code;
async function copyCode() {
  try {
    await navigator.clipboard.writeText(code);
    document.querySelector('#copy-embed').textContent = '✓ Embed code copied';
    document.querySelector('#copy-dialog').textContent = '✓ Copied';
    document.querySelector('#copy-status').textContent = 'Ready to paste into your homepage HTML.';
  } catch {
    if (!dialog.open) dialog.showModal(); textarea.focus(); textarea.select();
    document.querySelector('#copy-status').textContent = 'Select and copy the code above.';
  }
}
document.querySelector('#copy-embed').addEventListener('click', copyCode);
document.querySelector('#copy-dialog').addEventListener('click', copyCode);
document.querySelector('#open-embed').addEventListener('click', () => dialog.showModal());
document.querySelector('#close-embed').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close(); } });
try {
  const figure = await mountExperimentMotion(document.querySelector('#experiment-figure'));
  document.querySelector('#static-preview').addEventListener('change', event => figure.setReducedMotion(event.target.checked ? true : 'system'));
  // Optional iframe integration. Parents must validate origin and source before resizing.
  if (embed && window.parent !== window) {
    const notify = () => window.parent.postMessage({ type: 'grbc-experiment:resize', height: Math.ceil(document.documentElement.getBoundingClientRect().height) }, location.origin);
    new ResizeObserver(notify).observe(document.body); notify();
  }
  window.addEventListener('pagehide', event => { if (!event.persisted) figure.destroy(); });
} catch (error) { console.error('Experiment figure:', error); }

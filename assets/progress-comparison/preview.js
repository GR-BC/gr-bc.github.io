import { mountProgressComparison } from './comparison.js?v=1d8600ec2191';
const params = new URLSearchParams(location.search);
const embedded = params.has('embed');
if (embedded) document.body.classList.add('is-embed');
const embedCode = `<div data-progress-comparison></div>\n<script type="module" src="https://gr-bc.github.io/assets/progress-comparison/embed.js"></script>`;
document.querySelector('#embed-code').textContent = embedCode;
const container = document.querySelector('#progress-comparison');
let comparison;
try { comparison = await mountProgressComparison(container, { reducedMotion: params.has('reduced-motion') }); }
catch (error) { console.error('Progress comparison:', error); }
for (const button of document.querySelectorAll('[data-copy-embed]')) {
  button.addEventListener('click', async () => {
    const toast = document.querySelector('.preview-toast');
    try { await navigator.clipboard.writeText(embedCode); toast.textContent = 'Embed snippet copied. Paste it into your homepage.'; }
    catch { document.querySelector('.preview-integration').open = true; toast.textContent = 'Copy the snippet shown below to embed the interaction.'; }
  });
}
const reduced = document.querySelector('.preview-motion');
reduced.setAttribute('aria-pressed', String(params.has('reduced-motion')));
reduced.addEventListener('click', () => {
  const value = reduced.getAttribute('aria-pressed') !== 'true';
  reduced.setAttribute('aria-pressed', String(value)); comparison?.setReducedMotion(value);
});
const resizeObserver = new ResizeObserver(() => {
  if (embedded && window.parent !== window) window.parent.postMessage({ type: 'progress-comparison:resize', height: document.documentElement.scrollHeight }, location.origin);
});
resizeObserver.observe(document.body);
window.addEventListener('pagehide', event => { if (!event.persisted) { comparison?.destroy(); resizeObserver.disconnect(); } });

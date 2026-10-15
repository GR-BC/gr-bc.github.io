import { mountProgressComparison } from './comparison.js?v=1d8600ec2191';
// Paste the two-line snippet from the preview page. Several figures may coexist.
const stylesheet = new URL('comparison.css', import.meta.url).href;
let link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(link => link.href === stylesheet);
if (!link) {
  link = document.createElement('link'); link.rel = 'stylesheet'; link.href = stylesheet;
  const loaded = new Promise((resolve, reject) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', () => reject(new Error('Progress comparison stylesheet could not load.')), { once: true });
  });
  document.head.append(link);
  await loaded;
} else if (!link.sheet) {
  await new Promise((resolve, reject) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', reject, { once: true });
  });
}
await Promise.all([...document.querySelectorAll('[data-progress-comparison]')].map(async container => {
  if (container.dataset.progressComparison === 'mounted') return;
  container.dataset.progressComparison = 'mounting';
  try { await mountProgressComparison(container); container.dataset.progressComparison = 'mounted'; }
  catch (error) { container.dataset.progressComparison = 'error'; console.error('Progress comparison:', error); }
}));
export { mountProgressComparison };

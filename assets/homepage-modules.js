import { mountExperimentMotion } from './experiment-motion/experiment-motion.js?v=cd01621ded04';
import { mountProgressComparison } from './progress-comparison/comparison.js?v=1d8600ec2191';

const instances = [];
const modules = {
  experiments: host => mountExperimentMotion(host, { intro: false }),
  comparison: host => mountProgressComparison(host),
};

await Promise.all([...document.querySelectorAll('[data-homepage-module]')].map(async shell => {
  const host = shell.querySelector('[data-module-host]');
  const mount = modules[shell.dataset.homepageModule];
  if (!host || !mount) return;
  try {
    const instance = await mount(host);
    instances.push(instance);
    shell.dataset.state = 'ready';
  } catch (error) {
    // Keep the original paper figure readable if the interactive asset fails.
    host.replaceChildren();
    shell.dataset.state = 'error';
    console.error(`Homepage ${shell.dataset.homepageModule} unavailable`, error);
  }
}));

window.addEventListener('pagehide', event => {
  if (!event.persisted) instances.forEach(instance => instance.destroy());
});

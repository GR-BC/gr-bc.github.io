const comparison = document.querySelector('[data-estimator-table]');

if (comparison) {
  const rows = [...comparison.querySelectorAll('tbody tr')];
  const replay = comparison.querySelector('.ec-replay');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let animations = [];

  // Keep the source values readable without JavaScript. Bars are a visual cue only.
  comparison.querySelectorAll('[data-score]').forEach(cell => {
    const meter = document.createElement('span');
    const fill = document.createElement('span');
    meter.className = 'ec-meter';
    meter.setAttribute('aria-hidden', 'true');
    fill.className = 'ec-fill';
    fill.style.width = `${Math.max(0, Math.min(1, Number(cell.dataset.score))) * 100}%`;
    meter.append(fill);
    cell.append(meter);
  });

  function stop() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }

  function play() {
    stop();
    if (reducedMotion.matches || document.hidden) return;
    rows.forEach((row, index) => {
      const delay = index * 110;
      animations.push(row.animate([
        { opacity:0, transform:'translateY(12px)' },
        { opacity:1, transform:'translateY(0)' },
      ], { duration:550, delay, easing:'cubic-bezier(.2,.75,.25,1)', fill:'backwards' }));
      row.querySelectorAll('.ec-fill').forEach((fill, column) => {
        animations.push(fill.animate([
          { transform:'scaleX(0)' },
          { transform:'scaleX(1)' },
        ], { duration:850, delay:delay + 120 + column * 45, easing:'cubic-bezier(.16,1,.3,1)', fill:'backwards' }));
      });
    });
  }

  replay.hidden = reducedMotion.matches;
  replay.addEventListener('click', play);
  reducedMotion.addEventListener('change', () => {
    replay.hidden = reducedMotion.matches;
    if (reducedMotion.matches) stop();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });

  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      play();
      observer.disconnect();
    }
  }, { threshold:0.2 });
  observer.observe(comparison);
}

// A brief sketch: episode outcome first, local credit second. No animation loop.
const section = document.querySelector('#challenge');
if (section) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cases = [...section.querySelectorAll('[data-motivation-case]')];
  const active = new Map();
  let visible = false;
  let introduced = false;

  function stop(button) {
    active.get(button)?.forEach(animation => animation.cancel());
    active.delete(button);
    button.dataset.playing = 'false';
  }

  function play(button, delay = 0) {
    stop(button);
    if (motion.matches) return;
    const draw = button.querySelector('[data-motivation-draw]');
    const chunk = button.querySelector('[data-motivation-chunk]');
    const end = button.querySelector('[data-motivation-end]');
    const animations = [
      draw.animate([
        { strokeDashoffset: 1, opacity: .4 },
        { strokeDashoffset: 0, opacity: 1 }
      ], { duration: 1050, delay, easing: 'cubic-bezier(.3,.1,.25,1)', fill: 'backwards' }),
      end.animate([
        { transform: 'scale(0)', opacity: 0 },
        { transform: 'scale(1.5)', opacity: 1, offset: .65 },
        { transform: 'scale(1)', opacity: 1 }
      ], { duration: 380, delay: delay + 900, fill: 'backwards' }),
      chunk.animate([
        { opacity: 0, transform: 'translateY(0)' },
        { opacity: 1, transform: 'translateY(-4px)', offset: .55 },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 800, delay: delay + 950, easing: 'cubic-bezier(.22,.7,.2,1)', fill: 'backwards' })
    ];
    active.set(button, animations);
    button.dataset.playing = 'true';
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (active.get(button) === animations) {
        active.delete(button);
        button.dataset.playing = 'false';
      }
    }).catch(() => {}); // Replay / reduced-motion changes intentionally cancel.
    syncPlayback();
  }

  function syncPlayback() {
    const paused = !visible || document.hidden;
    active.forEach(animations => animations.forEach(animation => {
      if (paused) animation.pause();
      else animation.play();
    }));
  }

  cases.forEach(button => button.addEventListener('click', () => play(button)));
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible && !introduced) {
      introduced = true;
      cases.forEach((button, index) => play(button, index * 180));
    }
    syncPlayback();
  }, { threshold: .25 });
  observer.observe(section);
  document.addEventListener('visibilitychange', syncPlayback);
  motion.addEventListener('change', () => {
    if (motion.matches) cases.forEach(stop);
  });
}

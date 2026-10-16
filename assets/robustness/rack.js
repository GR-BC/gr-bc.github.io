const section = document.querySelector('[data-robustness-rack]');
if (section) mountRack(section);

function mountRack(section) {
  const track = section.querySelector('.robust-rack-track');
  const cards = [...track.querySelectorAll('.robust-rack-item')];
  const toggle = section.querySelector('[data-rack-toggle]');
  const previous = section.querySelector('[data-rack-previous]');
  const next = section.querySelector('[data-rack-next]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  let visible = false;
  let drag = null;
  let scrollFrame = 0;

  const states = cards.map(card => {
    const video = card.querySelector('video');
    const retry = card.querySelector('.robust-rack-video-retry');
    const progress = card.querySelector('.robust-rack-video-progress i');
    // Muting before assigning a source permits inline autoplay on mobile Safari.
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    const state = {card, video, retry, inside: false, starting: false};
    video.addEventListener('playing', () => {
      retry.hidden = true;
      card.dataset.videoState = 'playing';
      if (!shouldPlay(state)) video.pause();
    });
    video.addEventListener('pause', () => { card.dataset.videoState = 'paused'; });
    video.addEventListener('error', () => {
      if (!video.getAttribute('src')) return;
      card.dataset.videoState = 'error';
      retry.textContent = 'Retry video';
      retry.hidden = false;
    });
    video.addEventListener('timeupdate', () => {
      const fraction = video.duration ? video.currentTime / video.duration : 0;
      progress.style.transform = `scaleX(${Math.max(0, Math.min(1, fraction))})`;
    });
    retry.addEventListener('click', () => {
      if (video.error) video.load();
      paused = false;
      updateToggle();
      syncVideos();
    });
    return state;
  });

  function shouldPlay(state) {
    return visible && state.inside && !paused && !document.hidden;
  }

  async function syncVideo(state) {
    const {video, card, retry} = state;
    if (!shouldPlay(state)) {
      video.pause();
      return;
    }
    if (!video.getAttribute('src')) {
      video.src = video.dataset.src;
      video.load();
      card.dataset.videoState = 'loading';
    }
    if (!video.paused || state.starting) return;
    state.starting = true;
    try {
      await video.play();
      if (!shouldPlay(state)) video.pause();
    } catch (error) {
      // A rapid scroll or pause may intentionally abort the pending play.
      if (shouldPlay(state) && error.name !== 'AbortError') {
        retry.textContent = video.error ? 'Retry video' : 'Play silently';
        retry.hidden = false;
      }
    } finally {
      state.starting = false;
    }
  }

  function syncVideos() { states.forEach(syncVideo); }

  function updateToggle() {
    section.dataset.rackPaused = String(paused);
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Resume robustness videos' : 'Pause robustness videos');
    toggle.title = paused ? 'Resume motion' : 'Pause motion';
  }

  toggle.addEventListener('click', () => {
    paused = !paused;
    updateToggle();
    syncVideos();
  });
  reduced.addEventListener('change', () => {
    paused = reduced.matches;
    updateToggle();
    syncVideos();
  });
  document.addEventListener('visibilitychange', syncVideos);

  const viewportObserver = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    section.dataset.rackVisible = String(visible);
    syncVideos();
  }, {threshold: .08});
  viewportObserver.observe(track);
  const cardObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const state = states.find(state => state.card === entry.target);
      state.inside = entry.isIntersecting && entry.intersectionRatio > .12;
      syncVideo(state);
    }
  }, {root: track, threshold: [0, .12, .5]});
  cards.forEach(card => cardObserver.observe(card));

  function scrollByCard(direction) {
    const step = cards[1].offsetLeft - cards[0].offsetLeft;
    track.scrollBy({left: step * direction, behavior: reduced.matches ? 'auto' : 'smooth'});
  }
  previous.addEventListener('click', () => scrollByCard(-1));
  next.addEventListener('click', () => scrollByCard(1));

  function updateScroll() {
    scrollFrame = 0;
    const max = track.scrollWidth - track.clientWidth;
    const position = Math.max(0, Math.min(max, track.scrollLeft));
    previous.disabled = position < 2;
    next.disabled = position > max - 2;
    const fraction = track.clientWidth / track.scrollWidth;
    section.style.setProperty('--rack-visible', `${fraction * 100}%`);
    section.style.setProperty('--rack-scroll', `${max > 0 ? position / max * (1 - fraction) / fraction * 100 : 0}%`);
  }
  track.addEventListener('scroll', () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }, {passive: true});
  new ResizeObserver(updateScroll).observe(track);
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByCard(event.key === 'ArrowRight' ? 1 : -1);
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      track.scrollTo({left: event.key === 'Home' ? 0 : track.scrollWidth, behavior: reduced.matches ? 'auto' : 'smooth'});
    }
  });

  // Native horizontal trackpad/touch scrolling preserves vertical page scrolling.
  // Mouse dragging is an additional option; it never captures touch gestures.
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button')) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, left: track.scrollLeft, moved: false};
  });
  track.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(event.clientY - drag.y)) {
      drag.moved = true;
      track.setPointerCapture(event.pointerId);
      track.classList.add('is-dragging');
    }
    if (drag.moved) {
      event.preventDefault();
      track.scrollLeft = drag.left - dx;
    }
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    drag = null;
    track.classList.remove('is-dragging');
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', () => {
    drag = null;
    track.classList.remove('is-dragging');
  });
  track.addEventListener('pointerleave', event => {
    if (drag && !drag.moved) endDrag(event);
  });
  track.addEventListener('dragstart', event => event.preventDefault());

  // A damped spring lets each hanging print follow the pointer, then settle.
  states.forEach(({card}) => {
    const paper = card.querySelector('.robust-rack-paper');
    let targetX = 0, targetY = 0, x = 0, y = 0, vx = 0, vy = 0, frame = 0, last = 0;
    function tick(time) {
      const dt = Math.min((time - (last || time - 16)) / 1000, .032);
      last = time;
      vx += ((targetX - x) * 160 - vx * 18) * dt;
      vy += ((targetY - y) * 160 - vy * 18) * dt;
      x += vx * dt;
      y += vy * dt;
      paper.style.setProperty('--rack-rx', `${x.toFixed(3)}deg`);
      paper.style.setProperty('--rack-ry', `${y.toFixed(3)}deg`);
      if (Math.abs(x - targetX) + Math.abs(y - targetY) + Math.abs(vx) + Math.abs(vy) > .015) {
        frame = requestAnimationFrame(tick);
      } else { frame = 0; last = 0; }
    }
    function animate() { if (!frame) frame = requestAnimationFrame(tick); }
    card.addEventListener('pointermove', event => {
      if (reduced.matches || event.pointerType !== 'mouse' || drag?.moved) return;
      const rect = card.getBoundingClientRect();
      targetX = -(event.clientY - rect.top - rect.height / 2) / rect.height * 3;
      targetY = (event.clientX - rect.left - rect.width / 2) / rect.width * 5;
      animate();
    });
    card.addEventListener('pointerleave', () => { targetX = targetY = 0; animate(); });
  });

  updateToggle();
  updateScroll();
  section.dataset.rackReady = 'true';
}

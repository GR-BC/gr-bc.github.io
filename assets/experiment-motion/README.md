# Experiment figure in motion

Standalone preview: https://gr-bc.github.io/experiment-motion.html

The preview's **Copy embed code** button copies a ready-to-paste native component. No build step, React, chart library, or external CDN is required. The main homepage is not modified by this package.

## Embed in this repository

```html
<div id="experiment-results"></div>
<script type="module">
  import { mountExperimentMotion } from './assets/experiment-motion/experiment-motion.js?v=20261015-1';
  const experiment = await mountExperimentMotion('#experiment-results');
</script>
```

The module loads its scoped stylesheet, JSON, and SVG assets relative to its own URL. The host needs a usable width; height is automatic. It responds to the host's width rather than only the window width. Four columns become two and then one on narrower containers. Multiple instances receive independent SVG IDs.

A chrome-free page is also available at `experiment-motion.html?embed=1`. For same-origin iframes, it sends `{ type: 'grbc-experiment:resize', height }` messages to its own origin. Validate `event.origin === location.origin` and `event.source === iframe.contentWindow` before applying a received height. Native embedding is preferred for keyboard navigation and automatic sizing.

The visible interface only has a subtle replay text control; pause and speed remain available through the API for future integrations.

## Controls and lifecycle

```js
const figure = await mountExperimentMotion(container, {
  intro: true,                  // false omits the component heading
  speed: 1,                     // 0.25 through 3
  reducedMotion: 'system',       // true forces a static figure; false enables motion
  onSelect(selection) {
    // { method: 'grbc', task: 'assembly', value: 98 }, or null
    // Legend selections use task: null, value: null.
  }
});
figure.replay();
figure.pause();
figure.play();
figure.setSpeed(0.5);
figure.setReducedMotion(true);
figure.clearSelection();
figure.destroy();
```

Mounting again on the same host destroys its previous instance, including pending requests, observers, listeners, and animations. Call `destroy()` when removing an embedded component. Calling `play()` resumes; `replay()` starts a fresh entrance. Playback state and speed persist through replay.

Each task starts on its first viewport entry and holds its final result. Leaving the viewport or hiding the tab pauses unfinished animation. It resumes from the same position. Reduced-motion preferences show the complete artwork immediately. All meaningful values also appear in accessible HTML tables.

Animation order is DAgger → AWR → RA-BC → GR-BC, with 540 ms between starts. Bars spring above their final height and settle, values pop in, corresponding curves draw, and samples follow their curves. Hover highlights a method across all tasks and grows a compact percentage bubble above its bar; clicking or pressing Enter/Space pins the value. Escape, another click on that bar, or a blank-area click clears it. Touch uses the same pin interaction.

## Editing

- `source.svg`: exact copy of the supplied `Frame 16.svg`.
- `assembly.svg`, `graphics.svg`, `screw.svg`, `memory.svg`: generated, original vector paths retained, with method/animation hooks added.
- `data.json`: method labels, colors, final success annotations, measured iteration counts, and computed baseline gaps.
- `experiment-motion.js`: animation timing/keyframes and interaction logic.
- `experiment-motion.css`: component-only appearance and responsive layout.
- `preview.*`: standalone studio and embedding UI.

Run `python3 scripts/prepare-experiment.py` to regenerate task SVGs and data after deliberately replacing the source. Run `python3 scripts/check-experiment.py` for source-path, SVG reference, and semantic checks.

### Data fidelity

Final percentages in tooltips are transcribed from the original **bar annotations**: Assembly 88/72/86/98, Graphics 63/32/72/93, Screw 56/37/52/89, Memory 49/19/57/83 (DAgger/AWR/RA-BC/GR-BC). The displayed advantages are percentage-point differences from the strongest baseline: +10/+21/+33/+26.

The original upper axes use proportions (0–1); lower axes use percentages (0–100). BC is the initial point, followed by 2/3/4/3 iterations. The existing curve geometry is preserved, including its original manual endpoint placements. In particular, the Graphics GR-BC curve is drawn near 90% despite a 93% bar annotation, and Screw AWR ends near 41% despite a 37% bar annotation. This package does not infer raw per-iteration measurements from pixel coordinates or silently alter them. Percentage bubbles use the **final bar result**. Reconcile those source discrepancies against the experiment data before changing either representation.

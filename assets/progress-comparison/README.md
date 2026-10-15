# Interactive progress comparison

Standalone preview: `/progress-comparison.html`. Compact page: `/progress-comparison.html?embed=1`.

The figure uses the supplied **Frame 21.svg**: Robometer, SARM, Robo-Dopamine, ReWiND, and **GRP (Ours)**. The source label GRP is retained. The five curve `d` strings, axes, highlighted weight regions, policy/intervention intervals, and annotation points are original vector geometry. Color contrast, line width, and presentation change for interaction. No sampled dataset, new scores, or causal conclusions are invented.

The five photo SVGs preserve the original crop matrices and corners. Their embedded photographs are optimized WebP (quality 92, up to 800 pixels wide). The original full PNG payloads are not published. Reusable extracted WebP files are also available in `media/`.

## One-click embed

Use **Copy embed** on the preview page, then paste the snippet where this part should appear:

```html
<div data-progress-comparison></div>
<script type="module" src="https://gr-bc.github.io/assets/progress-comparison/embed.js"></script>
```

The loader adds scoped styles and initializes every matching container. Keep the asset directory together. Serve over HTTP rather than opening with `file://`. To embed another copy dynamically, use the mount API below. No framework, external animation runtime, or build step is required.

## Mount API

```html
<link rel="stylesheet" href="assets/progress-comparison/comparison.css">
<div id="experiment"></div>
<script type="module">
  import {mountProgressComparison} from './assets/progress-comparison/comparison.js';
  const figure = await mountProgressComparison(document.querySelector('#experiment'), {
    onSelect: methodID => console.log(methodID)
  });
  // figure.selectMethod('grp');
</script>
```

- `selectMethod(id | null)`: pin a method or restore the overview. IDs: `robometer`, `sarm`, `robo-dopamine`, `rewind`, `grp`.
- `selectFrame(id | null)`: keep an annotated frame and its connector highlighted. IDs are in `manifest.json`.
- `replay()`: repeat the entrance; requests made offscreen wait until the component is visible.
- `setReducedMotion(boolean)`: request static presentation. OS reduced motion is always respected.
- `getState()`: selected/effective method, frame, viewport visibility, reveal status, reduced motion, and disposal state.
- `destroy()`: disconnect observers, cancel motion, remove listeners, and unmount. Safe repeatedly; remounting into the same container first destroys the old instance.

`progress-comparison:select` is emitted on the container with `{method: id | null}`. Timing, colors, labels, and short frame descriptions live in `comparison.config.js`. The source illustration names the events; the frame notes identify these annotations, without assigning unverified causes.

## Interaction and motion

Viewport entry reveals detail frames first, then axes, then the original curve paths, followed by annotation and timeline layers. It plays once per mount; Replay repeats it. Browser-native Web Animations API drives the entrance and button spring keyframes. A small damped spring drives pointer-based photo tilt. Motion stops when the figure leaves the viewport or the tab is hidden. Reduced motion makes all content immediately readable and keeps selection feedback.

Hover previews a method; leaving restores the pinned method. Click buttons/curves to pin, All methods or Escape to reset. All controls are native keyboard-operable buttons. Frame buttons can be tapped or keyboard-selected; touch does not enable pointer wobble. Narrow screens have separate horizontal scrolling for the method selector, detail frames, and graph, without widening the document.

## Rebuild and verify

```sh
python3 scripts/prepare-progress-comparison.py '/path/to/Frame 21.svg'
python3 scripts/check-progress-comparison.py '/path/to/Frame 21.svg'
node --check assets/progress-comparison/comparison.js
node --check assets/progress-comparison/preview.js
node scripts/serve-preview.mjs
```

The extraction script requires Python's standard library and FFmpeg. `manifest.json` records source SHA-256, method path hashes, photo mappings, and original annotation coordinates. A changed source layout must be mapped explicitly and visually checked. The homepage mounts this same module in its Progress evidence section via `assets/homepage-modules.js`.

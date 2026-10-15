# GR-BC interactive framework kit

A standalone, browser-native component library extracted from `Group 41.svg`. The homepage is not changed by this kit. Open `/framework-preview.html` over HTTP to explore and edit the drawing.

## Files and source fidelity

- `framework.svg`: original `1603 × 777` coordinate system, vector geometry, outlined text, colors, transparency, cropping patterns, and source filters. Four main stage groups plus foreground connector groups preserve arrow layering.
- `components.json`: stable semantic IDs, source element IDs, stage, type, original bounding boxes, related components, media inventory, and source SHA-256.
- `media/`: 17 shared WebP images reused by the 31 original fill patterns. Images are resampled to at most 768 pixels wide at quality 94 with alpha retained; SVG source dimensions and crop transforms are unchanged. Photographs are compressed, not pixel-identical to the embedded originals.
- `framework.js` / `framework.css`: reusable controller and scoped styles; no build step or third-party runtime dependencies.
- `framework.config.js`: central stage copy, accent colors, route geometry, default 12-second cycle, and speed.
- `preview.*`: independent editor UI. Edits remain in memory; use “查看布局配置” to copy them into an embedding configuration. Reloading discards unsaved edits.

Drawables retain their source-order identity (`fw-source-169-11`, etc.). A logical component can own several drawing pieces; moving or hiding it affects its fill, outline, and associated label together. Topology links between graph edges and nodes are recovered from the drawing's endpoint geometry, not from an experimental graph dataset. The loop is illustrative.

## Embed

```html
<link rel="stylesheet" href="assets/framework/framework.css">
<div id="method-diagram"></div>
<script type="module">
  import {mountFramework} from './assets/framework/framework.js';
  const diagram = await mountFramework(document.querySelector('#method-diagram'), {
    autoplay: true,
    speed: 1,
    layout: {
      'a-gripper': {dx: 0, dy: 0, scale: 1, rotate: 0, opacity: 1, visible: true}
    },
    onSelect: component => console.log(component?.id ?? null)
  });
</script>
```

Keep `framework.js`, `framework.config.js`, the SVG, inventory, and media in their existing relative locations. The loader resolves all assets relative to its own module URL. Give the container enough width for the dense figure; the supplied preview uses a locally scrollable drawing on narrow screens. When deploying updates, version the module and stylesheet URLs; the controller propagates the module query to SVG/JSON requests. Each mount namespaces SVG definition IDs so multiple diagrams can share one document.

## Controller

`mountFramework(container, options)` returns a promise. Options: `autoplay`, `speed`, `reducedMotion`, `layout`, `onSelect`, and `config` overrides for `framework.config.js`. Set `interactive: false` to skip the default component hover/click/keyboard handlers when supplying a custom presentation, as in `homepage.js`; editor interaction remains enabled by default.

| Method | Effect |
| --- | --- |
| `play()` / `pause()` | Resume the complete cycle / pause it. Play clears pinned component and stage focus. |
| `setSpeed(value)` | Playback multiplier, from 0.1 to 4; preview offers 0.5, 1, and 2. |
| `selectComponent(id \| null, {focus:false})` | Pin a component or clear the selection. `focus:true` also focuses its first SVG piece. |
| `focusStage('A' \| 'B' \| 'C' \| 'D' \| null)` | Highlight a stage, or release the highlight. |
| `isolateStage(stage)` | Display the selected stage and its foreground connectors. Show all with `focusStage(null)`. |
| `setComponent(id, patch)` | Edit `visible`, `dx`, `dy`, `scale`, `rotate`, `opacity`; transformations use the original component center. |
| `getComponent(id)` | Metadata plus current edit values. |
| `exportLayout()` | JSON-serializable edits that can be passed back as `layout`. |
| `getState()` | Playback intent/effective running state, visibility, speed, phase, focus, and selection. |
| `setReducedMotion(boolean)` | Force a static preview. OS reduced-motion preferences remain respected. |
| `reset()` | Restore components, speed, phase, and focus; preserve the current play/pause intent and reduced-motion preference. |
| `destroy()` | Cancel animations, remove listeners/observer and mounted artwork. Safe to call more than once. |

Mounting again into the same container destroys the previous instance. `framework:select`, `framework:hover`, `framework:edit`, `framework:phase`, `framework:state`, and `framework:reset` are `CustomEvent`s emitted on the container. Selection detail is the component metadata or `null`; edit detail is `{id, value}`.

Hover temporarily holds the cycle. Clicking pins the component; click SVG whitespace or use Play/Show all to release it. Enter/Space selects a focused SVG component; Escape clears it. The cycle pauses outside the viewport and while the document is hidden. Reduced motion removes moving particles/dashes while retaining selection and editing.

## Rebuild and check

```sh
python3 scripts/prepare-framework.py '/path/to/Group 41.svg'
python3 scripts/check-framework.py '/path/to/Group 41.svg'
python3 scripts/version-framework.py
node --check assets/framework/framework.js
node --check assets/framework/preview.js
node scripts/serve-preview.mjs
```

Rebuilding requires Python's standard library and FFmpeg. The original SVG remains outside the public bundle. The checked-in IDs are defined against the supplied source drawing; a materially different source should be remapped and visually reviewed rather than silently replacing this inventory.

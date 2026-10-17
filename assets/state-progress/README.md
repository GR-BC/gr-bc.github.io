# State → node → connections → progress

This transparent module sits between the main pipeline and the chunk-weighting lab. Frame 26 retains its original simple Graph Node: three points on a short trajectory, rather than a pasted miniature. A small traveling node carries the transition into Frame 23, where states, temporal neighbors, neighborhood rings, cross-state links, and labels build in sequence. The complete entry lasts 2.5 seconds. Clicking the node replays the connection build; the quiet replay control restarts the full sequence.

The diagram captions retain the paper's important constraints: frozen multi-view visual features, a separate gripper state, cross-view agreement, and matching gripper states. Reverse search from success and interpolation are summarized in one short line. The sole displayed equation is the paper's normalized progress formula (Equation 7). `R_max` remains an upper percentile of finite remaining costs, rather than an episode length. The detailed edge-length and remaining-cost formulas stay in the linked paper, Sections 4.1–4.3.

The equation sits in the true horizontal center of an equal-sided three-column row, independent of the copy and paper link widths. On phones it takes its own centered row. It floats in as the diagram completes, then a quiet underline and cost-to-progress color pulse repeat every five seconds. These motions respect pause, visibility, and reduced-motion settings; CSS also provides the subtle continuous effect in the static local-file fallback.

Frame 26 retains its source geometry and 13 focusable parts, nine flowing arrow sources, and two merging-bracket laser traces. Frame 23 retains 12 parts and 16 breathing circles. Its six large camera-neighborhood circles are explicitly centered on their corresponding camera embeddings, with a shared radius; redundant rotations are removed. The cross-state circle is centered halfway between the two blue embeddings. All three dashed boundaries use the same 2 px non-scaling stroke, 6/6 dash rhythm, rounded caps, and stronger contrast. They remain centered while the dashes circulate. Sixteen outward ripple outlines emit from the two neighborhoods and six temporal/state points, without stacking ripples from every filled camera layer.

The three curved callout arrows use the **original filled arrow silhouettes as clip paths**: moving highlights are confined to those silhouettes. The two straight trajectory flows retain their exact original paths and direction. `normalizedGeometry` in `parts.json` explicitly records the reviewed circle corrections; all other source geometry remains unchanged.

The entry sequence and traveling point use the SVG roots' screen transforms. During hover, a bounded 720 ms frame loop instead follows the transformed Graph Node and the upper blue neighborhood, keeping the enlarged connector attached throughout their spring transition. The arrow lands just outside the blue boundary and gains a larger head and stronger stroke. Hovering the node, connector, or corresponding blue neighborhood highlights all three as one family; moving to another part, leaving, or pressing Escape clears the whole family. Keyboard focus has the same behavior. The other blue neighborhood keeps its own local linked state/ring focus. Fixed source-space hit regions prevent enlarged parts from capturing their neighbors.

Resizing finishes the current transition and recomputes the connector. Hover does not interrupt the first build; keyboard focus can finish it immediately. The node is keyboard-operable with Enter or Space. The smaller drawings, tighter padding, and single-line retrieval summary reduce the desktop height by roughly a quarter. Mobile stacks the drawings and replays the right-hand construction when it first comes into view, without horizontal page overflow.

The native Web Animations API drives the progressive reveal and magnification. CSS drives the continuous figure motion. Both pause outside the viewport, in a hidden document, or via the pause control. Reduced motion shows the complete static sequence. Static SVG image fallbacks remain readable if enhancement fails.

The four original photos in Frame 26 retain their crop transforms, encoded as WebP at quality 94. SVG IDs are independently namespaced. `source-bounds.json` records source checksums and measured geometry; `parts.json` records semantic grouping and the intentional circle corrections. Changed source drawings must be measured again.

```sh
python3 scripts/prepare-state-progress.py /path/to/original-svg-directory
python3 scripts/check-state-progress.py /path/to/original-svg-directory
node --check assets/state-progress/state.js
```

After editing, refresh the first 12 SHA-256 characters on CSS, JS, and SVG references in `index.html`. The checker verifies source geometry and declared corrections, circle-to-node alignment, consistent dashed strokes, unique IDs, exact arrow clips, the original simple node, module placement, one equation, and content hashes. No runtime animation library or CDN is required.

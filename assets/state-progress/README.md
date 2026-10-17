# State → node → connections → progress

This transparent, compact module sits between the main pipeline and the chunk-weighting lab. Frame 26 builds the encoded state; its final Graph Node now contains an actual miniature of Frame 23. A source-aligned connector and temporary magnifier carry that miniature into the full connection diagram. The entry sequence takes three seconds: cameras → frozen encoder → features → node → expanded neighborhood. Clicking the node replays only the magnification; the quiet replay control restarts the full sequence.

The diagram captions retain the paper's important constraints: frozen multi-view visual features, a separate gripper state, cross-view agreement, and matching gripper states. Reverse search from success and interpolation are summarized in one short line. The sole displayed equation is the paper's normalized progress formula (Equation 7). `R_max` remains an upper percentile of finite remaining costs, rather than an episode length. The detailed edge-length and remaining-cost formulas stay in the linked paper, Sections 4.1–4.3.

Frame 26 retains its original source geometry and 13 focusable parts. Its former three-dot node placeholder is hidden, and a namespaced, static copy of the original Frame 23 is fitted inside the node. Nine arrow sources, two merging-bracket laser traces, and their source-coordinate metadata remain. Frame 23 retains 12 parts, 16 breathing circles, and 32 outward ripple outlines. The three curved callout arrows use the **original filled arrow silhouettes as clip paths**: moving highlights are confined to those silhouettes, avoiding mismatched overlay centerlines or displaced arrowheads. The two straight trajectory flows retain their exact original paths and direction.

The connector and magnifier use the SVG root's screen transform, excluding any lifted child transforms. Resizing finishes the current transition and recomputes its geometry. Hover hit regions stay fixed in original SVG coordinates, so a raised part cannot capture its neighbors. Keyboard focus uses the same regions; Escape clears it. The node is keyboard-operable with Enter or Space. Mobile stacks the two compact drawings and recomputes the connector vertically, without horizontal page overflow.

The native Web Animations API drives the progressive reveal and magnification. CSS drives the continuous figure motion. Both pause outside the viewport, in a hidden document, or via the pause control. Reduced motion shows the complete static sequence. Static SVG image fallbacks remain readable if enhancement fails.

The four original photos in Frame 26 retain their crop transforms, encoded as WebP at quality 94. SVG IDs are independently namespaced, including the miniature. `source-bounds.json` records source checksums and measured geometry; `parts.json` records semantic grouping. Changed source drawings must be measured again.

```sh
python3 scripts/prepare-state-progress.py /path/to/original-svg-directory
python3 scripts/check-state-progress.py /path/to/original-svg-directory
node --check assets/state-progress/state.js
```

After editing, refresh the first 12 SHA-256 characters on CSS, JS, and SVG references in `index.html`. The checker verifies source geometry, unique IDs, exact arrow clips, miniature fidelity, module placement, one displayed equation, and content hashes. No runtime animation library or CDN is required.

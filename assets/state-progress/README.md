# State → graph → progress

The homepage places this compact module between the main pipeline and the chunk-weighting lab. It uses the original Frame 26 and Frame 23 vector drawings on the homepage's transparent background, with native MathML for the paper's equations.

The copy follows the bundled paper's Sections 4.1–4.3. Three frozen MCR embeddings encode the visual state, while the binary gripper state remains a separate hard filter. Cross-trajectory edges require mutual K-NN agreement across every camera, identical gripper states, and the locally normalized maximum camera distance in Equation 4 to pass its threshold. Reverse Dijkstra search retrieves the minimum cost to the shared success sink. Linear interpolation (Equation 6) supplies dense remaining costs; Equation 7 normalizes them into progress. `R_max` is an upper percentile of finite remaining costs, not the maximum episode length. Unreachable nodes retain the paper's zero-training-weight rule.

Frame 26 has 13 independently focusable parts, nine flowing arrows, and two laser traces along the exact original merging brackets. A small reticle pulses where both traces meet. Frame 23 has 12 parts, all 16 original circles gently breathing, 32 staggered outward ripple outlines, and five flowing arrow centerlines. The original outlined dashed callouts remain underneath their animated traces. Solid trajectory arrows retain their original direction and sit behind the state nodes.

Hover uses fixed source-coordinate hit regions sorted by area, so a lifted part cannot cover neighboring parts or keep itself active outside its region. Pointer leave and keyboard blur restore the overview. Keyboard focus lifts the same parts, and Escape clears focus. Motion pauses outside the viewport, in a hidden document, or via the pause button. Replay restarts the animation phases. Reduced motion keeps the complete static drawings and disables the lift/ripples.

All original vector geometry, outlined labels, image crops, and semantic colors remain intact. The four embedded PNG/JPEG images in Frame 26 are encoded as WebP at quality 94 inside the SVG, reducing its transfer size while allowing the static `<img>` fallback to retain its photos. SVG IDs are namespaced to avoid collisions with the main framework. `source-bounds.json` records browser-measured source geometry and checksums; `parts.json` records the semantic grouping. A changed source drawing must be measured again rather than silently reusing these regions.

```sh
python3 scripts/prepare-state-progress.py /path/to/original-svg-directory
python3 scripts/check-state-progress.py /path/to/original-svg-directory
node --check assets/state-progress/state.js
```

After rebuilding or editing, refresh the first 12 SHA-256 characters on the CSS, JS, and both SVG references in `index.html`. No build dependency, CDN, or runtime animation library is needed. The two figures use a horizontal viewport on small screens; the retrieval formulas stack below them.

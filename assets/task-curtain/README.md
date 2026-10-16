# Task curtain over the project demo

The homepage's original task section is merged into the project-video section. The first view shows the task curtain hanging from a slim rod and eight rings, with a small lifted lower-right corner revealing a sliver of the demo behind it. A small animated arrow points diagonally up-left to suggest pulling it aside. The four original Frame 20 task labels remain visible on the left. A task label or the cloth corner toggles the curtain. Holding the corner and dragging moves the fabric directly; releasing settles it open or closed. There is no duplicate footer action. The original `#tasks` anchor points to this combined component.

The source SVG keeps the original 20 photos, paths, text outlines, masks, and crop transforms. A native WebGL mesh uses the SVG as a texture, with spring-driven vertices and surface-normal lighting. The full original picture retains its aspect ratio; a separate pleated fabric hem extends below it and beyond the inset video. Irregular, randomly phased gentle gusts displace the free fabric while its top remains attached to the rod. Mouse movement brushes local folds, while corner dragging lifts and gathers the fabric and moves the hanging rings. There are no decorative blue bars. Motion stops outside the viewport or in hidden documents. Reduced motion shows the requested state immediately and disables wind and arrow animation. Native buttons, `aria-expanded`, inert covered video controls, and Escape support keyboard and touch use. Covering pauses the video; uncovering preserves its time and offers Play rather than resuming sound automatically. A vector fallback works without WebGL, while the video and a native static task disclosure remain usable if loading the interaction fails.

`tasks.svg` is generated from the supplied `~/Downloads/Frame 20.svg`. Its roughly 127 MB of embedded full-resolution PNGs are optimized into external WebP photographs, with original SVG image dimensions and crop matrices retained. The source SHA-256 and media inventory are recorded in `manifest.json`; the original large source is not published.

To rebuild or verify:

```sh
python3 scripts/prepare-task-curtain.py '/path/to/Frame 20.svg'
python3 scripts/check-task-curtain.py '/path/to/Frame 20.svg'
python3 scripts/version-homepage-modules.py
node --check assets/task-curtain/curtain.js
```

Verify the initial video peek, full task reveal, cloth brushing and corner dragging in both directions, rapid reversal, Escape, video pause/time preservation, reduced motion, narrow layout, and viewport re-entry.

## Idle invitation

The suspended fabric continuously billows with broad, irregular gusts, keeping the rod and left seam pinned. Before the first interaction, a roughly seven-second, amplitude-modulated gust lifts the lower-right corner and briefly reveals more of the video, including a small play glyph beneath the cloth. The fold and diagonal arrow follow that same gust. Hover/focus adds a small local lift; dragging or toggling ends the automatic invitation while leaving gentle wind on the open task map. The initial spread leaves only a narrow video glimpse. Motion pauses offscreen or in a hidden document; reduced motion keeps the still curtain and normal click/drag controls.

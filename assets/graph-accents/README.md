# Real graph background accents

The Morandi figure decorates the left margin near Motivation; the original-color
figure decorates the right margin near Experiment. Both are behind the content,
non-interactive, hidden from assistive technology and excluded from print.

`*-plot.svg` retain the exact embedded PNG bytes from the supplied SVGs. Only
the left plot viewport is shown: axes, the reward/success legend, and the right
color scale are excluded. An SVG alpha matrix removes white paper; a soft CSS
mask and 27% image opacity fade the graph into the homepage. No graph is invented
or redrawn. The originals are not modified.

`clouds.json` samples colored locations from those images. Canvas motes follow
deterministic local walks among those locations. Their short trails are ambient
point-cloud motion, not additional measured trajectories or reconstructed edges.
The source figure remains the authoritative static image.

The first viewport entrance reveals the cloud over 1.3–1.6 s. Gentle drifting
and the 30 fps particle renderer pause offscreen and while the document is hidden.
Reduced-motion users receive the static graph. A failed data request or missing
canvas context also leaves the static figure intact. Resize observers keep the
decorations aligned when expandable modules change the page height.

Regenerate with `scripts/prepare-graph-accents.py /path/to/source/files` in a
Python environment with Pillow and NumPy. SVG coordinates and particle locations
share the same cropped viewport. Refresh the affected cache hashes in index.html
after editing these assets.

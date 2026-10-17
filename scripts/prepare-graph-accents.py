"""Extract the plot area from the supplied PNG-in-SVG figures, without redrawing it.

Run with a Python environment containing Pillow and NumPy. The PNG bytes remain
unchanged inside the SVG; a viewport, clipping path and white-key filter remove
the publication furniture. Sampled colored pixels only guide decorative motion.
"""

import argparse
import base64
import io
import json
import random
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
from PIL import Image


FIGURES = (
    ("morandi", "graph_left_morandi3 2.svg", (30, 28, 1860, 1780), (1090, 28, 800, 143)),
    ("original", "graph_left_original_colors 1.svg", (45, 42, 1900, 1778), (45, 42, 730, 125)),
)


def extract(source_dir, output_dir):
    output_dir.mkdir(parents=True, exist_ok=True)
    figures = {}
    for number, (name, filename, crop, legend) in enumerate(FIGURES):
        source = ET.parse(source_dir / filename).getroot()
        embedded = next(el for el in source.iter() if el.tag.rsplit("}", 1)[-1] == "image")
        href = embedded.get("{http://www.w3.org/1999/xlink}href") or embedded.get("href")
        pixels = np.array(Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))).convert("RGB"))
        x, y, width, height = crop
        lx, ly, lw, lh = legend
        # An even-odd hole excludes the legend, including its border and star.
        clip = f"M{x} {y}h{width}v{height}H{x}Z M{lx} {ly}h{lw}v{lh}H{lx}Z"
        display_height = round(560 * height / width)
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="560" height="{display_height}" viewBox="{x} {y} {width} {height}" fill="none">
  <defs>
    <clipPath id="plot"><path d="{clip}" clip-rule="evenodd"/></clipPath>
    <filter id="paper" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"/>
    </filter>
  </defs>
  <g clip-path="url(#plot)"><image width="{embedded.get('width')}" height="{embedded.get('height')}" href="{href}" filter="url(#paper)"/></g>
</svg>
'''
        (output_dir / f"{name}-plot.svg").write_text(svg)

        # Deterministic samples stay on actual colored nodes, never in the legend.
        nodes = []
        rgb = pixels.astype(np.int16)
        chroma = rgb.max(axis=2) - rgb.min(axis=2)
        valid = (chroma > 38) & (rgb.max(axis=2) < 247) & (rgb.min(axis=2) > 60)
        valid[ly:ly + lh, lx:lx + lw] = False
        for py in range(y, y + height - 20, 23):
            for px in range(x, x + width - 20, 23):
                patch = valid[py:py + 20, px:px + 20]
                if np.count_nonzero(patch) < 18:
                    continue
                strength = np.where(patch, chroma[py:py + 20, px:px + 20], 0)
                yy, xx = np.unravel_index(np.argmax(strength), strength.shape)
                color = pixels[py + yy, px + xx].tolist()
                nodes.append([round((px + int(xx) - x) / width, 5), round((py + int(yy) - y) / height, 5), *color])

        # Local walks animate the point cloud; they are not claimed graph edges.
        rng = random.Random(807 + number)
        routes = []
        for _ in range(28):
            route = [rng.randrange(len(nodes))]
            for step in range(10):
                current = nodes[route[-1]]
                choices = sorted(
                    (sum((current[k] - candidate[k]) ** 2 for k in (0, 1)), i)
                    for i, candidate in enumerate(nodes)
                    if i not in route[-5:]
                )
                neighbors = [i for distance, i in choices[:12] if distance < .009]
                if not neighbors:
                    break
                route.append(rng.choice(neighbors))
            if len(route) > 4:
                routes.append(route)
        figures[name] = {"nodes": nodes, "routes": routes, "crop": crop, "legend": legend,
                         "source": filename, "imageSize": [pixels.shape[1], pixels.shape[0]]}
        print(f"{name}: {width}×{height} plot; {len(nodes)} motion anchors; {len(routes)} local walks")
    (output_dir / "clouds.json").write_text(json.dumps(figures, separators=(",", ":")))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    args = parser.parse_args()
    extract(args.source, Path(__file__).resolve().parents[1] / "assets/graph-accents")

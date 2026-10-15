"""Extract Frame 21 SVG paths and cropped photo assets; never resample curve data."""
from pathlib import Path
import base64, copy, hashlib, json, subprocess, sys, tempfile
import xml.etree.ElementTree as E

REPO = Path(__file__).resolve().parents[1]
OUT = REPO / 'assets/progress-comparison'
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/Frame 21.svg'
NS = 'http://www.w3.org/2000/svg'
XL = 'http://www.w3.org/1999/xlink'
E.register_namespace('', NS)
E.register_namespace('xlink', XL)
def node(tag, **attrs): return E.Element(f'{{{NS}}}{tag}', attrs)
def clone(index):
    e = copy.deepcopy(source[index])
    e.set('data-source-index', str(index))
    return e

source = E.parse(SOURCE).getroot()
assert source.get('viewBox') == '0 0 2330 1036', 'A new source must be mapped explicitly.'
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'media').mkdir(exist_ok=True)
methods = [
    ('robometer', 'Robometer', 123, '#83a382'),
    ('sarm', 'SARM', 120, '#72adc5'),
    ('robo-dopamine', 'Robo-Dopamine', 119, '#a79b93'),
    ('rewind', 'ReWiND', 122, '#dda88f'),
    ('grp', 'GRP (Ours)', 121, '#d8a044'),
]
photos = [
    ('detour', 'Detour', 5, 1, 13, [125, 126], [580.909, 832.82]),
    ('reorient-1', 'Reorient', 11, 4, 17, [129, 130], [730.909, 762.32]),
    ('left-slip', 'Left slip-out', 3, 0, 16, [127, 128], [759.409, 803.32]),
    ('reorient-2', 'Reorient', 7, 2, 14, [131, 132], [1609.41, 548.82]),
    ('right-slip', 'Right slip-out', 9, 3, 15, [134, 135], [1637.91, 657.82]),
]
images = list(source.iter(f'{{{NS}}}image'))
media = []
with tempfile.TemporaryDirectory(prefix='progress-comparison-') as tmp:
    for i, img in enumerate(images):
        raw = base64.b64decode(img.get(f'{{{XL}}}href').split(',', 1)[1])
        p = Path(tmp) / f'{i}.png'; p.write_bytes(raw)
        name = f'frame-{i:02d}-{hashlib.sha256(raw).hexdigest()[:8]}.webp'
        dest = OUT / 'media' / name
        if not dest.exists():
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-vf', 'scale=min(800\\,iw):-1', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '92', str(dest)], check=True)
        media.append({'path': 'media/' + name, 'width': int(img.get('width')), 'height': int(img.get('height')), 'bytes': dest.stat().st_size})

# Each isolated SVG retains the exact source crop matrix and rounded clipping.
for id, label, rect_index, img_index, _, _, _ in photos:
    rect = clone(rect_index)
    x, y, w, h = [rect.get(a) for a in ('x', 'y', 'width', 'height')]
    photo = node('svg', viewBox=f'{x} {y} {w} {h}', width='347', height='264', fill='none')
    title = node('title'); title.text = label; photo.append(title)
    defs = node('defs')
    pattern = copy.deepcopy(source[-1][img_index])
    # Pattern indices and image indices share the source mapping.
    defs.append(pattern)
    image = copy.deepcopy(images[img_index]); image.set(f'{{{XL}}}href', 'data:image/webp;base64,' + base64.b64encode((OUT / media[img_index]['path']).read_bytes()).decode())
    defs.append(image); photo.extend([defs, rect])
    E.ElementTree(photo).write(OUT / f'{id}.svg', encoding='unicode')

plot = node('svg', viewBox='0 390 2330 646', width='2330', height='646', fill='none', role='img')
title = node('title', id='plot-title'); title.text = 'Normalized progress and weight over time steps'; plot.append(title)
desc = node('desc', id='plot-description'); desc.text = 'Five original method curves with policy and intervention intervals. Gold annotations link the trajectory to five detail frames above. Use the method buttons to isolate a curve.'; plot.append(desc)
plot.set('aria-labelledby', 'plot-title plot-description')
background = node('g', **{'data-reveal': 'plot', 'class': 'pc-plot-foundation'})
background_indices = [0, 1, 2, 18] + list(range(19, 119)) + [124, 133] + list(range(166, 198))
for i in background_indices: background.append(clone(i))
plot.append(background)
timeline = node('g', **{'class': 'pc-timeline', 'data-reveal': 'timeline'})
for i in list(range(137, 150)) + [155, 156]: timeline.append(clone(i))
plot.append(timeline)
curves = node('g', **{'class': 'pc-curves', 'data-reveal': 'curves'})
method_manifest = []
for id, label, index, color in methods:
    group = node('g', **{'class': 'pc-series', 'data-method': id, 'data-source-index': str(index), 'style': '--series-color:' + color})
    title = node('title'); title.text = label; group.append(title)
    path = copy.deepcopy(source[index][0])
    for attr in ('stroke-opacity', 'shape-rendering', 'stroke-linecap', 'stroke-width'): path.attrib.pop(attr, None)
    path.set('class', 'pc-curve-line'); path.set('pathLength', '1'); path.set('stroke', color)
    group.append(path)
    hit = node('path', d=path.get('d'), **{'class': 'pc-curve-hit', 'stroke': 'transparent', 'stroke-width': '30', 'fill': 'none', 'data-method-hit': id, 'aria-hidden': 'true'})
    group.append(hit); curves.append(group)
    method_manifest.append({'id': id, 'label': label, 'sourceIndex': index, 'color': color, 'pathSHA256': hashlib.sha256(path.get('d').encode()).hexdigest()})
plot.append(curves)
annotations = node('g', **{'class': 'pc-annotations', 'data-reveal': 'annotations'})
photo_manifest = []
for id, label, rect_index, img_index, connector, markers, point in photos:
    g = node('g', **{'class': 'pc-event', 'data-event': id})
    c = clone(connector); c.set('class', 'pc-event-connector'); g.append(c)
    for i in markers: g.append(clone(i))
    hit = node('circle', cx=str(point[0]), cy=str(point[1]), r='29', fill='transparent', **{'class': 'pc-event-hit', 'data-event-hit': id, 'aria-hidden': 'true'})
    g.append(hit); annotations.append(g)
    photo_manifest.append({'id': id, 'label': label, 'asset': id + '.svg', 'sourceRect': rect_index, 'sourceImage': img_index, 'connectorIndex': connector, 'markerIndices': markers, 'point': point})
plot.append(annotations)
E.ElementTree(plot).write(OUT / 'plot.svg', encoding='unicode')
manifest = {'source': 'Frame 21.svg', 'sourceSHA256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'sourceViewBox': [0, 0, 2330, 1036], 'plotViewBox': [0, 390, 2330, 646], 'methods': method_manifest, 'photos': photo_manifest, 'media': media, 'note': 'Curves retain every original path coordinate. Display colors and line styling are adjusted for interaction. No underlying sampled dataset or new numerical claims are added.'}
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Extracted {len(methods)} unchanged curve paths and {len(photos)} cropped detail frames.')

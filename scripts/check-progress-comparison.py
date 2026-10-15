"""Check source geometry, annotation ownership, and self-contained photo crops."""
from pathlib import Path
import hashlib, json, sys, xml.etree.ElementTree as E
REPO = Path(__file__).resolve().parents[1]
OUT = REPO / 'assets/progress-comparison'
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/Frame 21.svg'
NS = {'s': 'http://www.w3.org/2000/svg'}
XL = '{http://www.w3.org/1999/xlink}'
source = E.parse(SOURCE).getroot()
manifest = json.loads((OUT / 'manifest.json').read_text())
plot = E.parse(OUT / 'plot.svg').getroot()
assert manifest['sourceSHA256'] == hashlib.sha256(SOURCE.read_bytes()).hexdigest()
assert plot.get('viewBox') == '0 390 2330 646'
ids = [e.get('id') for e in plot.iter() if e.get('id')]
assert len(ids) == len(set(ids)), 'SVG IDs must be unique.'
for method in manifest['methods']:
    group = next(e for e in plot.iter() if e.get('data-method') == method['id'])
    line = next(e for e in group if e.get('class') == 'pc-curve-line')
    hit = next(e for e in group if e.get('class') == 'pc-curve-hit')
    original = source[method['sourceIndex']][0].get('d')
    assert line.get('d') == hit.get('d') == original, method['id']
    assert hashlib.sha256(original.encode()).hexdigest() == method['pathSHA256']
for frame in manifest['photos']:
    photo = E.parse(OUT / frame['asset']).getroot()
    rect = photo.find('s:rect', NS)
    original = source[frame['sourceRect']]
    for attr in ['x', 'y', 'width', 'height', 'rx', 'fill']: assert rect.get(attr) == original.get(attr)
    image = photo.find('.//s:image', NS)
    assert image.get(XL + 'href').startswith('data:image/webp;base64,')
    event = next(e for e in plot.iter() if e.get('data-event') == frame['id'])
    indices = [int(e.get('data-source-index')) for e in event if e.get('data-source-index')]
    assert indices == [frame['connectorIndex']] + frame['markerIndices']
for media in manifest['media']: assert (OUT / media['path']).stat().st_size == media['bytes']
# Every original non-photo, non-top-legend element belongs to exactly one layer.
expected = set(range(0, 3)) | (set(range(13, 150)) - {136}) | {155, 156} | set(range(166, 198))
actual = [int(e.get('data-source-index')) for e in plot.iter() if e.get('data-source-index')]
assert set(actual) == expected and len(actual) == len(set(actual)), 'Missing or duplicated source artwork.'
print(f'PASS: all 5 curve paths, 5 photo crops, annotation mappings, and {len(actual)} source elements verified.')

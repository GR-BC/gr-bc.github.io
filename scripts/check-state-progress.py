"""Check source fidelity and the state-to-progress module's essential wiring."""
from pathlib import Path
import argparse
import hashlib
import json
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'assets/state-progress'
GEOMETRY = ['d', 'x', 'y', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x1', 'x2', 'y1', 'y2', 'transform']
parser = argparse.ArgumentParser()
parser.add_argument('sources', type=Path)
args = parser.parse_args()
metadata = json.loads((ASSETS / 'parts.json').read_text())
all_ids = set()
for n in [26, 23]:
    source = args.sources / f'Frame {n}.svg'
    assert hashlib.sha256(source.read_bytes()).hexdigest() == metadata[str(n)]['sha256']
    original = ET.parse(source).getroot()
    expected = {}
    def visit(node, key):
        if node.tag.endswith('defs'):
            return
        expected[key] = node
        for i, child in enumerate(node):
            visit(child, f'{key}-{i}')
    for i, node in enumerate(original):
        visit(node, str(i))
    built = ET.parse(ASSETS / f'frame-{n}.svg').getroot()
    actual = {node.get('data-source'): node for node in built.iter() if node.get('data-source') is not None}
    assert expected.keys() == actual.keys(), 'Missing or duplicated source elements'
    assert len(actual) == sum(node.get('data-source') is not None for node in built.iter())
    for key, source_node in expected.items():
        target = actual[key]
        assert source_node.tag == target.tag
        for attr in GEOMETRY:
            assert source_node.get(attr) == target.get(attr), (n, key, attr)
    ids = [node.get('id') for node in built.iter() if node.get('id')]
    assert len(ids) == len(set(ids)) and not (set(ids) & all_ids)
    all_ids.update(ids)
    parts = [node for node in built.iter() if node.get('data-sp-part')]
    assert len(parts) == (13 if n == 26 else 12)
    for part in parts:
        box = list(map(float, part.get('data-bounds').split()))
        assert box[2] > 0 and box[3] > 0
        assert part.get('tabindex') == '0' and part.get('aria-label')
    def count_class(name):
        return sum(name in node.get('class', '').split() for node in built.iter())
    assert count_class('sp-flow') == (9 if n == 26 else 5)
    if n == 23:
        assert count_class('sp-breathing-circle') == 16
        assert count_class('sp-ripple') == 32
        pulses = [node for node in built.iter() if node.get('data-arrow-source')]
        assert len(pulses) == 3
        for pulse in pulses:
            key = pulse.get('data-arrow-source')
            clip_id = pulse.get('clip-path')[5:-1]
            clip = next(node for node in built.iter() if node.get('id') == clip_id)
            assert clip[0].get('d') == expected[key].get('d'), 'Flow must stay inside its exact source arrow'
    else:
        assert count_class('sp-bracket-laser') == 2
        miniature = next(node for node in built.iter() if node.get('class') == 'sp-node-miniature')
        source_detail = ET.parse(args.sources / 'Frame 23.svg').getroot()
        assert miniature.get('viewBox') == source_detail.get('viewBox')
        assert [p.get('d') for p in miniature.iter() if p.tag.endswith('path')] == [p.get('d') for p in source_detail.iter() if p.tag.endswith('path')]
        assert all(actual[f'2-{i}'].get('display') == 'none' for i in range(4,15))
    print(f'Frame {n}: {len(actual)} source elements preserved; parts and animation geometry verified')

html = (ROOT / 'index.html').read_text()
assert html.index('id="learning-cycle"') < html.index('id="state-progress"') < html.index('id="chunk-weighting"')
for rel in ['style.css', 'assets/state-progress/state.css', 'assets/state-progress/state.js', 'assets/state-progress/frame-26.svg', 'assets/state-progress/frame-23.svg']:
    digest = hashlib.sha256((ROOT / rel).read_bytes()).hexdigest()[:12]
    assert rel + '?v=' + digest in html, f'Stale asset URL: {rel}'
print('Module placement and all content hashes verified')
module = html[html.index('id="state-progress"'):html.index('id="chunk-weighting"')]
assert module.count('<math ') == 1, 'Only the final progress equation belongs in the compact module'
assert 'data-sp-transfer' in module and 'data-sp-link' in module
print('Exact arrow clips, matching node miniature, zoom connector, and single-equation layout verified')

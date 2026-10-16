"""Check the original vectors, crop matrices, task labels and photo references."""
from pathlib import Path
import hashlib, json, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/Frame 20.svg'
OUT = ROOT / 'assets/task-curtain'
source = ET.parse(SOURCE).getroot()
artwork = ET.parse(OUT / 'tasks.svg').getroot()
manifest = json.loads((OUT / 'manifest.json').read_text())
assert hashlib.sha256(SOURCE.read_bytes()).hexdigest() == manifest['sourceSHA256']
original, current = list(source.iter()), list(artwork.iter())
assert len(original) == len(current)
photos = {entry['id']: entry for entry in manifest['photos']}
for before, after in zip(original, current):
    assert before.tag == after.tag
    attributes = dict(before.attrib)
    if before.tag.endswith('}image'):
        entry = photos[before.get('id')]
        attributes['{http://www.w3.org/1999/xlink}href'] = entry['asset']
        assert (OUT / entry['asset']).stat().st_size == entry['bytes']
    assert attributes == after.attrib, (before.tag, before.get('id'))
for task in manifest['labels']:
    label = ET.parse(OUT / f'{task["id"]}-label.svg').getroot()
    for actual, index in zip(label[0], task['sourceIndices']):
        assert ET.tostring(actual) == ET.tostring(source[index])
assert len(photos) == 20 and len(manifest['labels']) == 4
print(f'PASS: {len(current)} SVG elements preserve all geometry and crop matrices; 20 photos and 4 source labels verified.')

"""Keep Frame 20's vector geometry, optimizing only its embedded photographs."""
from pathlib import Path
import base64, copy, hashlib, json, subprocess, sys, tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/Frame 20.svg'
OUT = ROOT / 'assets/task-curtain'
NS = 'http://www.w3.org/2000/svg'
XL = '{http://www.w3.org/1999/xlink}href'
ET.register_namespace('', NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
OUT.joinpath('media').mkdir(parents=True, exist_ok=True)
tree = ET.parse(SOURCE)
svg = tree.getroot()
manifest = {'sourceSHA256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'viewBox': svg.get('viewBox'), 'photos': [], 'labels': []}
with tempfile.TemporaryDirectory() as temporary:
    for i, image in enumerate(svg.findall(f'.//{{{NS}}}image')):
        encoded = image.get(XL) or image.get('href')
        original = Path(temporary) / f'{i}.png'
        original.write_bytes(base64.b64decode(encoded.split(',', 1)[1]))
        output = Path(temporary) / f'{i}.webp'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-vf', r'scale=min(1280\,iw):-1', '-quality', '91', str(output)], check=True)
        data = output.read_bytes()
        name = f'media/frame-{i:02}-{hashlib.sha256(data).hexdigest()[:10]}.webp'
        (OUT / name).write_bytes(data)
        image.set(XL, name)
        manifest['photos'].append({'id': image.get('id'), 'asset': name, 'bytes': len(data)})

for key, title, y, indices in [
    ('assembly', 'Assembly model', 0, [91, 112]),
    ('graphics', 'Graphics card', 189, [0, 88]),
    ('screw', 'Screw tightening', 378, [28, 89]),
    ('memory', 'Memory stick', 567, [55, 90]),
]:
    label = ET.Element(f'{{{NS}}}svg', {'viewBox': '0 0 80 189', 'width': '80', 'height': '189'})
    group = ET.SubElement(label, f'{{{NS}}}g', {'transform': f'translate(0 {-y})'})
    for index in indices:
        group.append(copy.deepcopy(svg[index]))
    ET.ElementTree(label).write(OUT / f'{key}-label.svg', encoding='unicode')
    manifest['labels'].append({'id': key, 'title': title, 'y': y, 'sourceIndices': indices})

tree.write(OUT / 'tasks.svg', encoding='unicode')
(OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Prepared {len(manifest["photos"])} optimized photographs; vector paths and crop matrices are unchanged.')

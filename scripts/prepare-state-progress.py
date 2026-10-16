"""Annotate the supplied SVGs without redrawing their vector geometry."""
from pathlib import Path
import argparse
import base64
import copy
import hashlib
import json
import re
import subprocess
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/state-progress'
NS = 'http://www.w3.org/2000/svg'
XLINK = '{http://www.w3.org/1999/xlink}href'
ET.register_namespace('', NS)
ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')


def element(tag, **attrs):
    return ET.Element(f'{{{NS}}}{tag}', {k.replace('_', '-'): str(v) for k, v in attrs.items()})


def union(boxes):
    x = min(b[0] for b in boxes)
    y = min(b[1] for b in boxes)
    return [x, y, max(b[0] + b[2] for b in boxes) - x, max(b[1] + b[3] for b in boxes) - y]


def build(source, number, measured):
    assert hashlib.sha256(source.read_bytes()).hexdigest() == measured['sha256'], 'Remeasure changed source SVG geometry.'
    root = ET.parse(source).getroot()
    boxes = measured['boxes']
    nodes = {}
    def annotate(node, key):
        if node.tag.endswith('defs'):
            return
        node.set('data-source', key)
        nodes[key] = node
        for index, child in enumerate(node):
            annotate(child, f'{key}-{index}')
    for index, node in enumerate(root):
        annotate(node, str(index))

    # The photos keep their original crop transforms; only their codec changes.
    for index, image in enumerate(root.findall(f'.//{{{NS}}}image')):
        href = image.get(XLINK) or image.get('href')
        if not href or not href.startswith('data:'):
            continue
        with tempfile.TemporaryDirectory() as temp:
            original, compressed = Path(temp) / 'source.img', Path(temp) / 'photo.webp'
            original.write_bytes(base64.b64decode(href.split(',', 1)[1]))
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(original), '-c:v', 'libwebp', '-quality', '94', str(compressed)], check=True)
            image.set(XLINK, 'data:image/webp;base64,' + base64.b64encode(compressed.read_bytes()).decode())

    # IDs must remain independent of the main pipeline and the other frame.
    ids = {e.get('id'): f'sp{number}-{e.get("id")}' for e in root.iter() if e.get('id')}
    for node in root.iter():
        for key, value in list(node.attrib.items()):
            if key == 'id':
                node.set(key, ids[value])
            elif not value.startswith('data:'):
                value = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{ids.get(m[1], m[1])})', value)
                if value.startswith('#') and value[1:] in ids:
                    value = '#' + ids[value[1:]]
                node.set(key, value)

    parts = []
    def group(name, label, keys):
        originals = [nodes[str(key)] for key in keys]
        parents = {child: parent for parent in root.iter() for child in parent}
        parent = parents[originals[0]]
        assert all(parents[node] is parent for node in originals)
        position = min(list(parent).index(node) for node in originals)
        wrapper = element('g', **{'class': 'sp-part', 'data-sp-part': name, 'data-label': label, 'tabindex': '0', 'role': 'img', 'aria-label': label})
        bbox = union([boxes[str(key)] for key in keys])
        wrapper.set('data-bounds', ' '.join(f'{v:.3f}' for v in bbox))
        for node in sorted(originals, key=lambda node: list(parent).index(node)):
            parent.remove(node)
            wrapper.append(node)
        parent.insert(position, wrapper)
        parts.append({'id': name, 'label': label, 'bounds': bbox, 'sources': [str(k) for k in keys]})
        return wrapper

    def classed(node, name):
        node.set('class', (node.get('class', '') + ' ' + name).strip())

    if number == 26:
        group('views', 'Synchronized RGB views', ['3-0', '3-1', '3-2'])
        for camera, keys in [(1, ['3-3', '3-6']), (2, ['3-4', '3-8']), (3, ['3-5', '3-7'])]:
            group(f'camera-{camera}', f'Camera {camera}', keys)
        group('encoder', 'Frozen MCR encoder; shared weights across the three views', [4])
        group('node', 'Graph node: multi-view embeddings and a separate gripper state', [2])
        group('gripper', 'Binary gripper state', list(range(30, 38)) + [72])
        group('grip-filter', 'Gripper state stays separate as a hard compatibility filter', [40, 41])
        group('feature-1', 'Camera 1 embedding', [0, 1] + list(range(18, 24)))
        group('feature-2', 'Camera 2 embedding', [24, 25] + list(range(60, 66)))
        group('feature-3', 'Camera 3 embedding', [26, 27] + list(range(66, 72)))
        group('features', 'Three visual embeddings per state', [17] + list(range(42, 60)))
        bracket = group('merge', 'Combine visual features and gripper state into one graph node', [28, 29])
        flows = [5, 7, 9, 11, 13, 15, 38, '2-4', '2-11']
        heads = [6, 8, 10, 12, 14, 16, 39, '2-12']
        for key in flows:
            node = nodes[str(key)]
            classed(node, 'sp-flow')
            node.set('stroke-dasharray', '12 12' if key not in ['2-4', '2-11'] else '5 5')
            if key in ['2-4', '2-11']:
                node.set('style', '--sp-dash-end: -10')
        for key in heads:
            classed(nodes[str(key)], 'sp-arrow-head')
        for index, key in enumerate([28, 29]):
            laser = copy.deepcopy(nodes[str(key)])
            laser.attrib.pop('data-source', None)
            laser.set('class', 'sp-bracket-laser')
            laser.set('pathLength', '100')
            laser.set('style', f'--sp-delay: {-index * .25}s')
            bracket.append(laser)
        focus = element('g', **{'class': 'sp-focus-beacon', 'aria-hidden': 'true'})
        focus.append(element('circle', cx=869, cy=338, r=13, fill='none', stroke='#65a4bc', stroke_width=1.5))
        focus.append(element('path', d='M849 328v-8h8m24 0h8v8m0 20v8h-8m-24 0h-8v-8', fill='none', stroke='#65a4bc', stroke_width=1.5))
        focus.append(element('circle', cx=869, cy=338, r=3, fill='#72b8cb'))
        bracket.append(focus)
    else:
        group('neighborhood-i', 'Local multi-view neighborhood around state i', [3, 6, 7])
        group('neighborhood-j', 'Local multi-view neighborhood around state j', [4, 22, 23])
        group('cross-distance', 'Compare two states using their local neighborhood scales', [5])
        groups = {
            'state-i': ['State i: three camera embeddings', [10, 11, 12], [160, 66, 84, 84]],
            'state-j': ['State j: three camera embeddings', [26, 27, 28], [365, 240, 84, 84]],
            'before-i': ['Executed temporal neighbor before state i', [9], [49, 104, 48, 48]],
            'after-i': ['Executed temporal neighbor after state i', [13], [307, 59, 48, 48]],
            'before-j': ['Executed temporal neighbor before state j', [29], [253, 266, 48, 48]],
            'after-j': ['Executed temporal neighbor after state j', [25], [521, 235, 48, 48]],
            'scale-i': ['Local temporal scale at state i', [2], [15, 211, 68, 38]],
            'scale-j': ['Local temporal scale at state j', [1], [559, 173, 68, 38]],
            'distance': ['Visual feature distance between the two states', [0], [478, 113, 177, 38]],
        }
        for key, node in nodes.items():
            if '-' in key or node.tag != f'{{{NS}}}path' or node.get('fill') != 'black':
                continue
            b = boxes[key]
            cx, cy = b[0] + b[2] / 2, b[1] + b[3] / 2
            candidates = [(name, values) for name, values in groups.items() if values[2][0]-2 <= cx <= values[2][0]+values[2][2]+2 and values[2][1]-2 <= cy <= values[2][1]+values[2][3]+2]
            assert len(candidates) == 1, (key, cx, cy, candidates)
            candidates[0][1][1].append(int(key))
        for name, (label, keys, _) in groups.items():
            group(name, label, keys)
        for key in [8, 24]:
            overlay = copy.deepcopy(nodes[str(key)])
            overlay.attrib.pop('data-source', None)
            overlay.set('stroke', '#79a5b3')
            overlay.set('stroke-dasharray', '7 15')
            overlay.set('class', 'sp-flow sp-trajectory-flow' + (' sp-flow-reverse' if key == 24 else ''))
            root.insert(list(root).index(nodes[str(key)]) + 1, overlay)
        for key in [14, 15]:
            classed(nodes[str(key)], 'sp-arrow-head')
        # These source arrows are outlined filled dashes, so animate a centerline
        # over them rather than distorting their compound vector geometry.
        for key, d, color in [(80, 'M391 99C433 69 469 78 495 101', '#dfb16e'), (81, 'M137 170C111 181 79 191 66 208', '#79b4c2'), (82, 'M506 221C528 225 548 224 565 209', '#79b4c2')]:
            nodes[str(key)].set('opacity', '.45')
            root.append(element('path', d=d, fill='none', stroke=color, stroke_width=3, stroke_dasharray='5 8', **{'class': 'sp-flow sp-connection-flow', 'aria-hidden': 'true'}))
        parents = {child: parent for parent in root.iter() for child in parent}
        for index, circle in enumerate([e for e in nodes.values() if e.tag == f'{{{NS}}}circle']):
            classed(circle, 'sp-breathing-circle')
            circle.set('style', f'--sp-delay: {-index * .19:.2f}s')
            for phase in [0, 1]:
                ring = copy.deepcopy(circle)
                ring.attrib.pop('data-source', None)
                ring.set('fill', 'none')
                ring.set('stroke', circle.get('stroke') or circle.get('fill'))
                ring.set('stroke-opacity', '.5')
                ring.set('stroke-width', '1.5')
                ring.set('class', 'sp-ripple')
                ring.set('style', f'--sp-delay: {-index * .19 - phase * 1.8:.2f}s')
                ring.set('aria-hidden', 'true')
                parent = parents[circle]
                parent.insert(list(parent).index(circle), ring)
        classed(nodes['5'], 'sp-neighborhood-orbit')
        for key in [7, 23]:
            classed(nodes[str(key)], 'sp-neighborhood-dash')

    root.set('class', f'sp-svg sp-frame-{number}')
    width, height = root.get('viewBox').split()[2:]
    root.insert(0, element('rect', x=0, y=0, width=width, height=height, fill='transparent', pointer_events='all', **{'class': 'sp-hit-surface', 'aria-hidden': 'true'}))
    root.set('role', 'group')
    root.set('aria-label', 'Multi-view state encoding' if number == 26 else 'Locally normalized cross-trajectory connections')
    root.set('overflow', 'visible')
    ET.ElementTree(root).write(OUT / f'frame-{number}.svg', encoding='utf-8', xml_declaration=True)
    return {'source': source.name, 'sha256': measured['sha256'], 'parts': parts}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('sources', type=Path, help='Directory containing Frame 26.svg and Frame 23.svg')
    args = parser.parse_args()
    measured = json.loads((OUT / 'source-bounds.json').read_text())
    metadata = {str(n): build(args.sources / f'Frame {n}.svg', n, measured[str(n)]) for n in [26, 23]}
    (OUT / 'parts.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print('Built both frames with original vector paths, parts, flow, focus, and ripples.')

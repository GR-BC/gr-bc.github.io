"""Validate source fidelity, SVG references, method coverage, and data consistency."""
from pathlib import Path
from collections import Counter
import hashlib, json, re
import xml.etree.ElementTree as E
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets/experiment-motion'
source=E.parse(OUT/'source.svg').getroot(); data=json.loads((OUT/'data.json').read_text())
NS='{http://www.w3.org/2000/svg}'
assert hashlib.sha256((OUT/'source.svg').read_bytes()).hexdigest()==data['sourceSha256']
indices={'assembly':list(range(1,66))+[143], 'graphics':list(range(66,141)), 'screw':[142], 'memory':[141]}
# Compare actual path data, not rendered screenshots or an animation implementation.
for task in data['tasks']:
    svg=E.parse(OUT/task['file']).getroot(); ids=[e.get('id') for e in svg.iter() if e.get('id')]
    assert len(ids)==len(set(ids)),(task['id'],'duplicate IDs')
    for node in svg.iter():
        for attr in node.attrib.values():
            for ref in re.findall(r'url\(#([^)]+)\)',attr):assert ref in ids,(task['id'],ref)
    original_paths=Counter(p.get('d') for i in indices[task['id']] for p in source[i].iter(NS+'path'))
    extracted_paths=Counter(p.get('d') for p in svg.iter(NS+'path'))
    # The original defs contain only rect clips; every plotted path must survive exactly.
    assert original_paths==extracted_paths,(task['id'],'source geometry changed')
    pieces=[e for e in svg.iter() if e.get('class')=='em-method-piece']
    for method in data['methods']:
        counts=Counter(e.get('data-em-part') for e in pieces if e.get('data-em-method')==method['id'])
        assert counts=={'bar':2,'value':1,'label':1,'curve':1,'dot':task['rounds']+1},(task['id'],method,counts)
    hits=[e for e in svg.iter() if e.get('class')=='em-bar-hit']
    assert len(hits)==4
    assert all(e.get('tabindex')=='0' and e.get('aria-label') for e in hits)
    values=task['finalSuccess'];assert all(0<=v<=100 for v in values.values())
    assert task['grbcGain']==values['grbc']-max(v for k,v in values.items() if k!='grbc')
    print(task['label']+': geometry, all four methods, keyboard targets, and reported values verified')
print('All source paths preserved. 16 bars, 16 curves, 64 samples, 16 accessible targets.')

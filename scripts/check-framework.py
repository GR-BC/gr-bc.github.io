"""Check component coverage, links, resources, and optional original-SVG fidelity."""
from pathlib import Path
import collections, hashlib, json, math, sys
import xml.etree.ElementTree as E
repo=Path(__file__).resolve().parents[1];base=repo/'assets/framework'
m=json.loads((base/'components.json').read_text());r=E.parse(base/'framework.svg').getroot()
ids=[e.get('id') for e in r.iter() if e.get('id')];assert len(ids)==len(set(ids)),'Duplicate SVG IDs'
by_id={e.get('id'):e for e in r.iter() if e.get('id')};components={c['id']:c for c in m['components']}
assert len(components)==len(m['components'])
covered=[]
for c in components.values():
    assert c['stage'] in 'ABCD' and c['type']
    assert len(c['bounds'])==4 and all(math.isfinite(v) for v in c['bounds'])
    for eid in c['elementIds']:
        e=by_id[eid];assert e.get('data-component')==c['id'];assert len(e)==1;covered.append(eid)
    assert all(other in components for other in c['related'])
    if c['type'].endswith('-edge'):assert len(c['related'])==2,(c['id'],c['related'])
assert len(covered)==len(set(covered))==m['sourceDrawableCount']==404
for a in m['assets']:assert (base/a['path']).stat().st_size==a['bytes']
for stage in m['stages']:assert stage['elementId'] in by_id
if len(sys.argv)>1:
    p=Path(sys.argv[1]);source=E.parse(p).getroot();assert hashlib.sha256(p.read_bytes()).hexdigest()==m['sourceSha256']
    for eid in covered:
        indexes=list(map(int,eid.removeprefix('fw-source-').split('-')));original=source
        for index in indexes:original=original[index]
        actual=by_id[eid][0]
        assert original.tag==actual.tag and original.attrib==actual.attrib,('Source geometry changed',eid)
    # Filters and crop patterns are byte-for-byte attribute equivalent after image extraction.
    ns='{http://www.w3.org/2000/svg}'
    for category in ['filter','pattern']:
        a=list(source.iter(ns+category));b=list(r.iter(ns+category));assert len(a)==len(b)
        for x,y in zip(a,b):assert E.tostring(x)==E.tostring(y),('Source definitions changed',category)
print(f"PASS: {len(components)} components, {len(covered)} source drawables, {len(m['assets'])} shared images.")
print('Types:',dict(collections.Counter(c['type'] for c in components.values())))
print('Vector artwork, filters, and crop patterns match the source.' if len(sys.argv)>1 else 'Pass a source SVG path to check original-artwork fidelity.')

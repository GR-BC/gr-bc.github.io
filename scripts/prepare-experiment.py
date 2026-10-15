"""Split Frame 16.svg into animatable tasks, retaining every original plot path.
Run: python3 scripts/prepare-experiment.py
No dependencies. The input artwork is the authority for geometry and final labels.
"""
from pathlib import Path
import copy, hashlib, json, re, math
import xml.etree.ElementTree as E
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/experiment-motion'
NS = 'http://www.w3.org/2000/svg'
E.register_namespace('', NS)
def tag(e): return e.tag.rsplit('}', 1)[-1]
def el(t, a=None): return E.Element('{'+NS+'}'+t, a or {})
def box(e):
    # These plot paths use absolute M/L/H/V/C/Z commands with no transforms.
    tokens = re.findall(r'[MLHVCZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?', e.get('d', ''))
    pts=[]; i=0; cmd=''; x=y=0
    while i<len(tokens):
        if tokens[i].isalpha():
            cmd=tokens[i]; i+=1
            if cmd=='Z': continue
        if cmd in ('M','L'):
            x,y=map(float,tokens[i:i+2]);i+=2;pts.append((x,y))
            if cmd=='M':cmd='L'
        elif cmd=='H':x=float(tokens[i]);i+=1;pts.append((x,y))
        elif cmd=='V':y=float(tokens[i]);i+=1;pts.append((x,y))
        elif cmd=='C':
            a=list(map(float,tokens[i:i+6]));i+=6
            pts.extend([(a[0],a[1]),(a[2],a[3]),(a[4],a[5])]);x,y=a[4:]
        else:raise ValueError(cmd)
    if not pts:return [0,0,0,0]
    x=min(p[0] for p in pts);y=min(p[1] for p in pts)
    return [x,y,max(p[0] for p in pts)-x,max(p[1] for p in pts)-y]
METHODS=[{'id':'dagger','label':'DAgger','color':'#F3C8B8','description':'Dataset aggregation with human interventions.'},
         {'id':'awr','label':'AWR','color':'#DFE8D5','description':'Advantage-weighted regression.'},
         {'id':'rabc','label':'RA-BC','color':'#9DD0DB','description':'The RA-BC baseline in the supplied experiment figure.'},
         {'id':'grbc','label':'GR-BC','color':'#F3C888','description':'Graph-reweighted behavior cloning.'}]
COLORS={m['color']:m['id'] for m in METHODS}; COLORS['#F2C8B8']='dagger'
TASKS=[{'id':'assembly','label':'Assembly Model','crop':[0,45,548,681],'indices':list(range(1,66))+[143],'values':[88,72,86,98],'rounds':2},
       {'id':'graphics','label':'Graphics Card','crop':[540,45,526,681],'indices':list(range(66,141)),'values':[63,32,72,93],'rounds':3},
       {'id':'screw','label':'Screw Tightening','crop':[1063,45,526,681],'indices':[142],'values':[56,37,52,89],'rounds':4},
       {'id':'memory','label':'Memory Stick','crop':[1583,45,515,681],'indices':[141],'values':[49,19,57,83],'rounds':3}]
source=E.parse(OUT/'source.svg').getroot(); originals=list(source)
manifest={'version':1,'source':'Frame 16.svg','sourceSha256':hashlib.sha256((OUT/'source.svg').read_bytes()).hexdigest(),
          'methods':METHODS,'tasks':[], 'notes':['Final success values are transcribed from the bar annotations. Curves retain the supplied SVG geometry; no intermediate numeric results are inferred from drawn pixels.']}
for task in TASKS:
    svg=el('svg',{'xmlns':'http://www.w3.org/2000/svg','viewBox':' '.join(map(str,task['crop'])),'fill':'none','role':'group','aria-label':task['label']+' — final success and learning curve'})
    # ElementTree writes its own namespace declaration.
    del svg.attrib['xmlns']
    svg.append(copy.deepcopy(source.find('{'+NS+'}defs')))
    bars={}; counts={}; paths=[]
    for top in task['indices']:
        for path in originals[top].iter('{'+NS+'}path'):
            b=box(path);method=COLORS.get(path.get('fill'))
            if method and b[1]<430 and b[2]>30 and b[3]>40:bars[method]=b
    assert len(bars)==4,(task['id'],bars)
    def wrap(e,top,trail=(),in_definition=False):
        t=tag(e)
        if t in ('mask','defs','clipPath'):return copy.deepcopy(e)
        if t=='g':
            g=el('g',dict(e.attrib))
            for j,c in enumerate(e):g.append(wrap(c,top,trail+(j,)))
            return g
        n=copy.deepcopy(e)
        if t!='path':return n
        b=box(e);method=COLORS.get(e.get('fill')) or COLORS.get(e.get('stroke'));part=None
        if method:
            if b[1]<430 and b[2]>30 and b[3]>40:part='bar'
            elif e.get('stroke-width')=='7':part='curve'
            elif b[1]>430:part='dot'
        elif e.get('stroke')=='#657168':
            for m,bb in bars.items():
                if sum(abs(v-w) for v,w in zip(b,bb))<16:method=m;part='bar';b=bb;break
        idx=trail[0] if trail else top
        values_start=26 if task['id']=='assembly' else 97 if task['id']=='graphics' else 32
        label_start=2 if task['id']!='graphics' else 67
        if not trail or top in (141,142):
            if values_start<=idx<values_start+4:method=METHODS[idx-values_start]['id'];part='value'
            elif label_start<=idx<label_start+4:method=METHODS[idx-label_start]['id'];part='label'
        if not part:return n
        counts[part]=counts.get(part,0)+1
        attrs={'class':'em-method-piece','data-em-method':method,'data-em-part':part,
               'data-em-origin':f'{b[0]+b[2]/2:.4f} {b[1]+b[3] if part=="bar" else b[1]+b[3]/2:.4f}'}
        if part=='curve':n.set('pathLength','1')
        g=el('g',attrs);g.append(n);return g
    for i in task['indices']:svg.append(wrap(originals[i],i))
    for method,b in bars.items():
        # Full-height targets also cover a bar before it has grown. Invisible until focused.
        x,y,w,h=b
        svg.append(el('rect',{'class':'em-bar-hit','data-em-method':method,'data-em-task':task['id'],
            'x':str(x-5),'y':'83','width':str(w+10),'height':str(y+h-83), 'rx':'9',
            'fill':'transparent','tabindex':'0','role':'button','aria-pressed':'false',
            'aria-label':f"{task['label']}, {next(m['label'] for m in METHODS if m['id']==method)}, {task['values'][next(i for i,m in enumerate(METHODS) if m['id']==method)]}% final success. Show details."}))
    # Original IDs are later namespaced per mount, allowing multiple instances.
    (OUT/(task['id']+'.svg')).write_text(E.tostring(svg,encoding='unicode')+'\n')
    final={m['id']:v for m,v in zip(METHODS,task['values'])}
    manifest['tasks'].append({'id':task['id'],'label':task['label'],'file':task['id']+'.svg','rounds':task['rounds'],
        'finalSuccess':final,'bestBaseline':max(task['values'][:3]),'grbcGain':task['values'][3]-max(task['values'][:3]),'parts':counts})
    assert counts['curve']==4,(task['id'],counts)
    assert counts['value']==4 and counts['bar']==8,(task['id'],counts)
(OUT/'data.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Prepared four task SVGs:',[(t['id'],t['parts']) for t in manifest['tasks']])

"""Extract the supplied framework drawing without changing its vector artwork.
Usage: python3 scripts/prepare-framework.py ["path/to/Group 41.svg"]
Python standard library + FFmpeg. IDs are tied to the original drawing's source order.
"""
from pathlib import Path
import base64, copy, hashlib, json, math, re, subprocess, sys, tempfile
import xml.etree.ElementTree as E
REPO=Path(__file__).resolve().parents[1]
OUT=REPO/'assets/framework'
SOURCE=Path(sys.argv[1]) if len(sys.argv)>1 else Path.home()/'Downloads'/'Group 41.svg'
NS='http://www.w3.org/2000/svg'; XL='http://www.w3.org/1999/xlink'
E.register_namespace('',NS);E.register_namespace('xlink',XL)
def tag(e):return e.tag.split('}')[-1]
def node(t,attrs=None):return E.Element('{'+NS+'}'+t,attrs or {})
def union(boxes):
    boxes=[b for b in boxes if b]
    if not boxes:return [0,0,0,0]
    x=min(b[0] for b in boxes);y=min(b[1] for b in boxes)
    return [x,y,max(b[0]+b[2] for b in boxes)-x,max(b[1]+b[3] for b in boxes)-y]
def matrix(s):
    m=[1,0,0,1,0,0]
    for op,txt in re.findall(r'(\w+)\(([^)]+)\)',s or ''):
        a=list(map(float,re.findall(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?',txt)))
        if op=='matrix':n=a
        elif op=='translate':n=[1,0,0,1,a[0],a[1] if len(a)>1 else 0]
        elif op=='scale':n=[a[0],0,0,a[1] if len(a)>1 else a[0],0,0]
        elif op=='rotate':
            c=math.cos(math.radians(a[0]));s=math.sin(math.radians(a[0]));x,y=a[1:] if len(a)>1 else (0,0)
            n=[c,s,-s,c,x-c*x+s*y,y-s*x-c*y]
        else:raise ValueError(op)
        A,B,C,D,X,Y=m;a,b,c,d,x,y=n;m=[A*a+C*b,B*a+D*b,A*c+C*d,B*c+D*d,A*x+C*y+X,B*x+D*y+Y]
    return m
def bbox(e, with_points=False):
    m=matrix(e.get('transform'));t=tag(e);pts=[]
    def add(x,y):pts.append((m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]))
    if t=='g':return union([bbox(c) for c in e])
    if t=='rect':
        x,y,w,h=[float(e.get(k,0)) for k in ('x','y','width','height')]
        for p in [(x,y),(x+w,y),(x+w,y+h),(x,y+h)]:add(*p)
    elif t=='circle':
        x,y,r=[float(e.get(k,0)) for k in ('cx','cy','r')];add(x-r,y-r);add(x+r,y+r)
    elif t=='line':
        for a,b in [('x1','y1'),('x2','y2')]:add(float(e.get(a,0)),float(e.get(b,0)))
    elif t=='path':
        tokens=re.findall(r'[MLHVCZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?',e.get('d',''));i=0;cmd='';x=y=0;start=(0,0)
        while i<len(tokens):
            if tokens[i].isalpha():
                cmd=tokens[i];i+=1
                if cmd=='Z':x,y=start;continue
            if cmd in ('M','L'):
                x,y=map(float,tokens[i:i+2]);i+=2;add(x,y)
                if cmd=='M':start=(x,y);cmd='L'
            elif cmd=='H':x=float(tokens[i]);i+=1;add(x,y)
            elif cmd=='V':y=float(tokens[i]);i+=1;add(x,y)
            elif cmd=='C':
                vals=list(map(float,tokens[i:i+6]));i+=6;p0=(x,y);p1=vals[:2];p2=vals[2:4];p3=vals[4:6]
                ts={0.,1.}
                for axis in (0,1):
                    q0,q1,q2,q3=[p[axis] for p in (p0,p1,p2,p3)];a=-q0+3*q1-3*q2+q3;b=2*(q0-2*q1+q2);c=q1-q0
                    if abs(a)<1e-10:
                        if abs(b)>1e-10:ts.add(-c/b)
                    elif b*b-4*a*c>=0:
                        z=math.sqrt(b*b-4*a*c);ts.update(((-b+z)/(2*a),(-b-z)/(2*a)))
                for v in ts:
                    if 0<=v<=1:add(*[((1-v)**3*p0[k]+3*(1-v)**2*v*p1[k]+3*(1-v)*v*v*p2[k]+v**3*p3[k]) for k in (0,1)])
                x,y=p3
            else:raise ValueError((cmd,tokens[i:i+5]))
    if with_points:return pts
    if not pts:return [0,0,0,0]
    x=min(p[0] for p in pts);y=min(p[1] for p in pts)
    return [x,y,max(p[0] for p in pts)-x,max(p[1] for p in pts)-y]
source=E.parse(SOURCE).getroot();original=list(source);OUT.mkdir(parents=True,exist_ok=True)
assets=[]
with tempfile.TemporaryDirectory(prefix='framework-') as tmp:
    for i,img in enumerate(source.iter('{'+NS+'}image')):
        href=img.get('{'+XL+'}href');raw=base64.b64decode(href.split(',',1)[1]);ext='jpg' if 'jpeg' in href[:30] else 'png';p=Path(tmp)/f'{i}.{ext}';p.write_bytes(raw)
        # Keep the source pixel coordinate system for the existing pattern transforms.
        # At most 768 decoded pixels are needed for the largest displayed image.
        name=f'image-{i:02d}-{hashlib.sha256(raw).hexdigest()[:8]}.webp';dest=OUT/'media'/name
        if not dest.exists():subprocess.run(['ffmpeg','-v','error','-i',str(p),'-vf','scale=min(768\\,iw):-1','-frames:v','1','-c:v','libwebp','-quality','94',str(dest)],check=True)
        original_w,original_h=int(img.get('width')),int(img.get('height'))
        img.set('{'+XL+'}href','media/'+name)
        # SVG image width/height remain original; image decoding resamples into that box.
        assets.append({'id':img.get('id'),'path':'media/'+name,'sourceWidth':original_w,'sourceHeight':original_h,'bytes':dest.stat().st_size})
stage_names={'A':'Goal-reachability graph','B':'Remaining steps & interpolation','C':'Consequence-based weighted SFT','D':'Rollouts & human interventions'}
components={}; counters={}
def auto(stage,typ,label):
    k=(stage,typ);counters[k]=counters.get(k,0)+1
    return f'{stage.lower()}-{typ}-{counters[k]:02d}',f'{label} {counters[k]:02d}',typ

def classify(top,trail,e,b,stage):
    x,y,w,h=b;cx=x+w/2;cy=y+h/2;j=trail[0] if trail else -1;fill=e.get('fill','');t=tag(e)
    def fixed(cid,label,typ):return cid,label,typ
    if top in [0,1,2,3]:return fixed(stage.lower()+'-frame',stage+' · boundary','frame')
    if (stage=='A' and top in [41,42,43,44]) or (stage=='B' and top in [223,224,225,226]) or (stage=='D' and top in [4,5,6,7]) or (top==169 and j in [0,1,2,3]):return fixed(stage.lower()+'-header',stage+' · title & badge','title')
    if top==45:
        if 3<=j<=7:return fixed('a-data-demo','Demonstration data','data')
        if 8<=j<=12:return fixed('a-data-intervention','Intervention / recovery data','intervention')
        if 13<=j<=17:return fixed('a-data-replay','Replay / policy rollouts','data')
        if j==19:return fixed('a-data-iteration','Iteration data window','data')
        return fixed('a-data-panel','Mixed offline data panel','label')
    if top==46:
        if 6<=j<=14:
            n=3 if j<=8 else 2 if j<=11 else 1
            return fixed(f'a-camera-view-{n}',f'MCR camera view {n}','camera')
        if j in [5,15]:return fixed('a-gripper','Gripper state','gripper')
        if j in [3,4]:return fixed('a-embeddings','Multi-view MCR embeddings','label')
        return fixed('a-representation','State representation panel','label')
    if stage=='A':
        if 100<=top<=129 or top==167:return fixed('a-legend','Graph legend & edge cost','legend')
        if top in [50,51]:return fixed('a-graph-title','Goal-reachability graph label','label')
        if top in [135,165,166]:return fixed('a-goal','Goal / success sink','goal')
        if top==47:return fixed('a-state-to-graph','Representation → graph','connector')
        if top in [48,49,255]:return fixed('a-data-to-state','Data → representation','connector')
        if top==130:return fixed('a-failure-label','Failure label','label')
        if top in [52,53,54,131,132,133]:return auto(stage,'highlight-route','Highlighted graph route')
        if top==222:return fixed('loop-a-b-demo','A → B · demo trajectory','connector')
        if top==254:return fixed('loop-a-b-replay','A → B · replay trajectory','connector')
        if 55<=top<=164:
            if fill in ['#99CDD8','#DFE6D4','#F3C8B8','#C7879E'] and w<42 and h<42:
                kind={'#99CDD8':'demo','#DFE6D4':'replay','#F3C8B8':'intervention','#C7879E':'failure'}[fill]
                return auto(stage,'node-'+kind,kind.capitalize()+' graph node')
            typ='temporal-edge' if top in list(range(56,67))+[77,85,86,87,88,89]+list(range(136,144))+[161] else 'similarity-edge'
            return auto(stage,typ,'Temporal edge' if typ=='temporal-edge' else 'Similarity edge')
    if top in [168,256,257]:
        return {168:('loop-d-a','D → A · return to the dataset','connector'),256:('loop-a-b','A → B · remaining-step estimation','connector'),257:('loop-b-c','B → C · training supervision','connector')}[top]
    if stage=='D':
        if top in [35,36,37,38]:
            n=1 if cx<500 else 2 if cx<640 else 3
            return fixed(f'd-rollout-camera-{n}',f'Real-world rollout frame {n}','camera')
        if top==40:return fixed('d-intervention-device','Human intervention device','intervention')
        if top==33:return fixed('d-human-operator','Human operator','operator')
        if top in [34,39]:return fixed('d-feedback','Human feedback arrows','connector')
        if 15<=top<=30:return fixed(f'd-action-{int(round(x/34)):02d}-{int(round(y/38)):02d}','Intervention action chunk' if fill in ['#F3C8B8','#FFD8CA'] else 'Policy action chunk','action')
        return fixed('d-labels','Rollout labels & separators','label')
    if stage=='B':
        if 192<=top<=206:return auto(stage,'remaining-point','Remaining-step sample')
        if 185<=top<=191:return fixed('b-remaining-curve','Remaining steps · connecting curve','curve')
        if 207<=top<=210:return auto(stage,'training-span','Policy / intervention interval')
        if top in [211,212,213,214]:return fixed('b-state-legend','Policy / intervention legend','legend')
        if top in list(range(237,242))+[243,244,245,246,247,248,249]:
            row='demo' if cy<175 else 'mixed';col=min(4,max(1,round((cx-1271)/67)+1))
            return fixed(f'b-trajectory-{row}-frame-{col}',f'{row.capitalize()} trajectory · frame {col}','camera')
        if top in [175,176,177,178,179,180]:return fixed('b-trajectory-demo','Demonstration trajectory strip','trajectory')
        if 228<=top<=236 or top==242:return fixed('b-trajectory-mixed','Mixed trajectory strip','trajectory')
        if top in [183,184]:return fixed('b-remaining-axes','Remaining-step axes','axis')
        return fixed('b-labels','Trajectory & interpolation labels','label')
    if top==169:
        if j==85:return fixed('loop-c-d','C → D · real-world execution','connector')
        if j==83:return fixed('c-training-input','Weighted trajectories → VLA','connector')
        if j==84:
            if cy<690:return fixed('c-vla','VLA behavior cloning','model')
            return fixed('c-objective','GR-BC training objective','formula')
        if 11<=j<=39:
            first={12:11,14:13,17:16,19:18,21:20,23:22,25:24,27:26,29:28,31:30,33:32,35:34,37:36,39:38}.get(j,j)
            bx=round(bbox(original[169][first])[0])
            return fixed(f'c-weight-{bx:04d}',f'Training weight at x={bx}','weight')
        if 43<=j<=60:return auto(stage,'progress-point','Reweighted trajectory sample')
        if 61<=j<=77:return fixed('c-progress-curve','Trajectory progress · connecting curve','curve')
        if j in [40,41,42,78,79,80,81]:return fixed('c-chart-axes','Weight / progress axes','axis')
        return fixed('c-labels','Training labels & separators','label')
    return fixed(stage.lower()+'-details',stage+' · supplementary details','label')

def stage_for(i):
    if i in [1,168]+list(range(4,41)):return 'D'
    if i==257:return 'B'
    if i in [2,169]:return 'C'
    if i==3 or (170<=i<=253 and i!=222):return 'B'
    return 'A'

output=node('svg',dict(source.attrib));output.set('role','img');output.set('aria-labelledby','fw-title fw-description')
E.SubElement(output,'{'+NS+'}title',{'id':'fw-title'}).text='GR-BC: an iterative graph-reweighted behavior-cloning framework'
E.SubElement(output,'{'+NS+'}desc',{'id':'fw-description'}).text='Four stages: construct the graph, estimate remaining steps, weight behavior cloning, and collect real-world rollouts and human interventions.'
output.append(copy.deepcopy(source.find('{'+NS+'}defs')))
stages={s:node('g',{'id':'fw-stage-'+s.lower(),'data-stage':s,'class':'fw-stage'}) for s in 'ABCD'}
for s in 'ABCD':output.append(stages[s])
leaf_count=0

def wrap(e,top,trail,stage):
    global leaf_count
    if tag(e)=='g':
        g=node('g',dict(e.attrib))
        for j,c in enumerate(e):g.append(wrap(c,top,trail+[j],stage))
        return g
    b=bbox(e);cid,label,typ=classify(top,trail,e,b,stage);eid='fw-source-'+str(top)+''.join('-'+str(v) for v in trail)
    info=components.setdefault(cid,{'id':cid,'label':label,'stage':stage,'type':typ,'description':label+'. Original artwork preserved; flow animation is illustrative.','elementIds':[],'boundsParts':[],'anchorParts':[],'related':[]})
    info['elementIds'].append(eid);info['boundsParts'].append(b);info['anchorParts'].extend(bbox(e,True))
    g=node('g',{'id':eid,'data-component':cid,'class':'fw-component'})
    if len(info['elementIds'])==1:g.set('tabindex','0');g.set('role','button');g.set('aria-label',label)
    g.append(copy.deepcopy(e));leaf_count+=1
    return g
for i,e in enumerate(original):
    if tag(e)=='defs':continue
    stage=stage_for(i)
    if i in [168,222,254,256,257]:
        g=node('g',{'class':'fw-stage','data-stage':stage,'id':f'fw-foreground-{i}'});g.append(wrap(e,i,[],stage));output.append(g)
    else:stages[stage].append(wrap(e,i,[],stage))
for c in components.values():c['bounds']=[round(v,4) for v in union(c.pop('boundsParts'))]
# Graph connectivity is attached from the two closest node boundaries, only within stage A.
nodes=[c for c in components.values() if c['type'].startswith('node-') or c['type']=='goal']
for c in components.values():
    if c['type'] not in ['temporal-edge','similarity-edge']:continue
    x,y,w,h=c['bounds'];near=[]
    for n in nodes:
        a,b,u,v=n['bounds'];px,py=a+u/2,b+v/2
        near.append((min(math.hypot(px-qx,py-qy) for qx,qy in c['anchorParts']),n['id']))
    c['related']=[name for distance,name in sorted(near)[:2] if distance<35]
    for nid in c['related']:components[nid]['related'].append(c['id'])
# Link semantic inputs and downstream components without inventing experiment samples.
for a,b in [('a-data-demo','a-embeddings'),('a-data-intervention','a-embeddings'),('a-data-replay','a-embeddings'),('a-gripper','a-embeddings'),('c-vla','c-objective'),('d-human-operator','d-intervention-device')]:
    if a in components and b in components:components[a]['related'].append(b);components[b]['related'].append(a)
for c in components.values():c.pop('anchorParts')
manifest={'version':1,'viewBox':[0,0,1603,777],'sourceSha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'sourceBytes':SOURCE.stat().st_size,'originalGeometryPreserved':True,'textMode':'outlined','stages':[{'id':s,'label':stage_names[s],'elementId':'fw-stage-'+s.lower(),'bounds':{'A':[3,3,1123,443],'B':[1148,3,442,443],'C':[858,474,732,298],'D':[3,474,812,276]}[s]} for s in 'ABCD'],'components':sorted(components.values(),key=lambda c:c['stage']),'assets':assets,'sourceDrawableCount':leaf_count}
(OUT/'framework.svg').write_text(E.tostring(output,encoding='unicode'))
(OUT/'components.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Prepared {len(components)} components, {leaf_count} original drawables, {len(assets)} images.')
print('Public bundle SVG/media bytes:',(OUT/'framework.svg').stat().st_size+sum(a['bytes'] for a in assets))

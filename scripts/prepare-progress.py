"""Build the public, source-faithful trajectory bundle from the provided export."""
import json, pathlib, shutil, subprocess, concurrent.futures
repo = pathlib.Path(__file__).resolve().parents[1]
src = repo.parent / 'progress visual'
out = repo / 'assets/progress'
manifest = json.loads((src/'manifest.json').read_text())
entries=[]; jobs=[]
for entry in manifest['modules']:
    d=json.loads((src/entry['data']).read_text()); mid=d['id']; target=out/mid; target.mkdir(parents=True,exist_ok=True)
    cameras={}
    for cam,info in d['cameras'].items():
        for key in ['src','poster']:
            origin=src/info[key]; dest=target/origin.name
            if not dest.exists(): shutil.copy2(origin,dest)
        cameras[cam]={'src':f'{mid}/{cam}.mp4','poster':f'{mid}/{cam}.poster.jpg'}
    events=[]
    for event in d['events']:
        e={k:event[k] for k in ['id','peak_frame','trough_frame','display_drop_value','display_drop_basis','dense_drop','smoothed_drop','paper_highlight_span_frames']}
        e['keyframes']=[]
        for key in event['keyframes']:
            k={x:key[x] for x in ['role','frame_index','time_sec']}; k['images']={}
            for cam,rel in key['images'].items():
                dest=target/f'{cam}_{pathlib.Path(rel).stem}.webp'
                k['images'][cam]=f'{mid}/{dest.name}'
                jobs.append((src/rel,dest))
            e['keyframes'].append(k)
        events.append(e)
    compact={'id':mid,'title':d['title'],'fps':d['fps'],'default_camera':d['default_camera'],'cameras':cameras,'frame_count':d['sample_count'],'duration':d['stats']['last_frame_time_sec'],'success':d['stats']['success'],'events':events,'semantics':d['progress_semantics'],'smoothing':d['smoothing'],'smooth_window_frames':d['smooth_window_frames'], 'ground_truth_available':False,'samples':[[s['progress_dense'],s['progress_smooth_15'],s['graph_transition_weight']] for s in d['samples']]}
    intervention_field='complementary_info.is_intervention'
    flags=[sample.get(intervention_field) for sample in d['samples']]
    if not all(type(flag) is bool for flag in flags):
        raise ValueError(f'{mid}: missing or invalid intervention flags')
    if any(sample['frame_index'] != i for i,sample in enumerate(d['samples'])):
        raise ValueError(f'{mid}: intervention flags are not in video-frame order')
    compact['intervention']={'source_field':intervention_field,'flags':flags}
    (target/'data.json').write_text(json.dumps(compact,separators=(',',':'))+'\n')
    entries.append({'id':mid,'title':d['title'],'data':f'{mid}/data.json','default_camera':d['default_camera'],'poster':cameras[d['default_camera']]['poster'],'frames':d['sample_count'],'duration':d['stats']['last_frame_time_sec'],'drops':len(events)})
def convert(job):
    a,b=job
    if not b.exists(): subprocess.run(['ffmpeg','-v','error','-i',str(a),'-vf','scale=480:-1','-frames:v','1','-c:v','libwebp','-quality','82',str(b)],check=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(convert,jobs))
(out/'manifest.json').write_text(json.dumps(entries,indent=2)+'\n')
print(f'Prepared {len(entries)} episodes, {len(jobs)} keyframes. Original frame-aligned videos and unrounded numeric samples preserved.')

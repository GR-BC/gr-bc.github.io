"""Refresh content versions for the homepage's interactive modules."""
from pathlib import Path
import hashlib
import re

ROOT = Path(__file__).resolve().parents[1]
digest = lambda path: hashlib.sha256(path.read_bytes()).hexdigest()[:12]

def rewrite(path, pattern, replacement):
    path.write_text(re.sub(pattern, replacement, path.read_text()))

weight = ROOT / 'assets/weight-lab'
if weight.exists():
    rewrite(weight / 'lab.js', r"from './model.js\?v=[\w-]+'", f"from './model.js?v={digest(weight / 'model.js')}'")
    for name in ['lab.css', 'lab.js']:
        rewrite(ROOT / 'index.html', r'assets/weight-lab/' + re.escape(name) + r'\?v=[\w-]+', f'assets/weight-lab/{name}?v={digest(weight / name)}')
        rewrite(weight / 'index.html', re.escape(name) + r'\?v=[\w-]+', f'{name}?v={digest(weight / name)}')

curtain = ROOT / 'assets/task-curtain'
if curtain.exists():
    files = [curtain / 'curtain.css', curtain / 'tasks.svg', curtain / 'manifest.json']
    release = hashlib.sha256(b''.join(path.read_bytes() for path in files)).hexdigest()[:12]
    rewrite(curtain / 'curtain.js', r"from './cloth.js\?v=[\w-]+'", f"from './cloth.js?v={digest(curtain / 'cloth.js')}'")
    rewrite(curtain / 'curtain.js', r"const ASSET_VERSION = '[^']+';", f"const ASSET_VERSION = '{release}';")
    for name in ['curtain.css', 'curtain.js']:
        rewrite(ROOT / 'index.html', r'assets/task-curtain/' + re.escape(name) + r'\?v=[\w-]+', f'assets/task-curtain/{name}?v={digest(curtain / name)}')

experiment = ROOT / 'assets/experiment-motion'
assets = [experiment / name for name in ['experiment-motion.css', 'data.json', 'assembly.svg', 'graphics.svg', 'screw.svg', 'memory.svg']]
release = hashlib.sha256(b''.join(path.read_bytes() for path in assets)).hexdigest()[:12]
rewrite(experiment / 'experiment-motion.js', r"const RELEASE = '[^']+';", f"const RELEASE = '{release}';")
version = digest(experiment / 'experiment-motion.js')
rewrite(experiment / 'preview.js', r'experiment-motion.js\?v=[\w-]+', f'experiment-motion.js?v={version}')
rewrite(ROOT / 'experiment-motion.html', r'preview.js\?v=[\w-]+', f'preview.js?v={digest(experiment / "preview.js")}')

comparison = ROOT / 'assets/progress-comparison'
assets = [comparison / 'comparison.css', *sorted(comparison.glob('*.svg'))]
release = hashlib.sha256(b''.join(path.read_bytes() for path in assets)).hexdigest()[:12]
rewrite(comparison / 'comparison.js', r"const RELEASE = '[^']+';", f"const RELEASE = '{release}';")
rewrite(comparison / 'comparison.js', r"from './comparison.config.js(?:\?v=[\w-]+)?'", f"from './comparison.config.js?v={digest(comparison / 'comparison.config.js')}'")
for name in ['preview.js', 'embed.js']:
    rewrite(comparison / name, r"from './comparison.js(?:\?v=[\w-]+)?'", f"from './comparison.js?v={digest(comparison / 'comparison.js')}'")
for name in ['comparison.css', 'preview.css', 'preview.js']:
    rewrite(ROOT / 'progress-comparison.html', r'assets/progress-comparison/' + re.escape(name) + r'(?:\?v=[\w-]+)?', f'assets/progress-comparison/{name}?v={digest(comparison / name)}')

loader = ROOT / 'assets/homepage-modules.js'
for module in [experiment / 'experiment-motion.js', comparison / 'comparison.js']:
    relative = module.relative_to(ROOT / 'assets').as_posix()
    rewrite(loader, re.escape(relative) + r'\?v=[\w-]+', f'{relative}?v={digest(module)}')

for asset in [ROOT / 'style.css', loader, comparison / 'comparison.css', ROOT / 'assets/motivation.js']:
    relative = asset.relative_to(ROOT).as_posix()
    rewrite(ROOT / 'index.html', re.escape(relative) + r'\?v=[\w-]+', f'{relative}?v={digest(asset)}')
print('Versioned homepage modules and styles.')

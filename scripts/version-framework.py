"""Refresh only the standalone framework kit's content-addressed resource versions."""
from pathlib import Path
import hashlib,re
repo=Path(__file__).resolve().parents[1];base=repo/'assets/framework'
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()[:12]
p=base/'framework.js';s=p.read_text()
bundle=hashlib.sha256((base/'framework.svg').read_bytes()+(base/'components.json').read_bytes()).hexdigest()[:12]
s=re.sub(r"const bundleVersion='[^']*';",f"const bundleVersion='{bundle}';",s)
s=re.sub(r"from './framework.config.js(?:\?v=[a-f0-9]+)?'",f"from './framework.config.js?v={digest(base/'framework.config.js')}'",s);p.write_text(s)
p=base/'preview.js';s=re.sub(r"from './framework.js(?:\?v=[a-f0-9]+)?'",f"from './framework.js?v={digest(base/'framework.js')}'",p.read_text());p.write_text(s)
p=repo/'framework-preview.html';s=p.read_text()
for name in ['framework.css','preview.css','preview.js']:
 s=re.sub(r'assets/framework/'+re.escape(name)+r'(?:\?v=[a-f0-9]+)?',f'assets/framework/{name}?v={digest(base/name)}',s)
p.write_text(s)
print('Versioned standalone framework bundle:',bundle)

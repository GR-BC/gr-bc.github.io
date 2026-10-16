// Bundle the same interactive module for Hyperframes 0.5.x's query-free preview server.
import {readFileSync,realpathSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),base=resolve(root,'assets/weight-lab');
let build;
try {({build}=await import('esbuild'));}
catch {
  const executable=realpathSync(execFileSync('which',['hyperframes'],{encoding:'utf8'}).trim());
  ({build}=createRequire(executable)('esbuild'));
}
const source=readFileSync(resolve(base,'lab.js'),'utf8'),model=readFileSync(resolve(base,'model.js'),'utf8');
const hash=createHash('sha256').update(source).update(model).digest('hex').slice(0,12);
await build({stdin:{contents:source.replace(/model\.js\?v=[\w-]+/g,'model.js'),resolveDir:base,sourcefile:'lab.js',loader:'js'},outfile:resolve(base,'capture.js'),bundle:true,format:'iife',minify:true,legalComments:'eof',charset:'utf8',banner:{js:`// Generated from lab.js + model.js; source ${hash}. Run scripts/prepare-weight-lab.mjs.`}});
console.log(`Built the Hyperframes capture bundle (${hash}).`);

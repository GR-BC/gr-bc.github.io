// Range-capable static preview for synchronized MP4 seeking.
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createReadStream,statSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
const root=resolve(fileURLToPath(new URL('..',import.meta.url))), port=Number(process.env.PORT||8765);
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  try {
    let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';
    const file=resolve(root,'.'+pathname);if(!file.startsWith(root+sep))throw Error();
    const size=statSync(file).size;res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.setHeader('Accept-Ranges','bytes');res.setHeader('Cache-Control','no-store');
    let start=0,end=size-1;
    if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m)throw Error();start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;if(start>end||start>=size){res.writeHead(416,{'Content-Range':`bytes */${size}`});res.end();return;}res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${size}`);}
    res.setHeader('Content-Length',end-start+1);if(req.method==='HEAD'){res.end();return;}createReadStream(file,{start,end}).pipe(res);
  }catch{res.statusCode=404;res.end('Not found');}
}).listen(port,'127.0.0.1',()=>process.stdout.write(`Preview: http://127.0.0.1:${port}/#trajectories\n`));

// A textured fabric mesh. Original SVG geometry is rasterized once; interaction
// changes the cloth vertices rather than distorting the artwork with noise.
export async function createCloth(svg,canvas){
  const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false});
  if(!gl)return null;
  const textureSVG=svg.cloneNode(true);
  textureSVG.setAttribute('width','1466');textureSVG.setAttribute('height','756');
  await Promise.all([...textureSVG.querySelectorAll('image')].map(async image=>{
    const href=image.getAttributeNS('http://www.w3.org/1999/xlink','href')||image.getAttribute('href');
    const response=await fetch(href);if(!response.ok)throw Error('A task photograph could not load.');
    const bytes=new Uint8Array(await response.arrayBuffer());let binary='';
    for(let i=0;i<bytes.length;i+=16384)binary+=String.fromCharCode(...bytes.subarray(i,i+16384));
    image.setAttributeNS('http://www.w3.org/1999/xlink','href',`data:image/webp;base64,${btoa(binary)}`);
  }));
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(textureSVG)],{type:'image/svg+xml'}));
  let image;
  try{image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Task texture could not decode.'));img.src=url;});}
  finally{URL.revokeObjectURL(url);}
  const shader=(type,source)=>{const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(result));return result;};
  const vertex=shader(gl.VERTEX_SHADER,`
    attribute vec3 aPosition; attribute vec2 aUV; attribute vec3 aNormal;
    uniform vec2 uSize; varying vec2 vUV; varying vec3 vNormal;
    void main(){vec2 p=aPosition.xy+vec2(aPosition.z*.16,-aPosition.z*.22);
      gl_Position=vec4(p.x/uSize.x*2.-1.,1.-p.y/uSize.y*2.,-aPosition.z/500.,1.);
      vUV=aUV;vNormal=aNormal;}`);
  const fragment=shader(gl.FRAGMENT_SHADER,`
    precision mediump float; uniform sampler2D uTexture; uniform vec2 uBody; varying vec2 vUV; varying vec3 vNormal;
    void main(){vec2 picture=vec2(vUV.x,clamp((vUV.y-uBody.x)/(uBody.y-uBody.x),0.,1.));
      vec4 tex=texture2D(uTexture,picture);if(vUV.y<uBody.x||vUV.y>uBody.y)tex=vec4(0.);
      vec3 paper=vec3(.975,.976,.957);
      vec3 base=mix(paper,tex.rgb,tex.a);vec3 light=normalize(vec3(-.35,-.45,.9));
      vec3 n=normalize(vNormal);float shade=clamp(1.+.3*(dot(n,light)-light.z),.64,1.13);
      float thread=sin(vUV.x*3700.)*sin(vUV.y*2100.)*.007;
      float seamY=mix(uBody.y,1.,.84);float seam=1.-.06*exp(-pow((vUV.y-seamY)*250.,2.));
      gl_FragColor=vec4((gl_FrontFacing?base:paper)*shade*seam+thread,1.);}`);
  const program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
  const columns=48,rows=28,count=(columns+1)*(rows+1);
  const data=new Float32Array(count*8),positions=new Float32Array(count*3),states=new Float32Array(count*6),indices=[];
  for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);
  for(const [name,size,offset] of [['aPosition',3,0],['aUV',2,12],['aNormal',3,20]]){
    const location=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,32,offset);
  }
  const indexBuffer=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indexBuffer);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices),gl.STATIC_DRAW);
  const size=gl.getUniformLocation(program,'uSize'),body=gl.getUniformLocation(program,'uBody'),breezeSeed=Math.random()*Math.PI*2;
  let lost=false;canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.closest('.demo-theatre').classList.remove('has-cloth-mesh');});
  return {
    corner:{x:0,y:0},
    draw({width,height,bodyStart,bodyEnd,progress,topProgress,pointer,pull,peek,time,wind,dt,staticMotion}){
      if(lost)return;
      const ratio=Math.min(devicePixelRatio||1,1.75),cw=Math.round(width*ratio),ch=Math.round(height*ratio);
      if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch;}
      gl.viewport(0,0,cw,ch);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);gl.uniform2f(size,width,height);gl.uniform2f(body,bodyStart,bodyEnd);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
      const step=Math.min(dt||1/60,.025);
      const breeze=.42+.2*Math.sin(time*.57+breezeSeed)+.15*Math.sin(time*.91+breezeSeed*1.7);
      for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
        const i=row*(columns+1)+col,u=col/columns,v=row/rows,s=i*6;
        const spread=topProgress+(progress-topProgress)*Math.pow(v,1.4);
        const x=u*width,y=v*height,pleat=Math.sin(u*Math.PI*24),fold=pleat*(1-spread);
        let tx=0,ty=0,tz=0;
        if(!staticMotion&&wind){
          const free=Math.pow(v,1.55)*(.3+.7*u);
          tx=(Math.sin(time*.8+breezeSeed)*3+Math.sin(u*5.2-time*1.1+breezeSeed)*2)*free*breeze;
          ty=Math.sin(time*.63+u*4+breezeSeed)*free*breeze*2;
          tz=(Math.sin(u*5.4-time*1.25+breezeSeed)*13+Math.sin(u*11.3+time*.73)*4)*free*breeze;
        }
        if(!staticMotion&&pointer.strength>0){
          const distance=((x-pointer.x)**2/180**2+(y-pointer.y)**2/150**2),influence=Math.exp(-distance)*pointer.strength*u;
          tx+=pointer.vx*.025*influence;ty+=pointer.vy*.015*influence;
          tz+=(7+Math.abs(pointer.vx)*.035+Math.cos((x-pointer.x)/28)*Math.abs(pointer.vx)*.015)*influence;
        }
        if(!staticMotion&&pull.active){
          const grip=Math.pow(u,2.7)*Math.pow(v,2.2);
          tx+=pull.x*grip;ty+=pull.y*grip;
          tz+=(24+Math.min(55,Math.hypot(pull.x,pull.y)*.22))*grip;
          tz+=Math.sin((1-u)*19)*Math.min(30,Math.abs(pull.y)*.13)*v*v*u;
        }
        if(staticMotion){states.fill(0,s,s+6);}else for(let axis=0;axis<3;axis++){
          const target=col===0||row===0?0:[tx,ty,tz][axis];
          states[s+3+axis]+=((target-states[s+axis])*145-states[s+3+axis]*19)*step;
          states[s+axis]+=states[s+3+axis]*step;
        }
        const lifted=peek*Math.pow(u,8)*Math.pow(v,6),hem=Math.max(0,(v-bodyEnd)/(1-bodyEnd));
        positions[i*3]=x*spread+states[s]-lifted*width*.012;
        positions[i*3+1]=y+states[s+1]+fold*5*Math.sin(v*Math.PI)+(pleat-1)*9*hem*hem-lifted*height*.075;
        positions[i*3+2]=states[s+2]+(staticMotion?0:fold*23+pleat*(2+13*Math.pow(hem,1.4))*(.15+.85*v)+lifted*24);
      }
      for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
        const i=row*(columns+1)+col,o=i*8,p=i*3;
        const left=(row*(columns+1)+Math.max(0,col-1))*3,right=(row*(columns+1)+Math.min(columns,col+1))*3;
        const top=(Math.max(0,row-1)*(columns+1)+col)*3,bottom=(Math.min(rows,row+1)*(columns+1)+col)*3;
        const ax=positions[right]-positions[left],ay=positions[right+1]-positions[left+1],az=positions[right+2]-positions[left+2];
        const bx=positions[bottom]-positions[top],by=positions[bottom+1]-positions[top+1],bz=positions[bottom+2]-positions[top+2];
        let nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx;const length=Math.hypot(nx,ny,nz)||1;
        nx/=length;ny/=length;nz/=length;
        data.set([positions[p],positions[p+1],positions[p+2],col/columns,row/rows,nx,ny,nz],o);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,data);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
      const last=(count-1)*3;this.corner={x:positions[last]+positions[last+2]*.16,y:positions[last+1]-positions[last+2]*.22};
    },
    destroy(){gl.deleteBuffer(buffer);gl.deleteBuffer(indexBuffer);gl.deleteTexture(texture);gl.deleteProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);}
  };
}

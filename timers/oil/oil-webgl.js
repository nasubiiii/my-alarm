/* My Alarm — oil motion WebGL renderer. No third-party dependency.
   The timer state in script.js remains authoritative. Falls back to oil-canvas.js. */
(()=>{'use strict';
const art=document.getElementById('timer-art');
if(!art||typeof visualTimerScenes==='undefined'||typeof timer==='undefined')return;
// The SVG scene may already have been mounted before this deferred renderer loads.
// Set a traceable state so that the active renderer can be checked in DevTools.
window.myAlarmOilRendererStatus={mode:'initializing',reason:'',version:'05.7.2'};
function mountOilScene(){
 if(timer.kind!==3)return;
 // Drop only the currently displayed oil scene. The shared timer clock stays intact.
 art.replaceChildren();
 tickTimer();
}

const test=document.createElement('canvas');
let gl;try{gl=test.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,depth:false,stencil:false,preserveDrawingBuffer:false});}catch{}
if(!gl){window.myAlarmOilRendererStatus={mode:'fallback-loading',reason:'WebGL context unavailable',version:'05.7.2'};const s=document.createElement('script');s.src='./timers/oil/oil-canvas.js';document.body.append(s);return;}
visualTimerScenes[3]='<canvas class="oil-canvas oil-webgl vt-svg" role="img" aria-label="Three-dimensional glass oil timer with moving luminous droplets"></canvas>';
const vertex=`attribute vec2 a; varying vec2 uv; void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;
uniform float uProgress,uMotion,uReduce;
uniform vec2 uSize;
float hash(float n){return fract(sin(n*127.1+78.233)*43758.5453);}
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec3 sphereNormal(vec2 p,vec2 center,float radius){vec2 d=(p-center)/radius;return normalize(vec3(d,sqrt(max(.002,1.-dot(d,d)))));}
vec3 shadeDrop(vec3 n,vec3 base,float k){vec3 light=normalize(vec3(-.5,.8,1.2));float diffuse=max(dot(n,light),0.);float spec=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),34.);float rim=pow(1.-max(n.z,0.),2.2);return base*(.36+.67*diffuse)+vec3(1.,.92,1.)*spec*.85+vec3(.3,.15,.5)*rim*.4;}
void main(){
 vec2 p=(uv-.5)*vec2(2.1,2.5);p.y+=.01;
 float body=sdRoundBox(p,vec2(.365,.985),.34);
 float shadow=exp(-pow((p.x)/.57,2.)-pow((p.y+1.12)/.08,2.))*.16;
 vec3 col=vec3(.94,.965,.98);
 float a=0.;
 if(body<.065){
  float edge=smoothstep(-.07,.07,body);
  float radial=clamp(abs(p.x)/.365,0.,1.);
  float inside=smoothstep(.017,-.012,body);
  float refractLine=pow(radial,5.);
  col=mix(vec3(.90,.955,.985),vec3(.985,.993,1.),.5+.5*sin(p.y*2.2));
  col+=vec3(.04,.075,.10)*pow(1.-radial,3.);
  col=mix(col,vec3(.35,.67,.83),refractLine*.58);
  col+=vec3(.98,1.,1.)*exp(-pow((p.x+.26)/.026,2.))*.28;
  col+=vec3(.9,1.,1.)*exp(-pow((p.x-.27)/.018,2.))*.22;
  float fillHeight=mix(.10,.46,uProgress);
  float wave=sin(p.x*15.+uMotion*.9)*.008+sin(p.x*29.-uMotion*.63)*.003;
  float bottom=1.-smoothstep(-.985+fillHeight+wave-.015,-.985+fillHeight+wave+.014,p.y);
  vec3 water=mix(vec3(.02,.39,.76),vec3(.17,.86,.96),clamp((p.y+.985)/.49,0.,1.));
  water+=vec3(.08,.13,.15)*pow(1.-radial,2.);
  col=mix(col,water,bottom*.91*inside);
  float surface=exp(-pow((p.y-(-.985+fillHeight+wave))/.014,2.));
  col+=vec3(.55,.94,1.)*surface*.55*inside;
  float top=1.-smoothstep(.985-.095*(1.-uProgress)-.01,.985-.095*(1.-uProgress)+.01,p.y);
  float topRegion=smoothstep(.985-.095*(1.-uProgress)-.012,.985-.095*(1.-uProgress)+.012,p.y);
  col=mix(col,vec3(.04,.17,.75),topRegion*.72*inside);
  // Deterministic droplets: their trajectory follows elapsed countdown, never loops.
  for(int i=0;i<18;i++){
   float id=float(i);float seed=hash(id+1.);float release=(id+.4)/18.*.78;
   float t=clamp((uProgress-release)/(.18+.14*hash(id+9.)),0.,1.);
   float ease=t*t*(3.-2.*t);
   float rad=mix(.026,.065,hash(id+18.));
   vec2 center;
   if(uProgress<release){center=vec2((seed-.5)*.40,.88+(hash(id+30.)-.5)*.08);}
   else if(t>=1.){center=vec2((seed-.5)*.46,-.91+fillHeight*.65+(hash(id+21.)-.5)*.11);}
   else {center=vec2(sin(id*2.4+ease*8.)*.18+sin(uMotion*.5+id)*.012,.84-ease*1.69);}
   center.x=clamp(center.x,-.295+rad,.295-rad);
   float stretch=1.+sin(t*3.14159)*.30;
   vec2 delta=(p-center)/vec2(1./sqrt(stretch),stretch);
   float dist=length(delta);
   if(dist<rad){vec3 n=sphereNormal(delta,vec2(0.),rad);vec3 pink=mix(vec3(.87,.12,.55),vec3(.42,.22,.88),step(.70,hash(id+42.)));
    vec3 c=shadeDrop(n,pink,id);c+=vec3(.12,.03,.12)*sin(id+uMotion*.2)*.07;
    float alpha=smoothstep(rad,rad-.009,dist);
    col=mix(col,c,alpha*.98);
    float highlight=exp(-pow((delta.x+rad*.32)/(rad*.17),2.)-pow((delta.y-rad*.36)/(rad*.2),2.));
    col+=vec3(1.,.91,1.)*highlight*.33;
   }
  }
  // Front glass: curved edge and specular strip, top/bottom thickness.
  float rim=exp(-pow(body/.024,2.));
  col=mix(col,vec3(.76,.88,.99),rim*.45);
  col+=vec3(1.)*exp(-pow((p.x+.28)/.012,2.))*.27*inside;
  col+=vec3(.85,.97,1.)*exp(-pow((p.x-.295)/.01,2.))*.30*inside;
  col+=vec3(1.)*exp(-pow((abs(p.y)-.96)/.026,2.))*.18*inside;
  a=1.-smoothstep(.025,.06,body);
 }
 col=mix(vec3(.06,.15,.23),col,a);
 // Canvas is transparent outside glass; subtle contact shadow beneath.
 a=max(a,shadow);col=mix(vec3(.13,.24,.31),col,a);
 gl_FragColor=vec4(clamp(col,0.,1.),a);
}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
let program;
try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));}
catch(e){console.warn('Oil WebGL unavailable; using Canvas fallback',e);window.myAlarmOilRendererStatus={mode:'fallback-loading',reason:String(e),version:'05.7.2'};const s=document.createElement('script');s.src='./timers/oil/oil-canvas.js';document.body.append(s);return;}
gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const progressLoc=gl.getUniformLocation(program,'uProgress'),motionLoc=gl.getUniformLocation(program,'uMotion'),reduceLoc=gl.getUniformLocation(program,'uReduce'),sizeLoc=gl.getUniformLocation(program,'uSize');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let canvas=null,raf=0,motion=0,last=0,contextLost=false;
const visible=()=>timer.kind===3&&!document.hidden&&!document.getElementById('timer-screen').hidden&&!document.getElementById('timer-detail').hidden;
function render(){const current=art.querySelector('canvas.oil-webgl');if(!current||contextLost)return;
 if(canvas!==current){canvas=current;gl.canvas.width=1; // Renderer context belongs to the initial canvas: rebind through canvas replacement below.
  canvas.replaceWith(test);test.className='oil-canvas oil-webgl vt-svg';test.setAttribute('role','img');test.setAttribute('aria-label','3D glass oil timer');canvas=test;}
 const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
 const dpr=Math.min(window.devicePixelRatio||1,1.75),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
 const left=timer.end?Math.max(0,timer.end-Date.now()):timer.left;
 gl.uniform1f(progressLoc,timer.total?Math.max(0,Math.min(1,1-left/timer.total)):0);
 gl.uniform1f(motionLoc,motion*.001);gl.uniform1f(reduceLoc,reduced.matches?1:0);gl.uniform2f(sizeLoc,w,h);
 gl.drawArrays(gl.TRIANGLES,0,6);
 if(window.myAlarmOilRendererStatus?.mode!=='webgl-active')window.myAlarmOilRendererStatus={mode:'webgl-active',reason:'',version:'05.7.2'};
}
function frame(t){raf=0;if(!visible()||!timer.end||reduced.matches)return;motion+=Math.min(48,Math.max(0,t-last));last=t;render();raf=requestAnimationFrame(frame);}
function sync(){if(!visible()||!timer.end||reduced.matches){if(raf){cancelAnimationFrame(raf);raf=0;}if(visible())render();return;}render();if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}}
const previous=tickTimer;tickTimer=function(){previous();sync();};
window.myAlarmOilRendererStatus={mode:'webgl-ready',reason:'',version:'05.7.2'};
// Invalidate the previous SVG and mount the new WebGL canvas immediately.
mountOilScene();
document.addEventListener('visibilitychange',sync);reduced.addEventListener?.('change',sync);window.addEventListener('resize',sync,{passive:true});document.getElementById('timer-screen').addEventListener('click',()=>requestAnimationFrame(sync));
test.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;if(raf)cancelAnimationFrame(raf);raf=0;});
test.addEventListener('webglcontextrestored',()=>{contextLost=false;sync();});
tickTimer();
})();

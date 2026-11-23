/* My Alarm — oil motion WebGL renderer. No third-party dependency.
   The timer state in script.js remains authoritative. Falls back to oil-canvas.js. */
(()=>{'use strict';
const art=document.getElementById('timer-art');
if(!art||typeof visualTimerScenes==='undefined'||typeof timer==='undefined')return;
// The SVG scene may already have been mounted before this deferred renderer loads.
// Set a traceable state so that the active renderer can be checked in DevTools.
window.myAlarmOilRendererStatus={mode:'initializing',reason:'',version:'05.7.9'};
function mountOilScene(){
 if(timer.kind!==3)return;
 // Drop only the currently displayed oil scene. The shared timer clock stays intact.
 art.replaceChildren();
 tickTimer();
}

const test=document.createElement('canvas');
let gl;try{gl=test.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:false,depth:false,stencil:false,preserveDrawingBuffer:false});}catch{}
if(!gl){window.myAlarmOilRendererStatus={mode:'fallback-loading',reason:'WebGL context unavailable',version:'05.7.9'};const s=document.createElement('script');s.src='./timers/oil/oil-canvas.js';document.body.append(s);return;}
visualTimerScenes[3]='<canvas class="oil-canvas oil-webgl vt-svg" role="img" aria-label="Three-dimensional glass oil timer with moving luminous droplets"></canvas>';
const vertex=`attribute vec2 a; varying vec2 uv; void main(){uv=a*.5+.5;gl_Position=vec4(a,0.,1.);}`;
const fragment=`precision highp float;
varying vec2 uv;
uniform float uProgress,uMotion,uReduce,uFinished,uRunning;
uniform vec2 uSize;
float hash(float n){return fract(sin(n*127.1+78.233)*43758.5453);}
float sdRoundBox(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
vec3 sphereNormal(vec2 p,vec2 center,float radius){vec2 d=(p-center)/radius;return normalize(vec3(d,sqrt(max(.002,1.-dot(d,d)))));}
vec3 shadeDrop(vec3 n,vec3 base,float k){
 vec3 light=normalize(vec3(-.53,.82,1.18));
 float diffuse=max(dot(n,light),0.);
 float primary=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),52.);
 float broad=pow(max(dot(normalize(vec3(-.4,.4,1.)),n),0.),12.);
 float rim=pow(1.-max(n.z,0.),2.65);
 float lower=clamp(n.y*.45+.65,0.,1.);
 vec3 pigment=base*(.25+.78*diffuse)*lower;
 pigment+=vec3(1.,.92,.98)*primary*1.12;
 pigment+=vec3(.82,.53,.86)*broad*.20;
 pigment+=mix(vec3(.24,.02,.30),base*.65,.40)*rim*.42;
 return pigment;
}
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
  // Transparent-looking blown glass with a soft environment reflection.
  float ambient=.5+.5*sin(p.y*1.45+p.x*.65);
  col=mix(vec3(.85,.929,.962),vec3(.988,.995,1.),ambient);
  col+=vec3(.038,.07,.09)*exp(-pow((p.x+.12)/.16,2.));
  col+=vec3(.04,.075,.10)*pow(1.-radial,3.);
  // Edge refraction is stronger near the curved walls than the flat centre.
  float fresnel=pow(radial,4.5);
  col=mix(col,vec3(.30,.63,.79),refractLine*.48);
  col+=vec3(.07,.105,.13)*fresnel*(.5+.5*cos(p.y*3.7));
  col+=vec3(.98,1.,1.)*exp(-pow((p.x+.26)/.026,2.))*.28;
  col+=vec3(.9,1.,1.)*exp(-pow((p.x-.27)/.018,2.))*.22;
  float fillHeight=mix(.10,.46,uProgress);
  float wave=uRunning*(1.-uFinished)*(sin(p.x*15.+uMotion*.9)*.008+sin(p.x*29.-uMotion*.63)*.003);
  float bottom=1.-smoothstep(-.985+fillHeight+wave-.015,-.985+fillHeight+wave+.014,p.y);
  vec3 water=mix(vec3(.02,.39,.76),vec3(.17,.86,.96),clamp((p.y+.985)/.49,0.,1.));
  water+=vec3(.08,.13,.15)*pow(1.-radial,2.);
  // Soft light transmitted through cyan fluid, with vertical caustics.
  water+=vec3(.055,.11,.16)*exp(-pow((p.x+.14+sin(p.y*4.0)*.018)/.07,2.));
  water+=vec3(.048,.10,.09)*exp(-pow((p.x-.23)/.048,2.));
  col=mix(col,water,bottom*.88*inside);
  float surface=exp(-pow((p.y-(-.985+fillHeight+wave))/.014,2.));
  col+=vec3(.55,.94,1.)*surface*.55*inside;
  float top=1.-smoothstep(.985-.095*(1.-uProgress)-.01,.985-.095*(1.-uProgress)+.01,p.y);
  float topRegion=smoothstep(.985-.095*(1.-uProgress)-.012,.985-.095*(1.-uProgress)+.012,p.y);
  col=mix(col,vec3(.04,.17,.75),topRegion*.72*inside);
  // Timed droplets retain their 05.7.3 trajectory and do not loop.
  // The smooth union makes adjacent oil beads pull together like viscous liquid.
  float nearest=10.,second=10.;
  vec2 closestDelta=vec2(0.);
  float closestRadius=.04,closestId=0.;
  vec3 nearestPigment=vec3(1.,.1,.5);
  // Track droplets that have reached the lower reservoir. Unlike an animation
  // loop, this value follows the authoritative countdown and remains paused.
  float arrived=0.;
  // Deterministic contact ripples: tied to countdown progress rather than FPS.
  float impactPulse=0.;
  float impactX=0.;
   for(int i=0;i<18;i++){
   float id=float(i);float seed=hash(id+1.);float release=(id+.4)/18.*.78;
   float t=clamp((uProgress-release)/(.18+.14*hash(id+9.)),0.,1.);
   float ease=t*t*(3.-2.*t);
   float rad=mix(.029,.077,hash(id+18.));
   vec2 center;
   if(uProgress<release){center=vec2((seed-.5)*.40,.88+(hash(id+30.)-.5)*.08);}
   else if(t>=1.){center=vec2((seed-.5)*.46,-.91+fillHeight*.65+(hash(id+21.)-.5)*.11);}
   else {center=vec2(sin(id*2.4+ease*8.)*.18+sin(uMotion*.5+id)*.012,.84-ease*1.69);}
   center.x=clamp(center.x,-.295+rad,.295-rad);
   // Reservoir level rises smoothly as beads arrive, avoiding one-frame steps.
   if(uProgress>=release){
     float settle=smoothstep(.80,1.,t);
     arrived+=settle;
     float impactAt=release+(.18+.14*hash(id+9.));
     // A short, localized response to each arriving bead (progress-based).
     float since=(uProgress-impactAt);
     float pulse=step(0.,since)*exp(-max(0.,since)*max(0.,since)/(.014*.014));
     if(pulse>impactPulse){
       impactPulse=pulse;
       impactX=clamp((seed-.5)*.46,-.24,.24);
     }
   }
   // Unreleased beads live in the top reservoir: only beads about to leave
   // are rendered separately, avoiding an artificial cluster of 18 spheres.
   float active=step(release,uProgress)+step(uProgress,release)*step(release-uProgress,.07);
   if(active>.5 && t<.999 && uFinished<.5){
    float drifting=sin(t*3.14159);
    float stretch=1.+drifting*(.22+.23*hash(id+7.));
    vec2 waveOffset=vec2(sin(uMotion*.001*1.7+id*2.31)*.0027,
                         cos(uMotion*.001*1.3+id*1.91)*.0034)*drifting*(1.-uReduce)*uRunning;
    vec2 delta=(p-center-waveOffset)/vec2(1./sqrt(stretch),stretch);
    // A subtle travelling ripple distorts the silhouette without changing its path.
    float theta=atan(delta.y,delta.x);
    float rimWave=1.+drifting*(1.-uReduce)*uRunning*(.055*sin(theta*3.+uMotion*.001*2.1+id*2.)
                   +.035*sin(theta*5.-uMotion*.001*1.2+id));
    float dist=length(delta)-rad*rimWave;
    if(dist<nearest){second=nearest;nearest=dist;closestDelta=delta;
      closestRadius=rad;closestId=id;
      nearestPigment=mix(vec3(.93,.075,.48),vec3(.40,.14,.81),step(.70,hash(id+42.)));
    }else if(dist<second){second=dist;}
   }
  }
  // Smooth minimum only joins genuinely touching droplets.
  float mergeRange=.019;
  float closeness=max(mergeRange-abs(nearest-second),0.)/mergeRange;
  float fused= min(nearest,second)-closeness*closeness*mergeRange*.25;
  // Slightly widen the neck between touching drops without changing their paths.
  float oilAlpha=(1.-smoothstep(-.003,.010,fused))*inside;
  if(oilAlpha>.001){
   vec3 n=sphereNormal(closestDelta,vec2(0.),closestRadius);
   vec3 pigment=shadeDrop(n,nearestPigment,closestId);
   // Softbox reflections, denser shadow at bottom, and translucent edges.
   float spec=exp(-pow((n.x+.33)/.25,2.)-pow((n.y-.42)/.17,2.));
   pigment+=vec3(1.,.88,.99)*spec*.25;
   pigment+=nearestPigment*pow(1.-max(n.z,0.),2.1)*.13;
   pigment*=1.-.11*(1.-smoothstep(-.75,.25,n.y));
   // Lower edge picks up the reservoir's reflected magenta light.
   float lowerRef=clamp((-p.y-.55)/.40,0.,1.);
   pigment=mix(pigment,pigment+vec3(.20,.045,.19),lowerRef*.14);
   col=mix(col,pigment,oilAlpha*.98);
  }
  // Settled oil joins a single connected viscous body instead of building a
  // pile of bead-like spheres. The pool height is driven by droplet arrivals.
  float settled=mix(arrived/18.,1.,uFinished);
  if(settled>.001){
    float impactDistance=abs(p.x-impactX);
    // Decaying concentric surface response under the arriving droplet.
    float impactWave=uRunning*(1.-uFinished)*(1.-uReduce)*.019*impactPulse
           *exp(-impactDistance*5.0)
           *cos(impactDistance*24.-uProgress*32.);
    float ripple=uRunning*(1.-uFinished)*(1.-uReduce)*(.006*sin(p.x*14.+uMotion*.65)
                  +.003*sin(p.x*26.-uMotion*.43)) + impactWave;
    float poolFloor=-.962;
    float poolHeight=.018+.30*settled;
    // Meniscus rises at the glass walls and retains a gently rounded top.
    float side=clamp(abs(p.x)/.315,0.,1.);
    float poolTop=poolFloor+poolHeight+.022*pow(side,4.)+ripple;
    float poolMask=smoothstep(poolTop+.010,poolTop-.008,p.y)
       *smoothstep(poolFloor-.014,poolFloor+.015,p.y)
       *smoothstep(.323,.285,abs(p.x))*inside;
    float whorl=.5+.5*sin(p.x*18.+p.y*10.+uMotion*.0005);
    vec3 oilPool=mix(vec3(.46,.055,.48),vec3(.82,.095,.50),whorl*.52+.18);
    oilPool=mix(oilPool,vec3(.28,.08,.55),.19+.22*sin(p.x*11.-p.y*5.));
    oilPool*=.87+.13*smoothstep(poolFloor,poolTop,p.y);
    col=mix(col,oilPool,poolMask*.88);
    float meniscus=exp(-pow((p.y-poolTop)/.013,2.))*inside
       *smoothstep(.323,.285,abs(p.x));
    col+=vec3(.94,.39,.74)*meniscus*(.31+.25*impactPulse*uRunning*(1.-uFinished));
    // Fine radial highlight around the point where a bead merges into the pool.
    float contactLight=impactPulse*uRunning*(1.-uFinished)
        *exp(-pow((p.x-impactX)/.070,2.))
        *exp(-pow((p.y-poolTop)/.031,2.));
    col+=vec3(.72,.43,.91)*contactLight*.38;
    float poolSpec=exp(-pow((p.x+.16)/.045,2.))*(.5+.5*sin(p.y*9.));
    col+=vec3(1.,.53,.89)*poolMask*poolSpec*.16;
  }
  // Water surface shimmers where coloured oil passes through it.
  float oilSurfaceGlow=exp(-pow((p.y-(-.985+fillHeight+wave))/.023,2.));
  col+=vec3(.07,.18,.19)*oilSurfaceGlow*inside*(.45+.3*uRunning*sin(p.x*21.+uMotion*.001));
  // Front glass: curved edge and specular strip, top/bottom thickness.
  float rim=exp(-pow(body/.024,2.));
  col=mix(col,vec3(.77,.90,.99),rim*.37);
  float shoulder=exp(-pow((abs(p.x)-.322)/.04,2.));
  col=mix(col,vec3(.80,.96,1.),shoulder*.13*inside);
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
catch(e){console.warn('Oil WebGL unavailable; using Canvas fallback',e);window.myAlarmOilRendererStatus={mode:'fallback-loading',reason:String(e),version:'05.7.9'};const s=document.createElement('script');s.src='./timers/oil/oil-canvas.js';document.body.append(s);return;}
gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const loc=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
const runningLoc=gl.getUniformLocation(program,'uRunning'),finishedLoc=gl.getUniformLocation(program,'uFinished'),progressLoc=gl.getUniformLocation(program,'uProgress'),motionLoc=gl.getUniformLocation(program,'uMotion'),reduceLoc=gl.getUniformLocation(program,'uReduce'),sizeLoc=gl.getUniformLocation(program,'uSize');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let canvas=null,raf=0,motion=0,last=0,contextLost=false;
let completed=false;
let previousState="initial",lastTotal=timer.total;
let frozenStateKey=null;let renderCount=0;
const visible=()=>timer.kind===3&&!document.hidden&&!document.getElementById('timer-screen').hidden&&!document.getElementById('timer-detail').hidden;
// Timer status, not the animation clock, is authoritative. In particular,
// a reset must restore the original motion phase instead of reusing the phase
// accumulated during the previous run.
function timerState(){
 const remaining=timer.end?Math.max(0,timer.end-Date.now()):timer.left;
 const running=!!timer.end&&remaining>0;
 const finished=(!running&&timer.total>0&&remaining===0);
 return {remaining,running,finished};
}
function render(){
 const current=art.querySelector('canvas.oil-webgl');if(!current||contextLost)return;
 if(canvas!==current){canvas=current;gl.canvas.width=1;
  canvas.replaceWith(test);test.className='oil-canvas oil-webgl vt-svg';test.setAttribute('role','img');test.setAttribute('aria-label','3D glass oil timer');canvas=test;}
 const rect=canvas.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
 const dpr=Math.min(window.devicePixelRatio||1,1.75),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
 const state=timerState();
 const finished=completed||state.finished;
 const active=state.running&&!reduced.matches;
 gl.uniform1f(finishedLoc,finished?1:0);
 gl.uniform1f(runningLoc,active?1:0);
 gl.uniform1f(progressLoc,finished?1:(timer.total?Math.max(0,Math.min(1,1-state.remaining/timer.total)):0));
 gl.uniform1f(motionLoc,motion*.001);gl.uniform1f(reduceLoc,reduced.matches?1:0);gl.uniform2f(sizeLoc,w,h);
 gl.drawArrays(gl.TRIANGLES,0,6);
 renderCount++;
 window.myAlarmOilRendererStatus={mode:'webgl-active',reason:'',version:'05.7.9',state:timerState().running?'running':(timerState().finished?'finished':timerState().remaining===timer.total?'ready':'paused'),renderCount};
}
// The GPU must not redraw at all when idle, paused, or finished. A frozen
// canvas is left intact until an actual state transition or resize.
function snapshotKey(state){
 if(state.finished||completed)return 'finished:'+timer.total;
 if(state.remaining>=timer.total)return 'ready:'+timer.total;
 return 'paused:'+timer.total+':'+Math.round(state.remaining);
}
function drawFrozen(state,force=false){
 const key=snapshotKey(state);
 const needsMount=!!art.querySelector('canvas.oil-webgl') && art.querySelector('canvas.oil-webgl')!==canvas;
 if(!force&&key===frozenStateKey&&!needsMount)return;
 frozenStateKey=key;
 render();
}
function frame(t){
 raf=0;
 if(!visible()||reduced.matches)return;
 const state=timerState();
 if(!state.running){sync();return;}
 motion+=Math.min(48,Math.max(0,t-last));last=t;
 render();
 raf=requestAnimationFrame(frame);
}
function sync(force=false){
 const state=timerState();
 if(!state.running){
  if(raf){cancelAnimationFrame(raf);raf=0;}
  let stateChanged=false;
  if(state.finished){
   stateChanged=previousState!=='finished';
   completed=true;previousState='finished';
  }else if(state.remaining>=timer.total||timer.total!==lastTotal){
   stateChanged=previousState!=='ready'||motion!==0;
   completed=false;motion=0;last=0;previousState='ready';
  }else{
   stateChanged=previousState!=='paused';
   completed=false;previousState='paused';
  }
  lastTotal=timer.total;
  if(visible())drawFrozen(state,force||stateChanged);
  return;
 }
 completed=false;lastTotal=timer.total;previousState='running';
 frozenStateKey=null;
 if(!visible()){if(raf){cancelAnimationFrame(raf);raf=0;}return;}
 if(!raf&&!reduced.matches){last=performance.now();raf=requestAnimationFrame(frame);}
 if(reduced.matches)render();
}
const previous=tickTimer;tickTimer=function(){previous();sync();};
window.myAlarmOilRendererStatus={mode:'webgl-ready',reason:'',version:'05.7.9'};
// Invalidate the previous SVG and mount the new WebGL canvas immediately.
mountOilScene();
document.addEventListener('visibilitychange',()=>sync(true));reduced.addEventListener?.('change',()=>sync(true));window.addEventListener('resize',()=>sync(true),{passive:true});document.getElementById('timer-screen').addEventListener('click',()=>requestAnimationFrame(()=>sync(true)));
test.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;if(raf)cancelAnimationFrame(raf);raf=0;});
test.addEventListener('webglcontextrestored',()=>{contextLost=false;sync(true);});
tickTimer();
})();

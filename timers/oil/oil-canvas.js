/* Oil-only Canvas renderer. My Alarm's timer is the sole clock. */
(()=>{'use strict';
const art=document.getElementById('timer-art');
if(!art||typeof visualTimerScenes==='undefined'||typeof timer==='undefined')return;
visualTimerScenes[3]='<canvas class="oil-canvas vt-svg" role="img" aria-label="Transparent acrylic oil timer with moving glossy droplets"></canvas>';
window.myAlarmOilRendererStatus={mode:'canvas-fallback',reason:window.myAlarmOilRendererStatus?.reason||'WebGL unavailable',version:'05.7.2'};
// Replace any already-mounted oil SVG after the fallback renderer is loaded.
if(timer.kind===3){art.replaceChildren();tickTimer();}

const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const state={canvas:null,ctx:null,raf:0,phase:0,last:0,drops:[]};
const rnd=(n,s=0)=>{const v=Math.sin(n*92.731+s*19.21)*47358.54;return v-Math.floor(v)};
for(let i=0;i<46;i++)state.drops.push({seed:rnd(i,1),lane:rnd(i,2),size:3.8+rnd(i,3)*7.5,speed:.65+rnd(i,4)*.9,tone:i%4===0?1:0,phase:rnd(i,5)*6.283});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>v*v*(3-2*v);
function active(){return timer.kind===3&&!document.hidden&&!document.getElementById('timer-screen').hidden&&!document.getElementById('timer-detail').hidden;}
function remaining(){return timer.end?Math.max(0,timer.end-Date.now()):timer.left;}
function path(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function gradient(c,x1,y1,x2,y2,stops){const g=c.createLinearGradient(x1,y1,x2,y2);stops.forEach(([p,col])=>g.addColorStop(p,col));return g;}
function draw(){const canvas=art.querySelector('canvas.oil-canvas');if(!canvas)return;state.canvas=canvas;const c=state.ctx||canvas.getContext('2d',{alpha:true});state.ctx=c;
const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,w,h);c.setTransform(w/320,0,0,h/380,0,0);
const p=timer.total?clamp(1-remaining()/timer.total,0,1):0,phase=state.phase;
// Contact shadow.
c.save();c.filter='blur(8px)';c.fillStyle='rgba(20,55,79,.18)';c.beginPath();c.ellipse(160,359,74,9,0,0,Math.PI*2);c.fill();c.restore();
// Thick acrylic shell, back face and edge refraction.
path(c,98,12,124,342,46);c.fillStyle=gradient(c,98,0,222,0,[[0,'rgba(149,181,204,.78)'],[.07,'rgba(238,251,255,.96)'],[.22,'rgba(255,255,255,.62)'],[.52,'rgba(245,251,255,.86)'],[.83,'rgba(225,243,255,.66)'],[1,'rgba(112,156,190,.77)']]);c.fill();c.strokeStyle='rgba(171,205,226,.8)';c.lineWidth=2;c.stroke();
// Inner chamber clipping and luminous clear oil.
c.save();path(c,109,25,102,316,38);c.clip();c.fillStyle=gradient(c,109,0,211,0,[[0,'#d4e7f1'],[.15,'#f3fbff'],[.48,'#fff'],[.82,'#f4faff'],[1,'#c5e0ed']]);c.fillRect(108,24,104,320);
// Upper dyed reservoir depletes, lower pool grows with countdown.
const topH=clamp(32*(1-p),0,32),bottomH=clamp(13+70*p,13,83);
const blue=gradient(c,0,270,0,341,[[0,'rgba(120,233,250,.72)'],[.4,'rgba(43,180,218,.78)'],[1,'rgba(21,105,177,.9)']]);
c.fillStyle=blue;c.fillRect(109,341-bottomH,102,bottomH);c.fillRect(109,25,102,topH);
c.beginPath();const surfaceY=341-bottomH;c.moveTo(109,surfaceY);c.bezierCurveTo(132,surfaceY-2+Math.sin(phase*.0014)*1.5,178,surfaceY+2,211,surfaceY);c.strokeStyle='rgba(201,252,255,.85)';c.lineWidth=3;c.stroke();
// Physical droplet motion driven by countdown progress; phase only adds subtle viscosity wobble.
// Each droplet is released once, traverses a nozzle, then settles at the bottom.
state.drops.forEach((d,i)=>{
const release=(i+.5)/state.drops.length*.88;const travel=clamp((p-release)/(.18+.16/d.speed),0,1);let x,y,sy=1,sx=1;
if(p<=release){x=119+d.lane*82;y=29+(i%3)*3;sy=.65;sx=1.2;}
else if(travel>=1){x=119+d.lane*82;y=338-bottomH+8+(i%6)*4;sy=.65;sx=1.12;}
else{const q=smooth(travel);x=160+Math.sin(i*2.399+q*9)*26+Math.sin(phase*.0006*d.speed+d.phase)*3.2;y=40+q*285;const stretch=Math.sin(Math.PI*travel);sy=1+.42*stretch;sx=1/Math.sqrt(sy);}
const r=d.size; x=clamp(x,112+r,208-r);y=clamp(y,27+r,339-r);
c.save();c.translate(x,y);c.scale(sx,sy);const g=c.createRadialGradient(-r*.38,-r*.45,r*.05,0,0,r*1.25);
if(d.tone){g.addColorStop(0,'#fff');g.addColorStop(.17,'#e9dcff');g.addColorStop(.46,'#b59cf1');g.addColorStop(.8,'#7750b6');g.addColorStop(1,'#483179');}
else{g.addColorStop(0,'#fff6fc');g.addColorStop(.16,'#ffd6ed');g.addColorStop(.48,'#f47fbc');g.addColorStop(.83,'#c6429a');g.addColorStop(1,'#79276f');}
c.fillStyle=g;c.beginPath();c.ellipse(0,0,r,r*1.13,Math.sin(phase*.0005+i)*.12,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,255,255,.68)';c.beginPath();c.ellipse(-r*.33,-r*.42,r*.22,r*.34,-.4,0,Math.PI*2);c.fill();c.restore();
});
// Fine suspended air bubbles and depth highlights.
for(let i=0;i<20;i++){const x=116+rnd(i,8)*87,y=34+rnd(i,9)*297; c.beginPath();c.arc(x,y,.5+rnd(i,10)*1.3,0,Math.PI*2);c.strokeStyle='rgba(113,173,202,.36)';c.lineWidth=.7;c.stroke();}
c.fillStyle=gradient(c,112,0,134,0,[[0,'rgba(255,255,255,0)'],[.42,'rgba(255,255,255,.58)'],[.75,'rgba(255,255,255,.13)'],[1,'rgba(255,255,255,0)']]);c.fillRect(112,26,22,312);
c.fillStyle='rgba(255,255,255,.5)';c.fillRect(202,43,2.6,275);c.restore();
// Front acrylic lens, bevels, and polished top/bottom edges.
path(c,98,12,124,342,46);c.strokeStyle='rgba(255,255,255,.82)';c.lineWidth=4;c.stroke();
path(c,105,18,110,330,42);c.strokeStyle='rgba(99,157,192,.24)';c.lineWidth=2;c.stroke();
c.beginPath();c.moveTo(121,42);c.bezierCurveTo(117,80,117,114,119,164);c.strokeStyle='rgba(255,255,255,.9)';c.lineWidth=5;c.lineCap='round';c.stroke();
c.beginPath();c.ellipse(160,23,44,7,0,Math.PI,Math.PI*2);c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=3;c.stroke();
}
function frame(t){state.raf=0;if(!active()||!timer.end||remaining()<=0||reduced.matches)return;state.phase+=Math.min(50,Math.max(0,t-state.last));state.last=t;draw();state.raf=requestAnimationFrame(frame);}
function sync(){if(timer.kind!==3){if(state.raf){cancelAnimationFrame(state.raf);state.raf=0;}state.ctx=null;state.canvas=null;return;}draw();if(active()&&timer.end&&remaining()>0&&!reduced.matches&&!state.raf){state.last=performance.now();state.raf=requestAnimationFrame(frame);}else if((!active()||!timer.end||reduced.matches)&&state.raf){cancelAnimationFrame(state.raf);state.raf=0;}}
const previous=tickTimer;tickTimer=function(){previous();sync();};
document.addEventListener('visibilitychange',sync);reduced.addEventListener?.('change',sync);
const screen=document.getElementById('timer-screen');screen.addEventListener('click',()=>requestAnimationFrame(sync));
window.addEventListener('resize',sync,{passive:true});
tickTimer();
})();

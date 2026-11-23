/* My Alarm fluid visualization v05.5: isolated rendering; original timer remains source of truth. */
(()=>{'use strict';
const NS='http://www.w3.org/2000/svg', art=document.getElementById('timer-art');
if(!art||typeof visualTimerScenes==='undefined'||typeof timer==='undefined')return;
const capsule=`<svg class="vt-svg fluid-svg oil-vessel" viewBox="0 0 320 380" role="img" aria-label="Glass oil timer"><defs>
<linearGradient id="fl-glass" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".92"/><stop offset=".15" stop-color="#e8faff" stop-opacity=".24"/><stop offset=".48" stop-color="#fff" stop-opacity=".04"/><stop offset=".8" stop-color="#c9eaf6" stop-opacity=".21"/><stop offset="1" stop-color="#7ea3c0" stop-opacity=".65"/></linearGradient>
<linearGradient id="fl-water" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#c4faff"/><stop offset=".3" stop-color="#57d4ed"/><stop offset=".8" stop-color="#148ac7"/><stop offset="1" stop-color="#2159a9"/></linearGradient>
<radialGradient id="fl-pink" cx=".27" cy=".22" r=".78"><stop stop-color="#fff"/><stop offset=".13" stop-color="#ffe0f1"/><stop offset=".4" stop-color="#ff7cbe"/><stop offset=".8" stop-color="#ca328c"/><stop offset="1" stop-color="#7e236b"/></radialGradient>
<radialGradient id="fl-purple" cx=".25" cy=".2" r=".82"><stop stop-color="#fff"/><stop offset=".2" stop-color="#d9c8ff"/><stop offset=".52" stop-color="#9b7ce8"/><stop offset="1" stop-color="#513c9d"/></radialGradient>
<clipPath id="fl-clip"><rect x="114" y="28" width="92" height="318" rx="45"/></clipPath>
<filter id="fl-blur"><feGaussianBlur stdDeviation="8"/></filter></defs>
<ellipse cx="160" cy="361" rx="78" ry="10" fill="#344f7a" opacity=".18" filter="url(#fl-blur)"/>
<rect x="105" y="14" width="110" height="345" rx="54" fill="url(#fl-glass)" stroke="#b1d9e6" stroke-width="3"/>
<g clip-path="url(#fl-clip)"><rect x="114" y="28" width="92" height="318" fill="#effbff" opacity=".17"/>
<rect class="fluid-water" x="114" y="210" width="92" height="136" fill="url(#fl-water)" opacity=".85"/>
<path class="fluid-waterline" d="M112 210Q136 202 160 210T208 210" fill="none" stroke="#d5ffff" stroke-width="4" opacity=".8"/>
<g class="fluid-particles"></g>
<path d="M123 37Q117 104 123 186T125 319" fill="none" stroke="#fff" stroke-width="8" opacity=".56" stroke-linecap="round"/><path d="M198 45V320" stroke="#fff" stroke-width="3" opacity=".52" stroke-linecap="round"/></g>
<rect x="105" y="14" width="110" height="345" rx="54" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>
<path d="M123 39Q132 22 157 22" stroke="#fff" stroke-width="5" opacity=".8" fill="none" stroke-linecap="round"/>
<ellipse cx="160" cy="347" rx="42" ry="4" fill="#fff" opacity=".3"/></svg>`;
const cascade=`<svg class="vt-svg fluid-svg cascade-vessel" viewBox="0 0 320 380" role="img" aria-label="S-shaped glass liquid timer"><defs>
<linearGradient id="fc-shell" x1="0" x2="1"><stop stop-color="#fff" stop-opacity=".9"/><stop offset=".16" stop-color="#b4f9f7" stop-opacity=".32"/><stop offset=".55" stop-color="#fff" stop-opacity=".08"/><stop offset=".85" stop-color="#83d9ed" stop-opacity=".22"/><stop offset="1" stop-color="#4e9fc6" stop-opacity=".55"/></linearGradient>
<linearGradient id="fc-cap" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7cf9ef"/><stop offset=".35" stop-color="#14dfdd"/><stop offset="1" stop-color="#078cae"/></linearGradient>
<linearGradient id="fc-pool" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#54ecf0"/><stop offset="1" stop-color="#148ac5"/></linearGradient>
<radialGradient id="fc-blue" cx=".27" cy=".2"><stop stop-color="#fff"/><stop offset=".2" stop-color="#8efaff"/><stop offset=".65" stop-color="#09b8e4"/><stop offset="1" stop-color="#0867b2"/></radialGradient>
<radialGradient id="fc-green" cx=".27" cy=".2"><stop stop-color="#fff"/><stop offset=".2" stop-color="#baffb1"/><stop offset=".65" stop-color="#3bd46b"/><stop offset="1" stop-color="#118e52"/></radialGradient>
<clipPath id="fc-inside"><path d="M88 34H233Q241 75 225 103Q211 125 169 141Q96 167 90 205Q85 232 111 249Q137 265 196 282Q228 294 228 336H91Q85 311 70 282Q44 241 57 207Q70 172 125 143Q182 112 186 92Q188 70 177 52H88Z"/></clipPath>
<filter id="fc-blur"><feGaussianBlur stdDeviation="7"/></filter></defs>
<ellipse cx="160" cy="365" rx="102" ry="9" fill="#264e6e" opacity=".16" filter="url(#fc-blur)"/>
<path d="M88 34H233Q241 75 225 103Q211 125 169 141Q96 167 90 205Q85 232 111 249Q137 265 196 282Q228 294 228 336H91Q85 311 70 282Q44 241 57 207Q70 172 125 143Q182 112 186 92Q188 70 177 52H88Z" fill="url(#fc-shell)" stroke="#94d7e3" stroke-width="4"/>
<g clip-path="url(#fc-inside)"><rect x="56" y="30" width="190" height="310" fill="#e8ffff" opacity=".12"/>
<rect class="fluid-top-pool" x="76" y="51" width="168" height="25" rx="6" fill="url(#fc-pool)" opacity=".75"/>
<rect class="fluid-bottom-pool" x="64" y="324" width="170" height="15" rx="4" fill="url(#fc-pool)" opacity=".8"/>
<g class="fluid-tracks" stroke-linecap="round" fill="none"><path d="M88 101L210 118"/><path d="M205 154L93 176"/><path d="M88 213L199 234"/><path d="M200 268L103 291"/></g>
<g class="fluid-particles"></g><path d="M95 46Q112 80 91 114Q66 157 70 193Q57 238 92 269" fill="none" stroke="#fff" stroke-width="8" opacity=".47" stroke-linecap="round"/>
<path d="M223 48Q238 91 210 115M211 284Q227 303 222 325" fill="none" stroke="#fff" stroke-width="4" opacity=".55" stroke-linecap="round"/></g>
<rect x="75" y="22" width="166" height="24" rx="12" fill="url(#fc-cap)" stroke="#91f7f5" stroke-width="2"/>
<path d="M88 27H227" stroke="#e3ffff" stroke-width="3" opacity=".85" stroke-linecap="round"/>
<rect x="76" y="333" width="164" height="22" rx="11" fill="url(#fc-cap)" stroke="#7ee9ed" stroke-width="2"/>
<path d="M92 338H225" stroke="#dcffff" stroke-width="3" opacity=".8" stroke-linecap="round"/>
</svg>`;
visualTimerScenes[2]=cascade;visualTimerScenes[3]=capsule;
const state={kind:-1,svg:null,drops:[],progress:-1,run:false,last:0,raf:0,phase:0};
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const rand=(n,s)=>{const x=Math.sin(n*83.17+s*127.31)*43758.5453;return x-Math.floor(x)};
function node(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;}
function prepare(){const svg=art.querySelector('.fluid-svg');if(!svg)return;const kind=timer.kind;if(svg===state.svg&&kind===state.kind)return;state.svg=svg;state.kind=kind;state.drops=[];const group=svg.querySelector('.fluid-particles');if(!group)return;
const count=kind===3?11:20;for(let i=0;i<count;i++){const r=kind===3?6+rand(i,2)*12:3.5+rand(i,3)*3.7;const g=node('g',{'class':'fluid-drop'},group);node('ellipse',{cx:0,cy:0,rx:r,ry:r*1.17,fill:kind===3?(i%3===0?'url(#fl-purple)':'url(#fl-pink)'):(i%3===0?'url(#fc-green)':'url(#fc-blue)')},g);node('ellipse',{cx:-r*.3,cy:-r*.38,rx:r*.29,ry:r*.37,fill:'#fff',opacity:'.56'},g);state.drops.push({g,r,seed:rand(i,1),speed:.68+rand(i,4)*.68,index:i});}}
function oilPosition(d,progress,t){const i=d.index,cycle=(progress*(1.1+d.speed*.9)+d.seed*.9)%1;const lane=Math.sin((cycle*2*Math.PI)+i*1.7)*12+Math.sin((t*.00029*d.speed)+i*2.2)*5;const r=d.r;const y=40+r+(cycle*(292-2*r));const x=Math.max(116+r,Math.min(204-r,160+lane));const slow=.55+.45*Math.sin(cycle*Math.PI);const wobble=Math.sin(t*.0011*d.speed+i)*.11;return {x,y,sx:1+wobble,sy:1-wobble*.8,rotation:Math.sin(t*.00047+i)*13,opacity:.9+.1*slow};}
const paths=[[[126,82],[204,116],[210,135],[95,173],[88,195],[199,231],[201,248],[102,286],[108,312],[162,330]]];
const route=paths[0];const lengths=[];let total=0;for(let i=1;i<route.length;i++){const dx=route[i][0]-route[i-1][0],dy=route[i][1]-route[i-1][1];total+=Math.hypot(dx,dy);lengths.push(total);}
function cascadePosition(d,p,t){
 // Each droplet is released in a different part of the countdown.
 const release=d.index/24;
 const travel=Math.max(0,Math.min(1,(p-release)*2.8*d.speed));
 if(p<=release)return {x:112+(d.index%8)*13,y:66+(d.index%3)*3,sx:1,sy:1,rotation:0,opacity:.88};
 if(travel>=1)return {x:110+(d.index%9)*11,y:323-(d.index%3)*3,sx:1.12,sy:.72,rotation:0,opacity:.86};
 const dist=travel*total;let idx=lengths.findIndex(l=>dist<=l);if(idx<0)idx=lengths.length-1;
 const start=idx?lengths[idx-1]:0,frac=(dist-start)/(lengths[idx]-start),a=route[idx],b=route[idx+1];
 const falling=idx===1||idx===3||idx===5||idx===7;
 const variation=Math.sin(t*.0006*d.speed+d.index*1.8)*1.3;
 return {x:a[0]+(b[0]-a[0])*frac+variation,y:a[1]+(b[1]-a[1])*frac+(falling?0:2),sx:falling?.77:1.08,sy:falling?1.45:.88,rotation:falling?0:Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI*.18,opacity:.92};}

function update(t){const kind=timer.kind;if(kind!==2)return;prepare();const left=timer.end?Math.max(0,timer.end-Date.now()):timer.left;const progress=timer.total?Math.max(0,Math.min(1,1-left/timer.total)):0;const running=!!timer.end&&left>0;const visible=!document.hidden&&!document.getElementById('timer-screen').hidden&&!document.getElementById('timer-detail').hidden;
if(running&&visible&&!reduced.matches){state.phase+=Math.min(48,Math.max(0,t-state.last||0));}state.last=t;
const wave=Math.sin(state.phase*.0012)*1.8;
if(kind===3){const fill=state.svg.querySelector('.fluid-water'),line=state.svg.querySelector('.fluid-waterline');const y=185+progress*125;if(fill){fill.setAttribute('y',y+wave);fill.setAttribute('height',Math.max(0,346-y-wave));}if(line)line.setAttribute('transform',`translate(0 ${y-210+wave})`);}
else{const upper=state.svg.querySelector('.fluid-top-pool'),lower=state.svg.querySelector('.fluid-bottom-pool');if(upper)upper.setAttribute('height',Math.max(2,25*(1-progress)));if(lower){const h=8+progress*28;lower.setAttribute('y',340-h);lower.setAttribute('height',h);}}
state.drops.forEach(d=>{const pos=kind===3?oilPosition(d,progress,state.phase):cascadePosition(d,progress,state.phase);d.g.setAttribute('transform',`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)}) rotate(${pos.rotation.toFixed(2)}) scale(${pos.sx.toFixed(3)} ${pos.sy.toFixed(3)})`);d.g.setAttribute('opacity',progress>=1?'.1':String(pos.opacity));});}
const prior=tickTimer;tickTimer=function(){prior();if(timer.kind===2)update(performance.now());};
function frame(t){state.raf=0;if(document.hidden||document.getElementById('timer-screen').hidden||document.getElementById('timer-detail').hidden||timer.kind!==2||!timer.end||reduced.matches){state.last=t;return;}update(t);state.raf=requestAnimationFrame(frame);}
function ensure(){if(state.raf)return;if(!document.hidden&&!document.getElementById('timer-screen').hidden&&!document.getElementById('timer-detail').hidden&&timer.kind===2&&timer.end&&!reduced.matches){state.last=performance.now();state.raf=requestAnimationFrame(frame);}}
const old=tickTimer;tickTimer=function(){old();ensure();};
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.raf){cancelAnimationFrame(state.raf);state.raf=0;}else{tickTimer();ensure();}});
reduced.addEventListener?.('change',()=>{if(reduced.matches&&state.raf){cancelAnimationFrame(state.raf);state.raf=0;}tickTimer();});
document.getElementById('timer-screen').addEventListener('click',()=>requestAnimationFrame(ensure));
tickTimer();
})();

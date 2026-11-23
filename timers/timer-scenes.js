/* Update 05.3 — high fidelity vector timer scenes, driven by the real countdown. */
const visualTimerScenes = [
`<svg viewBox="0 0 300 300" class="vt-svg" role="img" aria-label="Progress dial"><defs><linearGradient id="vt-ring" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#8bd7c9"/><stop offset="1" stop-color="#087f83"/></linearGradient><filter id="vt-soft"><feGaussianBlur stdDeviation="6"/></filter></defs><circle cx="150" cy="150" r="115" fill="#2d9d9820" filter="url(#vt-soft)"/><circle cx="150" cy="150" r="108" fill="#f9fffd" stroke="#b6d8d4" stroke-width="2"/><circle cx="150" cy="150" r="91" fill="none" stroke="#d9e9e6" stroke-width="14"/><circle class="vt-ring-progress" cx="150" cy="150" r="91" fill="none" stroke="url(#vt-ring)" stroke-width="14" stroke-linecap="round" transform="rotate(-90 150 150)" stroke-dasharray="571.77"/><circle cx="150" cy="150" r="66" fill="#f5faf8" stroke="#e5efed"/><circle cx="150" cy="150" r="7" fill="#0b9891"/><g stroke="#86a6a2" stroke-width="2"><path d="M150 64v10M236 150h-10M150 236v-10M64 150h10"/></g></svg>`,
`<svg viewBox="0 0 300 340" class="vt-svg" role="img" aria-label="Flowing hourglass"><defs><linearGradient id="vt-glass" x1="0" x2="1"><stop stop-color="#ffffffa6"/><stop offset=".22" stop-color="#d3eef05c"/><stop offset=".62" stop-color="#ffffff1a"/><stop offset="1" stop-color="#9cc8d17d"/></linearGradient><linearGradient id="vt-sand" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#ffe7b0"/><stop offset=".6" stop-color="#dbac69"/><stop offset="1" stop-color="#bb874b"/></linearGradient><clipPath id="vt-hour-top"><path d="M86 50H214C212 101 175 139 150 167C125 139 88 101 86 50Z"/></clipPath><clipPath id="vt-hour-bottom"><path d="M150 173C175 201 212 240 214 289H86C88 240 125 201 150 173Z"/></clipPath></defs><ellipse cx="150" cy="314" rx="95" ry="12" fill="#486d7624"/><path d="M80 43H220C219 103 180 142 155 170C180 198 219 236 220 296H80C81 236 120 198 145 170C120 142 81 103 80 43Z" fill="url(#vt-glass)" stroke="#8dbbc1" stroke-width="3"/><g clip-path="url(#vt-hour-top)"><rect class="vt-sand-upper" x="84" y="51" width="132" height="115" fill="url(#vt-sand)"/><path d="M84 53H216" stroke="#fff4cf" stroke-width="3"/></g><g clip-path="url(#vt-hour-bottom)"><rect class="vt-sand-lower" x="84" y="289" width="132" height="0" fill="url(#vt-sand)"/><ellipse class="vt-sand-mound" cx="150" cy="289" rx="58" ry="8" fill="#edc58c"/></g><path class="vt-sand-stream" d="M150 169V282" stroke="#d6a062" stroke-width="3" stroke-linecap="round" stroke-dasharray="4 5"/><path d="M95 56C97 111 127 146 148 165M148 177C126 202 98 247 96 287" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="6" stroke-linecap="round"/><path d="M206 57C203 104 182 139 158 164M158 177C182 209 202 251 205 286" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="3"/><rect x="67" y="32" width="166" height="17" rx="8" fill="#d4b58b" stroke="#aa8b65"/><rect x="67" y="290" width="166" height="17" rx="8" fill="#d4b58b" stroke="#aa8b65"/><path d="M83 37H216M83 295H216" stroke="#fff3d6" stroke-width="3" stroke-linecap="round"/></svg>`,
`<svg viewBox="0 0 300 340" class="vt-svg" role="img" aria-label="Falling water level"><defs><linearGradient id="vt-water" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#b5f3f4"/><stop offset=".5" stop-color="#54bbd2"/><stop offset="1" stop-color="#257fbb"/></linearGradient><linearGradient id="vt-vessel" x1="0" x2="1"><stop stop-color="#ffffffbd"/><stop offset=".3" stop-color="#d5f8ff45"/><stop offset=".75" stop-color="#ffffff16"/><stop offset="1" stop-color="#a7d6e69c"/></linearGradient><clipPath id="vt-vessel-clip"><rect x="87" y="29" width="126" height="278" rx="48"/></clipPath></defs><ellipse cx="150" cy="320" rx="84" ry="11" fill="#486d7624"/><rect x="87" y="29" width="126" height="278" rx="48" fill="url(#vt-vessel)" stroke="#a0d3e0" stroke-width="4"/><g clip-path="url(#vt-vessel-clip)"><rect class="vt-water-fill" x="87" y="160" width="126" height="147" fill="url(#vt-water)"/><path class="vt-water-wave" d="M76 159 Q100 149 126 159 T176 159 T226 159 V180 H76Z" fill="#b0eff4" opacity=".9"/><g fill="#ffffff70"><circle cx="114" cy="249" r="5"/><circle cx="182" cy="278" r="3"/><circle cx="166" cy="220" r="4"/></g></g><path d="M109 62Q102 76 102 111V242" stroke="#fff" stroke-width="10" opacity=".65" fill="none" stroke-linecap="round"/><path d="M196 76V246" stroke="#fff" stroke-width="4" opacity=".3" stroke-linecap="round"/></svg>`,
`<svg viewBox="0 0 320 380" class="vt-svg vt-oil-scene" role="img" aria-label="Glass oil motion timer with drifting liquid droplets">
<defs>
 <linearGradient id="oil-shell" x1="0" x2="1"><stop stop-color="#f8fdff" stop-opacity=".92"/><stop offset=".15" stop-color="#fff" stop-opacity=".23"/><stop offset=".48" stop-color="#fff" stop-opacity=".05"/><stop offset=".82" stop-color="#eff6ff" stop-opacity=".16"/><stop offset="1" stop-color="#8eaec9" stop-opacity=".65"/></linearGradient>
 <linearGradient id="oil-blue" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#75d8ef"/><stop offset=".52" stop-color="#238ecb"/><stop offset="1" stop-color="#144baf"/></linearGradient>
 <linearGradient id="oil-clear" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fcf5fc" stop-opacity=".82"/><stop offset="1" stop-color="#a2d2e8" stop-opacity=".33"/></linearGradient>
 <radialGradient id="oil-pink" cx=".27" cy=".19" r=".9"><stop stop-color="#fff9fc"/><stop offset=".14" stop-color="#ffb9de"/><stop offset=".48" stop-color="#ed399f"/><stop offset=".84" stop-color="#aa2188"/><stop offset="1" stop-color="#711d77"/></radialGradient>
 <radialGradient id="oil-violet" cx=".23" cy=".17" r=".9"><stop stop-color="#f8fbff"/><stop offset=".18" stop-color="#b4b3ff"/><stop offset=".57" stop-color="#7451d5"/><stop offset="1" stop-color="#3d348f"/></radialGradient>
 <linearGradient id="oil-rim" x1="0" x2="1"><stop stop-color="#fff"/><stop offset=".32" stop-color="#b9d6e9"/><stop offset=".65" stop-color="#faffff"/><stop offset="1" stop-color="#91a7cc"/></linearGradient>
 <filter id="oil-shadow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="8"/></filter>
 <filter id="oil-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
 <clipPath id="oil-inside"><path d="M113 48Q113 22 160 22Q207 22 207 48V324Q207 350 160 350Q113 350 113 324Z"/></clipPath>
</defs>
<ellipse cx="160" cy="363" rx="84" ry="11" fill="#294b70" opacity=".22" filter="url(#oil-shadow)"/>
<rect x="105" y="13" width="110" height="345" rx="55" fill="url(#oil-shell)" stroke="url(#oil-rim)" stroke-width="5"/>
<g clip-path="url(#oil-inside)">
 <rect x="110" y="18" width="100" height="335" fill="url(#oil-clear)"/>
 <rect class="vt-oil-fill" x="110" y="112" width="100" height="238" fill="url(#oil-blue)" opacity=".92"/>
 <path class="oil-meniscus" d="M108 112 Q135 102 160 112 T212 112" fill="none" stroke="#b9f7ff" stroke-width="5" opacity=".7"/>
 <g class="oil-droplets">
  <g class="oil-drop oil-d1"><path d="M-18 -26C-32 -9 -23 20 -7 27C15 39 30 15 24 -7C21 -25 -5 -39 -18 -26Z" fill="url(#oil-pink)"/><ellipse cx="-10" cy="-17" rx="7" ry="11" fill="#fff" opacity=".46" filter="url(#oil-soft)"/></g>
  <g class="oil-drop oil-d2"><path d="M-13 -19C-28 -8 -19 19 -2 24C18 29 24 4 17 -12C12 -26 -4 -30 -13 -19Z" fill="url(#oil-violet)"/><ellipse cx="-7" cy="-11" rx="5" ry="8" fill="#fff" opacity=".42"/></g>
  <g class="oil-drop oil-d3"><path d="M-22 -29C-38 -13 -32 22 -10 34C14 44 34 17 26 -10C22 -29 -8 -44 -22 -29Z" fill="url(#oil-pink)"/><ellipse cx="-12" cy="-20" rx="8" ry="12" fill="#fff" opacity=".4"/></g>
  <g class="oil-drop oil-d4"><path d="M-10 -17C-21 -8 -19 10 -6 19C11 27 23 10 17 -7C12 -21 -1 -25 -10 -17Z" fill="url(#oil-violet)"/></g>
  <g class="oil-drop oil-d5"><path d="M-11 -15C-23 -6 -15 16 1 19C17 20 20 1 13 -12C8 -22 -4 -23 -11 -15Z" fill="url(#oil-pink)"/></g>
 </g>
 <path d="M126 30Q118 96 123 175T125 323" fill="none" stroke="#fff" stroke-width="9" opacity=".42" stroke-linecap="round"/>
 <path d="M199 50V315" fill="none" stroke="#f7ffff" stroke-width="4" opacity=".45" stroke-linecap="round"/>
</g>
<rect x="105" y="13" width="110" height="345" rx="55" fill="none" stroke="#f5faff" stroke-opacity=".7" stroke-width="2"/>
<path d="M124 39Q135 20 159 20" stroke="#fff" stroke-width="5" fill="none" opacity=".7" stroke-linecap="round"/>
<ellipse cx="160" cy="354" rx="46" ry="4" fill="#f6fbff" opacity=".7"/>
</svg>`
];
const timerVisualBase=tickTimer;
let visualSceneKind=-1;
tickTimer=function(){
 timerVisualBase();
 const art=$('timer-art');
 if(visualSceneKind!==timer.kind||!art.querySelector('.vt-svg, .oil-canvas')){
  visualSceneKind=timer.kind;art.innerHTML=visualTimerScenes[timer.kind];
 }
 art.className='timer-art vt-stage vt-kind-'+timer.kind+(timer.end?' vt-running':' vt-still');
 const remaining=timer.total?Math.max(0,Math.min(1,(timer.end?Math.max(0,timer.end-Date.now()):timer.left)/timer.total)):0;
 const upper=art.querySelector('.vt-sand-upper'),lower=art.querySelector('.vt-sand-lower');
 if(upper){const h=115*remaining;upper.setAttribute('y',String(166-h));upper.setAttribute('height',String(h));}
 if(lower){const h=112*(1-remaining);lower.setAttribute('y',String(289-h));lower.setAttribute('height',String(h));art.querySelector('.vt-sand-mound')?.setAttribute('cy',String(289-h));}
 const stream=art.querySelector('.vt-sand-stream');if(stream)stream.style.opacity=timer.end&&remaining>0?'1':'0';
 const ring=art.querySelector('.vt-ring-progress');if(ring)ring.style.strokeDashoffset=String(571.77*(1-remaining));
 const water=art.querySelector('.vt-water-fill'),wave=art.querySelector('.vt-water-wave');
 if(water){const h=260*remaining;water.setAttribute('y',String(307-h));water.setAttribute('height',String(h));if(wave)wave.setAttribute('transform',`translate(0 ${307-h-159})`);}
 const oil=art.querySelector('.vt-oil-fill');if(oil){const y=75+175*(1-remaining);oil.setAttribute('y',String(y));oil.setAttribute('height',String(350-y));const meniscus=art.querySelector('.oil-meniscus');if(meniscus)meniscus.setAttribute('transform',`translate(0 ${y-112})`);}
};

 tickTimer();

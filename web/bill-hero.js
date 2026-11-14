const hero = document.querySelector('.bill-hero');
const stage = hero?.querySelector('.bill-stage');
const universe = hero?.querySelector('.bill-universe');
const cards = [...(hero?.querySelectorAll('.bill-float') || [])];
const folder = hero?.querySelector('.gather-folder');
const icon = hero?.querySelector('.cta-cross');
const lens = hero?.querySelector('.folder-lens');
const pause = hero?.querySelector('.motion-toggle');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const positions = [
  [-470,-130,-210,42,-9],[-260,50,20,24,5],[0,-20,140,-8,3],
  [300,-25,30,-28,-4],[510,130,-160,-155,8],[-90,-180,-260,155,-8],
  [230,210,-230,165,12],[-420,230,-290,200,9],[500,-230,-300,145,-8]
];
const clamp = v => Math.max(0,Math.min(1,v));
const smooth = v => { const t=clamp(v); return t*t*(3-2*t); };
const mix = (a,b,t) => a+(b-a)*t;
let pointerX=0,pointerY=0,currentX=0,currentY=0,target=0,progress=0;
let frame=0,last=0,clock=0,paused=false,visible=true,arrival=null;
let geometry={spread:1,mobile:false,startX:0,startY:0,endX:0,endY:0};
function schedule(){if(!frame && visible && !document.hidden)frame=requestAnimationFrame(draw);}
function measure(){
  if(!hero || !stage)return;
  const h=hero.getBoundingClientRect(),s=stage.getBoundingClientRect();
  const u=universe.getBoundingClientRect(),b=icon.getBoundingClientRect();
  // Finish while the stage is still pinned, so the button receives the folder in view.
  target=clamp(-h.top/Math.max(1,(h.height-s.height)*.88));
  geometry={mobile:innerWidth<600,spread:innerWidth<600?.58:Math.min(1,innerWidth/1440),
    startX:u.left+u.width/2-(s.left+s.width/2),startY:u.top+u.height/2-(s.top+s.height/2),
    endX:b.left+b.width/2-(s.left+s.width/2),endY:b.top+b.height/2-(s.top+s.height/2)};
  schedule();
}
function draw(now){
  frame=0;
  if(!hero || !visible || document.hidden)return;
  const dt=Math.min(40,last?now-last:16);last=now;
  if(reduced.matches){
    cards.forEach(c=>{c.style.removeProperty('transform');c.style.removeProperty('opacity');});
    folder.style.opacity='0';lens.style.opacity='0';return;
  }
  const ease=1-Math.exp(-dt/145);
  progress+=(target-progress)*ease;
  currentX+=(pointerX-currentX)*ease;currentY+=(pointerY-currentY)*ease;
  if(!paused)clock+=dt/1000;
  const gather=smooth(progress/.52), swallow=smooth((progress-.40)/.22);
  const travel=smooth((progress-.59)/.35);
  cards.forEach((card,i)=>{
    const [x,y,z,ry,rz]=positions[i];
    const float=Math.sin(clock*(.62+i*.035)+i*1.37)*(10+i%3*3);
    const px=mix(x*geometry.spread+(currentX*(12+i*2)),(i-4)*3,gather);
    const py=mix(y*(geometry.mobile?.65:1)+float+currentY*(8+i),(i-4)*-3,gather);
    card.style.transform=`translate(-50%,-50%) translate3d(${px}px,${py+swallow*24}px,${mix(z,i*2,gather)}px) rotateY(${(ry+currentX*9)*(1-gather)}deg) rotateZ(${(rz+Math.sin(clock*.4+i)*1.4)*(1-gather)}deg) scale(${1-swallow*.8})`;
    card.style.opacity=String(1-swallow);
  });
  const reveal=smooth((progress-.42)/.15), dock=smooth((progress-.91)/.07);
  folder.style.opacity=String(reveal*(1-dock));
  folder.style.transform=`translate(-50%,-50%) translate(${mix(geometry.startX,geometry.endX,travel)}px,${mix(geometry.startY+32,geometry.endY,travel)}px) scale(${mix(1,25/180,travel)})`;
  // A single magnifier sweep after docking. Reversing the scroll resets the scene.
  if(progress>.97 && arrival===null)arrival=clock;
  if(progress<.90)arrival=null;
  const scan=arrival===null?0:clamp((clock-arrival)/2.4);
  const scanVisible=arrival!==null && scan<1;
  lens.style.opacity=scanVisible?String(Math.sin(Math.PI*scan)):'0';
  lens.style.transform=`translate(${mix(-14,8,smooth(scan))}px,${-4+Math.sin(scan*Math.PI)*7}px) rotate(-12deg)`;
  if((!paused && (progress<.99 || scanVisible)) || Math.abs(target-progress)>.0002 || Math.abs(pointerX-currentX)>.002 || Math.abs(pointerY-currentY)>.002)schedule();
}
stage?.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced.matches)return;const r=stage.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;schedule();});
stage?.addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule();});
pause?.addEventListener('click',()=>{paused=!paused;pause.setAttribute('aria-pressed',String(paused));pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-label',paused?'Resume decorative animation':'Pause decorative animation');schedule();});
addEventListener('scroll',measure,{passive:true});addEventListener('resize',measure);
reduced.addEventListener('change',()=>{last=0;measure();});
document.addEventListener('visibilitychange',()=>{last=0;schedule();});
if(hero)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;last=0;if(visible)measure();}).observe(hero);
measure();

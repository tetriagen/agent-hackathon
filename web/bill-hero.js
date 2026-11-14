const hero = document.querySelector('.bill-hero');
const stage = hero?.querySelector('.bill-stage');
const cards = [...(hero?.querySelectorAll('.bill-float') || [])];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const positions = [
  [-470,-130,-210,42,-9],[-260,50,20,24,5],[0,-20,140,-8,3],
  [300,-25,30,-28,-4],[510,130,-160,-155,8],[-90,-180,-260,155,-8],
  [230,210,-230,165,12],[-420,230,-290,200,9],[500,-230,-300,145,-8]
];
let pointerX=0, pointerY=0, currentX=0, currentY=0, frame=0;
function schedule(){if(!frame) frame=requestAnimationFrame(draw);}
function draw(){
  frame=0;
  if(!hero || !stage) return;
  if(reduced.matches){cards.forEach(c=>c.style.removeProperty('transform'));return;}
  const rect=hero.getBoundingClientRect();
  const progress=Math.max(0,Math.min(1,-rect.top/(innerHeight*.55)));
  const mobile=innerWidth<600;
  const spread=mobile?.58:Math.min(1,innerWidth/1440);
  currentX+=(pointerX-currentX)*.09;currentY+=(pointerY-currentY)*.09;
  cards.forEach((card,i)=>{
    const [x,y,z,ry,rz]=positions[i];
    const stackX=(i-4)*5, stackY=(i-4)*-4;
    const px=x*spread*(1-progress)+stackX*progress+currentX*(12+i*2)*(1-progress);
    const py=y*(mobile?.65:1)*(1-progress)+stackY*progress+currentY*(8+i)*(1-progress);
    const pz=z*(1-progress)+(i*3)*progress;
    const turn=ry*(1-progress)+currentX*9*(1-progress);
    card.style.transform=`translate(-50%,-50%) translate3d(${px}px,${py}px,${pz}px) rotateY(${turn}deg) rotateZ(${rz*(1-progress)}deg)`;
  });
  if(Math.abs(pointerX-currentX)>.002 || Math.abs(pointerY-currentY)>.002)schedule();
}
stage?.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||reduced.matches)return;const r=stage.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;schedule();});
stage?.addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule();});
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);reduced.addEventListener('change',schedule);schedule();

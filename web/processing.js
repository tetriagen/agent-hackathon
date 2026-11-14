const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const dialog = document.createElement('dialog');
dialog.id = 'processing-dialog';
dialog.setAttribute('aria-labelledby','processing-title');
dialog.innerHTML = `<div class="processing-top"><span>ClearBill / Document review</span></div>
<h2 id="processing-title" tabindex="-1">One moment.</h2>
<div class="processing-scene" aria-hidden="true"><div class="processing-paper"><div class="processing-front"><span class="processing-pdf">PDF</span><strong>YOUR<br>MEDICAL BILL.</strong><i></i><i></i><i></i><div class="processing-total">$ ———</div><small>Every detail matters.</small></div><div class="processing-back"><span>+</span>ClearBill.</div><div class="processing-edge"></div></div><div class="processing-lens"><svg viewBox="0 0 80 80"><circle cx="31" cy="31" r="22" fill="#f2b0a5" fill-opacity=".3" stroke="#f9ddd4" stroke-width="7"/><path d="m48 48 23 23" stroke="#f9ddd4" stroke-width="10" stroke-linecap="round"/></svg></div><canvas class="processing-particles" width="840" height="660"></canvas><div class="processing-check">✓</div></div>
<p id="processing-status" role="status" aria-live="polite"></p><p class="processing-detail"></p><button type="button" class="processing-pause" aria-pressed="false">Pause motion</button>`;
document.body.append(dialog);
const title=dialog.querySelector('h2'), status=dialog.querySelector('#processing-status'), detail=dialog.querySelector('.processing-detail');
const pause=dialog.querySelector('.processing-pause');
let started=0, visible=true, previousFocus=null, animation=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
dialog.addEventListener('close',()=>{visible=false;cancelAnimationFrame(animation);});
pause.addEventListener('click',()=>{const paused=dialog.classList.toggle('motion-paused');pause.textContent=paused?'Resume motion':'Pause motion';pause.setAttribute('aria-pressed',String(paused));});
export function beginProcessing(message, description){
  previousFocus=document.activeElement;started=performance.now();visible=true;
  dialog.classList.remove('complete','motion-paused');pause.textContent='Pause motion';pause.setAttribute('aria-pressed','false');
  title.textContent='One moment.';status.textContent=message;detail.textContent=description;
  dialog.showModal();
  title.focus({preventScroll:true});
}
function particles(){
  const canvas=dialog.querySelector('canvas'),ctx=canvas.getContext('2d');
  const width=canvas.clientWidth,height=canvas.clientHeight;
  canvas.width=Math.round(width*2);canvas.height=Math.round(height*2);
  const paper=dialog.querySelector('.processing-paper');
  const scale=parseFloat(getComputedStyle(paper).scale)||1;
  const pw=paper.offsetWidth*scale,ph=paper.offsetHeight*scale;
  const start=performance.now();
  const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
  function draw(now){
    const t=Math.min(1,(now-start)/1050),ease=1-Math.pow(1-t,3);
    ctx.setTransform(2,0,0,2,0,0);ctx.clearRect(0,0,width,height);
    for(let i=0;i<640;i++){
      // Begin on the paper, then scatter radially with a little individual drift.
      const px=(random(i+1)-.5)*pw,py=(random(i+700)-.5)*ph;
      const rotation=-8*Math.PI/180;
      const sx=px*Math.cos(rotation)-py*Math.sin(rotation);
      const sy=px*Math.sin(rotation)+py*Math.cos(rotation);
      const angle=Math.atan2(sy,sx)+(random(i+1400)-.5)*.8;
      const distance=65+random(i+2100)*155;
      const x=width/2+sx+Math.cos(angle)*distance*ease;
      const y=height/2+sy+Math.sin(angle)*distance*ease+22*t*t;
      const alpha=Math.pow(1-t,1.6);
      ctx.fillStyle=i%5===0?`rgba(255,245,230,${.9*alpha})`:`rgba(242,176,165,${.8*alpha})`;
      ctx.beginPath();ctx.arc(x,y,(.6+random(i+2800)*1.3)*(1-t*.45),0,Math.PI*2);ctx.fill();
    }
    if(t<1 && visible && !reduced.matches)animation=requestAnimationFrame(draw);
  }
  animation=requestAnimationFrame(draw);
}
export async function finishProcessing(message){
  if(!visible)return;
  // The work is done; describe the presentation phase honestly while the current turn finishes.
  status.textContent='Document ready. Finishing the preview…';
  const elapsed=performance.now()-started;
  if(!reduced.matches && !dialog.classList.contains('motion-paused')){
    const cycle=3200;
    await sleep(Math.max(0,Math.ceil(elapsed/cycle)*cycle-elapsed));
  }
  if(!visible)return;
  dialog.classList.add('complete');title.textContent='Ready for your review.';
  status.textContent=message;detail.textContent='Check the extracted details against your original document.';
  if(!reduced.matches && !dialog.classList.contains('motion-paused'))particles();
  await sleep(reduced.matches?150:1150);
  if(dialog.open)dialog.close();
  setTimeout(()=>{if(previousFocus?.isConnected && !previousFocus.disabled)previousFocus.focus({preventScroll:true});},0);
}
export function failProcessing(){cancelAnimationFrame(animation);if(dialog.open)dialog.close();}

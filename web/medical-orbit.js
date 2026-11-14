// Self-contained decorative scene. No libraries, requests, or continuous idle loop.
class MedicalOrbit extends HTMLElement {
  connectedCallback() {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.setAttribute('aria-hidden', 'true');
    this.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.angle = 0; this.target = 0; this.lean = 0;
    this.update = () => {
      this.target = this.reduced.matches ? 0 : window.scrollY / 380;
      if (this.reduced.matches) { this.angle = 0; this.lean = 0; }
      if (!this.frame) this.frame = requestAnimationFrame(() => this.draw());
    };
    this.move = e => {
      const r = this.getBoundingClientRect();
      this.lean = this.reduced.matches ? 0 : ((e.clientX-r.left)/r.width-.5)*8;
      this.update();
    };
    this.leave = () => { this.lean = 0; this.update(); };
    this.resize = new ResizeObserver(this.update);
    this.resize.observe(this);
    window.addEventListener('scroll', this.update, {passive:true});
    this.addEventListener('pointermove', this.move);
    this.addEventListener('pointerleave', this.leave);
    this.reduced.addEventListener('change', this.update);
    this.update();
  }
  disconnectedCallback() {
    cancelAnimationFrame(this.frame); this.frame = 0;
    this.resize?.disconnect();
    window.removeEventListener('scroll', this.update);
    this.removeEventListener('pointermove', this.move);
    this.removeEventListener('pointerleave', this.leave);
    this.reduced?.removeEventListener('change', this.update);
    this.canvas?.remove(); this.canvas = null;
  }
  draw() {
    this.frame = 0;
    const r = this.getBoundingClientRect();
    const w = r.width, h = r.height;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (this.canvas.width !== Math.round(w*dpr) || this.canvas.height !== Math.round(h*dpr)) {
      this.canvas.width = Math.round(w*dpr); this.canvas.height = Math.round(h*dpr);
    }
    this.angle += (this.target-this.angle)*.18;
    const c = this.ctx;
    c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,w,h);
    const scale = Math.min(w/720,h/440);
    c.translate(w/2,h/2+8*scale); c.scale(scale,scale);
    const glow = c.createRadialGradient(0,20,20,0,20,320);
    glow.addColorStop(0,'#1d2839'); glow.addColorStop(1,'#0a0d14');
    c.fillStyle=glow;c.fillRect(-w/scale,-h/scale,w*2/scale,h*2/scale);
    const poly = (pts, color) => {c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
    c.save();c.rotate(-.23);c.beginPath();c.ellipse(0,9,267,115,0,0,Math.PI*2);
    c.shadowColor='#ffbb90';c.shadowBlur=15;c.strokeStyle='#eaa68099';c.lineWidth=2;c.stroke();
    c.beginPath();c.ellipse(0,9,276,121,0,0,Math.PI*2);c.strokeStyle='#ffcf9c44';c.lineWidth=1;c.stroke();c.restore();
    // Deterministic irregular paths: scrolling backward retraces the same motion.
    const coins=Array.from({length:14},(_,i)=>{
      const speed=.65+(i%5)*.19;
      const a=i*Math.PI*2/14+this.angle*speed;
      const radius=224+(i%4)*15+Math.sin(a*2+i)*9;
      return {i,a,x:Math.cos(a)*radius,
        y:Math.sin(a)*(88+(i%3)*13)-23-Math.cos(a)*47+Math.sin(a*3+i)*12,
        z:Math.sin(a),spin:this.angle*(i%2?-1:1)*(1.1+(i%4)*.55)+i*.87};
    }).sort((a,b)=>a.z-b.z);
    const coin = p => {
      c.save();c.translate(p.x,p.y);c.rotate(-.22+Math.sin(p.spin*.7)*.38);
      const size=22+(p.z+1)*3+(p.i%3)*2;
      const turn=p.spin;
      const face=Math.abs(Math.cos(turn));
      const rx=Math.max(3,size*face);
      c.shadowColor='#f2aa6670';c.shadowBlur=12;
      c.fillStyle='#8e4528';c.beginPath();c.ellipse(4,2,rx+2,size,0,0,Math.PI*2);c.fill();c.shadowBlur=0;
      const metal=c.createLinearGradient(-rx,-size,rx,size);metal.addColorStop(0,'#ffe2ab');metal.addColorStop(.38,'#d39361');metal.addColorStop(.65,'#a85c38');metal.addColorStop(1,'#f3b780');
      c.fillStyle=metal;c.beginPath();c.ellipse(0,0,rx,size,0,0,Math.PI*2);c.fill();
      c.strokeStyle='#ffd7a2';c.lineWidth=1.2;c.stroke();
      c.beginPath();c.ellipse(0,0,Math.max(1,rx-3),size-4,0,0,Math.PI*2);c.strokeStyle='#f8c39499';c.stroke();
      if(face>.2){c.scale(face,1);c.fillStyle='#7e432d';c.font='bold 29px Georgia';c.textAlign='center';c.fillText('¢',0,9);c.font='7px system-ui';c.fillText('ONE CENT',0,21);}
      c.restore();
    };
    coins.filter(p=>p.z<0).forEach(coin);
    // Extruded cross: front face stays oriented toward the viewer.
    c.save();c.translate(this.lean,-39);
    const shape=[[-30,-80],[30,-80],[30,-28],[82,-28],[82,28],[30,28],[30,80],[-30,80],[-30,28],[-82,28],[-82,-28],[-30,-28]];
    const dx=23,dy=-19;
    // Soft translucent body, luminous bevels and cloudy internal reflections.
    shape.forEach((p,i)=>{const q=shape[(i+1)%shape.length];
      poly([p,q,[q[0]+dx,q[1]+dy],[p[0]+dx,p[1]+dy]],q[0]>p[0]?'rgba(255,155,147,.58)':'rgba(148,24,49,.55)');
      c.strokeStyle='rgba(255,195,184,.3)';c.lineWidth=1;c.stroke();
    });
    const red=c.createLinearGradient(-65,-90,65,80);
    red.addColorStop(0,'rgba(255,166,159,.72)');red.addColorStop(.32,'rgba(246,70,85,.62)');red.addColorStop(.7,'rgba(191,28,63,.58)');red.addColorStop(1,'rgba(255,108,119,.72)');
    c.shadowColor='#ff536b88';c.shadowBlur=22;poly(shape,red);c.shadowBlur=0;
    c.strokeStyle='#ffd7ceaa';c.lineWidth=2;c.stroke();
    c.save();c.clip();
    const cloud=c.createRadialGradient(-23,-43,2,-8,-20,115);
    cloud.addColorStop(0,'rgba(255,230,223,.36)');cloud.addColorStop(.5,'rgba(255,142,156,.12)');cloud.addColorStop(1,'rgba(255,113,130,0)');
    c.fillStyle=cloud;c.fillRect(-90,-90,180,180);
    c.filter='blur(12px)';c.strokeStyle='rgba(255,226,220,.36)';c.lineWidth=18;
    c.beginPath();c.moveTo(-70,-30);c.bezierCurveTo(-15,-76,5,30,65,-13);c.stroke();
    c.filter='none';
    const reflection=c.createLinearGradient(-50,-80,60,80);
    reflection.addColorStop(0,'#ffffff44');reflection.addColorStop(.43,'#ffffff08');reflection.addColorStop(.47,'#ffffff35');reflection.addColorStop(.62,'#ffffff00');
    c.fillStyle=reflection;c.fillRect(-85,-80,170,160);
    c.restore();c.restore();
    coins.filter(p=>p.z>=0).forEach(coin);
    if(Math.abs(this.target-this.angle)>.001) this.frame=requestAnimationFrame(()=>this.draw());
  }
}
customElements.define('medical-orbit',MedicalOrbit);

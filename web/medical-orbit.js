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
    glow.addColorStop(0,'#38506b'); glow.addColorStop(1,'#101e31');
    c.fillStyle=glow;c.fillRect(-w/scale,-h/scale,w*2/scale,h*2/scale);
    const poly = (pts, color) => {c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=color;c.fill();};
    // Raised blue glass platform.
    c.shadowColor='#0009';c.shadowBlur=35;c.shadowOffsetY=24;
    poly([[-175,58],[0,-25],[175,58],[175,81],[0,169],[-175,81]],'#b7c8d7');
    c.shadowBlur=0;c.shadowOffsetY=0;
    poly([[-175,58],[0,-30],[175,58],[0,146]],'#dbe8ed');
    poly([[-152,54],[0,-20],[152,54],[0,128]],'#11283f');
    poly([[-132,54],[0,-9],[132,54],[0,116]],'#253f5a');
    c.save();c.rotate(-.23);c.beginPath();c.ellipse(0,9,267,115,0,0,Math.PI*2);
    c.shadowColor='#ffbb90';c.shadowBlur=15;c.strokeStyle='#eaa68099';c.lineWidth=2;c.stroke();
    c.beginPath();c.ellipse(0,9,276,121,0,0,Math.PI*2);c.strokeStyle='#ffcf9c44';c.lineWidth=1;c.stroke();c.restore();
    const coins=Array.from({length:9},(_,i)=>{
      const a=i*Math.PI*2/9+this.angle;
      return {i,a,x:Math.cos(a)*253,y:Math.sin(a)*104-30-Math.cos(a)*54,z:Math.sin(a)};
    }).sort((a,b)=>a.z-b.z);
    const coin = p => {
      c.save();c.translate(p.x,p.y);c.rotate(-.22);
      const size=27+(p.z+1)*3;
      const turn=p.a*1.5+this.angle;
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
    shape.forEach((p,i)=>{const q=shape[(i+1)%shape.length];poly([p,q,[q[0]+dx,q[1]+dy],[p[0]+dx,p[1]+dy]],q[0]>p[0]?'#ff7666':'#a71e22');});
    const red=c.createLinearGradient(-65,-90,65,80);red.addColorStop(0,'#ff6b58');red.addColorStop(.5,'#ef4037');red.addColorStop(1,'#bd2026');
    poly(shape,red);c.strokeStyle='#ffb09b66';c.lineWidth=1.4;c.stroke();c.restore();
    coins.filter(p=>p.z>=0).forEach(coin);
    if(Math.abs(this.target-this.angle)>.001) this.frame=requestAnimationFrame(()=>this.draw());
  }
}
customElements.define('medical-orbit',MedicalOrbit);

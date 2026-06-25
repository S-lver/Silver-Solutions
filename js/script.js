// js/script.js

// ===================== Liquid mercury hero canvas =====================
(function(){
  const canvas = document.getElementById('mercury-canvas');
  const ctx = canvas.getContext('2d');
  const hero = canvas.parentElement;
  let w, h, dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  let mouse = { x: 0.72, y: 0.42, tx: 0.72, ty: 0.42 };
  let t = 0;

  const field = document.createElement('canvas');
  const fctx = field.getContext('2d');
  const SCALE = 0.28;

  function resize(){
    w = hero.offsetWidth; h = hero.offsetHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    field.width = Math.max(1, Math.floor(w*SCALE));
    field.height = Math.max(1, Math.floor(h*SCALE));
  }
  resize();
  window.addEventListener('resize', resize);

  hero.addEventListener('mousemove', (e)=>{
    const r = hero.getBoundingClientRect();
    mouse.tx = (e.clientX - r.left) / r.width;
    mouse.ty = (e.clientY - r.top) / r.height;
  });

  const balls = [
    { bx:0.74, by:0.34, r:0.150, sx:0.06, sy:0.045, phase:0.0,  speed:0.55 },
    { bx:0.88, by:0.58, r:0.115, sx:0.05, sy:0.07,  phase:1.8,  speed:0.62 },
    { bx:0.63, by:0.66, r:0.100, sx:0.06, sy:0.04,  phase:3.4,  speed:0.48 },
    { bx:0.93, by:0.24, r:0.075, sx:0.035,sy:0.05,  phase:0.9,  speed:0.7 },
    { bx:0.80, by:0.80, r:0.065, sx:0.045,sy:0.035, phase:2.6,  speed:0.5 },
  ];

  function ballPositions(){
    return balls.map(b=>{
      const cx = b.bx + Math.sin(t*b.speed + b.phase)*b.sx + (mouse.x-0.72)*0.16;
      const cy = b.by + Math.cos(t*b.speed*0.9 + b.phase)*b.sy + (mouse.y-0.42)*0.16;
      const r = b.r * (1 + Math.sin(t*0.9 + b.phase)*0.08);
      return { cx, cy, r };
    });
  }

  function draw(){
    t += 0.0065;
    mouse.x += (mouse.tx - mouse.x) * 0.035;
    mouse.y += (mouse.ty - mouse.y) * 0.035;

    const fw = field.width, fh = field.height;
    const pts = ballPositions();
    const minDim = Math.min(w,h);

    const vals = new Float32Array(fw*fh);
    for(let py=0; py<fh; py++){
      const ny = py/fh * h;
      for(let px=0; px<fw; px++){
        const nx = px/fw * w;
        let sum = 0;
        for(let i=0;i<pts.length;i++){
          const dx = nx - pts[i].cx*w;
          const dy = ny - pts[i].cy*h;
          const rad = pts[i].r*minDim;
          const d2 = dx*dx + dy*dy;
          sum += (rad*rad) / (d2 + 1);
        }
        vals[py*fw+px] = sum;
      }
    }

    const imgData = fctx.createImageData(fw, fh);
    const data = imgData.data;
    const THRESH = 1.0;
    const lx = -0.62, ly = -0.62;

    for(let py=0; py<fh; py++){
      for(let px=0; px<fw; px++){
        const i = py*fw+px;
        const v = vals[i];
        const idx = i*4;
        if(v <= THRESH){
          data[idx+3] = 0;
          continue;
        }
        const vx0 = px>0 ? vals[i-1] : v;
        const vx1 = px<fw-1 ? vals[i+1] : v;
        const vy0 = py>0 ? vals[i-fw] : v;
        const vy1 = py<fh-1 ? vals[i+fw] : v;
        let nx = (vx0 - vx1);
        let ny = (vy0 - vy1);
        const nlen = Math.sqrt(nx*nx + ny*ny) + 0.0001;
        nx /= nlen; ny /= nlen;
        const interior = Math.min(1, (v-THRESH)/2.2);
        const nz = 0.55 + interior*0.45;

        let diffuse = nx*lx + ny*ly + nz*0.7;
        diffuse = Math.max(0, diffuse);
        const spec = Math.pow(diffuse, 6);

        const base = 0.30 + interior*0.10;
        const lum = base + diffuse*0.42 + spec*0.55;
        const edge = Math.min(1, (v-THRESH)*2.2);

        const r = clamp255((lum*0.78 + spec*0.35) * 255 * 1.02);
        const g = clamp255((lum*0.82 + spec*0.33) * 255 * 1.0);
        const b = clamp255((lum*0.95 + spec*0.30) * 255 * 1.06);

        data[idx]   = r;
        data[idx+1] = g;
        data[idx+2] = b;
        data[idx+3] = edge*255;
      }
    }
    fctx.putImageData(imgData, 0, 0);

    ctx.clearRect(0,0,w,h);

    const bg = ctx.createRadialGradient(w*0.78, h*0.42, 0, w*0.78, h*0.42, w*0.85);
    bg.addColorStop(0, 'rgba(44,47,54,0.35)');
    bg.addColorStop(1, 'rgba(10,10,13,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0,0,w,h);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(field, 0, 0, fw, fh, 0, 0, w, h);

    requestAnimationFrame(draw);
  }
  function clamp255(v){ return v<0?0:v>255?255:v; }
  draw();
})();

// ===================== CTA band ambient canvas =====================
(function(){
  const canvas = document.getElementById('cta-canvas');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  let w,h,dpr = Math.min(window.devicePixelRatio||1,2);
  let t = 0;

  function resize(){
    w = parent.offsetWidth; h = parent.offsetHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    canvas.style.width = w+'px'; canvas.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(){
    t += 0.004;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = 'lighter';
    for(let i=0;i<2;i++){
      const cx = w*(0.3+i*0.4) + Math.sin(t*0.6+i*3)*60;
      const cy = h*0.5 + Math.cos(t*0.5+i*2)*40;
      const r = Math.min(w,h)*0.35;
      const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
      grad.addColorStop(0,'rgba(139,157,195,0.25)');
      grad.addColorStop(1,'rgba(139,157,195,0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    requestAnimationFrame(draw);
  }
  draw();
})();

// ===================== Scroll progress + header border =====================
const scrollProgress = document.getElementById('scrollProgress');
const headerEl = document.querySelector('header');
function onScroll(){
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pct = max > 0 ? (window.scrollY / max) * 100 : 0;
  scrollProgress.style.width = pct + '%';
  headerEl.style.borderBottomColor = window.scrollY > 40 ? 'rgba(139,157,195,0.3)' : 'rgba(201,204,209,0.14)';
}
window.addEventListener('scroll', onScroll, { passive:true });
onScroll();

// ===================== Cursor glow =====================
const cursorGlow = document.getElementById('cursorGlow');
const isTouch = window.matchMedia('(pointer: coarse)').matches;
if(!isTouch){
  window.addEventListener('mousemove', (e)=>{
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    cursorGlow.style.opacity = '1';
  });
  window.addEventListener('mouseleave', ()=>{ cursorGlow.style.opacity = '0'; });
}

// ===================== Button magnetic glow =====================
document.querySelectorAll('.btn-primary').forEach(btn=>{
  btn.addEventListener('mousemove', (e)=>{
    const r = btn.getBoundingClientRect();
    btn.style.setProperty('--mx', ((e.clientX-r.left)/r.width*100)+'%');
    btn.style.setProperty('--my', ((e.clientY-r.top)/r.height*100)+'%');
  });
});

// ===================== Scroll reveal observer =====================
const revealObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
    }
  });
}, { threshold:0.15, rootMargin:'0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach((el, i)=>{
  el.style.transitionDelay = (Math.min(i % 6, 4) * 70) + 'ms';
  revealObserver.observe(el);
});

document.querySelectorAll('.service-card.reveal').forEach((el,i)=>{
  el.style.transitionDelay = (i*90)+'ms';
});
document.querySelectorAll('.process-step.reveal').forEach((el,i)=>{
  el.style.transitionDelay = (i*120)+'ms';
});
document.querySelectorAll('.work-row.reveal').forEach((el,i)=>{
  el.style.transitionDelay = (i*80)+'ms';
});
document.querySelectorAll('.price-card.reveal').forEach((el,i)=>{
  el.style.transitionDelay = (i*100)+'ms';
});

// ===================== Process rail fill =====================
const railFill = document.getElementById('railFill');
const processSteps = document.querySelectorAll('.process-step');
const railObserver = new IntersectionObserver((entries)=>{
  entries.forEach(entry=>{
    if(entry.isIntersecting){
      entry.target.classList.add('is-visible');
      railFill.classList.add('is-visible');
    }
  });
}, { threshold:0.4 });
processSteps.forEach(el=>railObserver.observe(el));

// ===================== Contact Form Handler (Netlify) =====================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
  const formSuccess = document.getElementById('formSuccess');
  const formError = document.getElementById('formError');

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const submitBtn = contactForm.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    
    // Show sending state
    submitBtn.innerHTML = '<span>Sending...</span>';
    submitBtn.disabled = true;
    formError.style.display = 'none';
    formSuccess.style.display = 'none';
    
    try {
      // Netlify forms accept POST with form data
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });
      
      if (response.ok) {
        formSuccess.style.display = 'block';
        contactForm.reset();
      } else {
        formError.style.display = 'block';
        formError.textContent = '❌ Something went wrong. Please try again or email us directly.';
      }
    } catch (error) {
      formError.style.display = 'block';
      formError.textContent = '❌ Network error. Please check your connection and try again.';
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      
      // Auto-hide messages after 6 seconds
      setTimeout(() => {
        formSuccess.style.display = 'none';
        formError.style.display = 'none';
      }, 6000);
    }
  });

  // Real-time validation feedback
  contactForm.querySelectorAll('input, textarea, select').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.hasAttribute('required') && !field.value.trim()) {
        field.style.borderColor = '#e74c3c';
      } else {
        field.style.borderColor = '';
      }
    });
    field.addEventListener('input', () => {
      if (field.value.trim()) {
        field.style.borderColor = '';
      }
    });
  });
}

// ===================== Legal Modals =====================
const legalContent = {
  privacy: `
    <h2>Privacy Policy</h2>
    <p>Last updated: January 2025</p>
    <p>Silver Solutions respects your privacy. This policy explains how we collect, use, and protect your personal information.</p>
    <h3>Information We Collect</h3>
    <p>We collect information you provide directly: name, email address, phone number, and project details.</p>
    <h3>How We Use It</h3>
    <p>To respond to inquiries, provide services, and communicate about your project. We never sell your data.</p>
    <h3>Your Rights</h3>
    <p>You may request access, correction, or deletion of your data at any time by emailing hello@silversolutions.example</p>
  `,
  terms: `
    <h2>Terms of Service</h2>
    <p>Last updated: January 2025</p>
    <p>By engaging Silver Solutions, you agree to the following terms:</p>
    <h3>Services</h3>
    <p>We provide web design and development services as outlined in your project proposal.</p>
    <h3>Payment</h3>
    <p>50% deposit required to begin work. Final payment due upon project completion.</p>
    <h3>Intellectual Property</h3>
    <p>You own all final deliverables. We retain the right to showcase work in our portfolio.</p>
    <h3>Liability</h3>
    <p>We strive for excellence but are not liable for indirect damages. Our liability is limited to the total project cost.</p>
  `,
  cookies: `
    <h2>Cookie Policy</h2>
    <p>Last updated: January 2025</p>
    <p>This site uses minimal cookies to improve user experience.</p>
    <h3>What Are Cookies</h3>
    <p>Small text files stored on your device to remember preferences and analyze site usage.</p>
    <h3>Our Cookies</h3>
    <p>We use essential cookies (no consent needed) and optional analytics cookies (you can opt out).</p>
    <h3>Manage Preferences</h3>
    <p>You can disable cookies in your browser settings at any time.</p>
  `
};

window.openLegal = function(type) {
  const modal = document.getElementById('legalModal');
  const content = document.getElementById('legalContent');
  content.innerHTML = legalContent[type] || '<p>Content not found.</p>';
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
};

window.closeLegal = function() {
  document.getElementById('legalModal').style.display = 'none';
  document.body.style.overflow = '';
};

document.getElementById('legalModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) window.closeLegal();
});

// ===================== Cookie Consent =====================
if (!localStorage.getItem('cookiesAccepted')) {
  const banner = document.getElementById('cookieBanner');
  if (banner) banner.style.display = 'block';
}

window.acceptCookies = function() {
  localStorage.setItem('cookiesAccepted', 'true');
  document.getElementById('cookieBanner').style.display = 'none';
  if (typeof gtag !== 'undefined') {
    gtag('consent', 'update', { analytics_storage: 'granted' });
  }
};


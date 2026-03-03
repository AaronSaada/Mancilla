/* ============================================================
   NAV — transparent → solid on scroll + mobile menu
============================================================ */
const nav    = document.getElementById('nav');
const burger = document.getElementById('burger');
const menu   = document.getElementById('nav-menu');

window.addEventListener('scroll', () => {
  nav.classList.toggle('solid', window.scrollY > 40);
}, { passive: true });

burger.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  burger.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', open);
});

menu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    burger.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
  });
});

/* ============================================================
   SERVICES — inject CSS vars from data attributes
============================================================ */
document.querySelectorAll('.svc-item').forEach(item => {
  const bg     = item.dataset.bg;
  const accent = item.dataset.accent;
  if (bg)     item.style.setProperty('--svc-bg', bg);
  if (accent) item.style.setProperty('--svc-accent', accent);

  // Propagate --svc-bg to .svc-carousel-wrap so ::before (left fade) resolves correctly
  const wrap = item.querySelector('.svc-carousel-wrap');
  if (wrap && bg) {
    wrap.style.setProperty('--svc-bg', bg);

    // Inject right fade as a child of .svc-carousel-wrap — exact mirror of ::before (left fade)
    // Being inside .svc-carousel-wrap means it shares the same opacity transition automatically
    const fadeRight = document.createElement('div');
    fadeRight.style.cssText = `
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 80px;
      background: linear-gradient(to left, ${bg}, transparent);
      z-index: 2;
      pointer-events: none;
    `;
    wrap.appendChild(fadeRight);
  }
});

/* ============================================================
   SCROLL REVEAL — SERVICES (escalier depuis la droite)
   + STATS (fade-up par card)
============================================================ */
if ('IntersectionObserver' in window) {

  const svcItems = document.querySelectorAll('.svc-item');
  svcItems.forEach((item) => {
    item.style.opacity = '0';
    item.style.transform = 'translateX(60px)';
    item.style.transition = `opacity .45s ease, transform .45s ease`;
  });

  const svcObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const i = Array.from(svcItems).indexOf(e.target);
        setTimeout(() => {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateX(0)';
        }, i * 80);
        svcObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });

  svcItems.forEach(item => svcObserver.observe(item));

  const csCards = document.querySelectorAll('.cscard');
  csCards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `opacity .5s ease, transform .5s ease`;
    card.style.transitionDelay = `${i * 0.12}s`;
  });

  new IntersectionObserver((entries, obs) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        csCards.forEach((card, i) => {
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
          }, i * 120);
        });
        obs.disconnect();
      }
    });
  }, { threshold: 0.6 }).observe(document.getElementById('cyberstat'));

}

/* ============================================================
   HERO STATS COUNTER
============================================================ */
function runCounter(el) {
  const target   = parseInt(el.dataset.to, 10);
  const duration = 2400;
  const t0       = performance.now();

  const tick = (now) => {
    const p    = Math.min((now - t0) / duration, 1);
    const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = Math.round(ease * target);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

setTimeout(() => {
  document.querySelectorAll('.cnt').forEach(el => runCounter(el));
}, 1400);

/* ============================================================
   SCROLL REVEAL — IntersectionObserver
============================================================ */
const revealEls = document.querySelectorAll('.tcard, .kpi, .cd, .about-badge');
revealEls.forEach(el => el.classList.add('reveal'));

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.6 });
  revealEls.forEach(el => io.observe(el));
}

/* ============================================================
   CONTACT FORM
============================================================ */
const form    = document.getElementById('cform');
const msgEl   = document.getElementById('cmsg');
const sendBtn = form.querySelector('.csend');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const name  = document.getElementById('fn');
  const email = document.getElementById('fe');
  const msg   = document.getElementById('fm');
  let ok = true;

  if (!name.value.trim())                              { markErr(name);  ok = false; }
  if (!email.value.trim() || !validEmail(email.value)) { markErr(email); ok = false; }
  if (!msg.value.trim())                               { markErr(msg);   ok = false; }
  if (!ok) return;

  sendBtn.classList.add('loading');
  sendBtn.disabled = true;

  try {
    await fakePost({ name: name.value, email: email.value, message: msg.value });
    form.reset();
    showMsg('✓ Message envoyé ! Je vous réponds sous 24h.');
  } catch {
    showMsg('Une erreur est survenue. Contactez-moi par email directement.');
  } finally {
    sendBtn.classList.remove('loading');
    sendBtn.disabled = false;
  }
});

function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function markErr(el)   { el.classList.add('err'); }
function clearErrors() {
  form.querySelectorAll('.err').forEach(el => el.classList.remove('err'));
  msgEl.textContent = '';
}
function showMsg(txt) {
  msgEl.textContent = txt;
  setTimeout(() => { msgEl.textContent = ''; }, 7000);
}
function fakePost(data) {
  console.log('Form data:', data);
  return new Promise(r => setTimeout(r, 1000));
}

/* ============================================================
   FOOTER YEAR
============================================================ */
const yr = document.getElementById('yr');
if (yr) yr.textContent = new Date().getFullYear();

/* ============================================================
   BACK TO TOP
============================================================ */
const btt = document.getElementById('btt');

window.addEventListener('scroll', () => {
  btt.classList.toggle('visible', window.scrollY > 400);
}, { passive: true });

btt.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

/* ============================================================
   INFINITE CAROUSELS
============================================================ */
document.querySelectorAll('.svc-carousel').forEach(carousel => {
  const track = carousel.querySelector('.svc-carousel-track');

  const half = Math.floor(track.children.length / 2);
  while (track.children.length > half) {
    track.removeChild(track.lastChild);
  }

  // Wait for all images to load before measuring widths
  const imgs = Array.from(track.querySelectorAll('img'));
  const loaded = imgs.map(img => new Promise(res => {
    if (img.complete) res();
    else { img.onload = res; img.onerror = res; }
  }));

  Promise.all(loaded).then(() => {
    const singleWidth = track.scrollWidth + 40;

    let clones = 0;
    while (track.scrollWidth < carousel.offsetWidth * 2 + singleWidth || clones < 1) {
      Array.from(track.children).slice(0, half).forEach(el => {
        track.appendChild(el.cloneNode(true));
      });
      clones++;
      if (clones > 10) break;
    }

    // Measure loopWidth after images are loaded and clones are added
    const loopWidth = track.scrollWidth / 2;
    let pos     = 0;
    let running = false;
    const speed = 0.9;

    function tick() {
      pos += speed;
      if (pos >= loopWidth) pos -= loopWidth;
      track.style.transform = `translateX(-${pos}px)`;
      if (running) requestAnimationFrame(tick);
    }

    const item = carousel.closest('.svc-item');
    item.addEventListener('mouseenter', () => {
      if (!running) { running = true; requestAnimationFrame(tick); }
    });
    item.addEventListener('mouseleave', () => {
      running = false;
    });
  });
});
/* =========================================================================
   DAROU MINAM CAFE — boutique & motion
   ------------------------------------------------------------------------
   ⚙️  TOUT CE QUI SE MODIFIE FACILEMENT EST DANS LE BLOC "CONFIG" CI-DESSOUS
   ========================================================================= */

const CONFIG = {
  /* Numéro WhatsApp qui reçoit les commandes (format international, sans +) */
  whatsapp: '221786156206',

  /* Google Apps Script qui enregistre les commandes dans le tableur.
     Mettre '' pour désactiver l'enregistrement (la commande partira
     uniquement sur WhatsApp). */
  sheet: 'https://script.google.com/macros/s/AKfycbw4G-tdzm46jpKPWWISkiO33YC75gMzZtbPulQSPErxKxtJxmtkuoswMvpn4GeDr5Oo/exec',

  currency: 'FCFA',

  /* Frais de livraison : un nombre (ex. 1000) ou null pour afficher
     « à confirmer ». */
  shipping: null
};

/* ⚠️  PRIX À AJUSTER — ce sont des valeurs de départ. */
const PRODUCTS = [
  {
    id: 'touba-250',
    brand: 'Café Touba',
    name: 'Le format découverte',
    weight: '250 g',
    price: 3000,
    desc: 'Café torréfié et diar. Le format pour découvrir le rituel.',
    img: 'assets/img/pack-250.webp'
  },
  {
    id: 'touba-500',
    brand: 'Café Touba',
    name: 'Le format partage',
    weight: '500 g',
    price: 5500,
    desc: 'Café torréfié et diar. Le format des maisons où le café circule.',
    img: 'assets/img/pack-500.webp'
  }
];

/* ---------- utils ------------------------------------------------------ */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const money = n => new Intl.NumberFormat('fr-FR').format(n) + ' ' + CONFIG.currency;
const pad = n => String(n).padStart(2, '0');

/* =========================================================================
   1. PRELOADER
   ========================================================================= */
(function loader() {
  const el = $('#loader'), num = $('#loaderNum'), bar = $('#loaderBar');
  if (!el) return;
  let p = 0, done = false;
  const tick = () => {
    p += Math.random() * 9 + 3;
    if (p >= 100) p = 100;
    num.textContent = Math.floor(p);
    bar.style.transform = `scaleX(${p / 100})`;
    if (p < 100) setTimeout(tick, 70 + Math.random() * 90);
    else setTimeout(finish, 420);
  };
  const finish = () => {
    if (done) return; done = true;
    el.classList.add('is-done');
    document.body.classList.remove('is-locked');
    const h1 = $('#hero h1'); if (h1) h1.classList.add('is-inview');
    $$('#hero [data-reveal]').forEach(n => n.classList.add('is-inview'));
    $('#hero .hero__bar')?.classList.add('is-inview');
  };
  document.body.classList.add('is-locked');
  REDUCED ? (num.textContent = 100, setTimeout(finish, 200)) : tick();
  window.addEventListener('load', () => setTimeout(() => { if (p < 100) { p = 100; num.textContent = 100; bar.style.transform = 'scaleX(1)'; setTimeout(finish, 300); } }, 400));
  setTimeout(finish, 6000); // garde-fou
})();

/* =========================================================================
   2. CURSEUR + AIMANTATION
   ========================================================================= */
(function cursor() {
  const el = $('#cursor');
  if (!el || REDUCED || !window.matchMedia('(hover:hover) and (pointer:fine)').matches) return;
  document.body.classList.add('has-cursor');
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
  addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; el.classList.add('is-live'); }, { passive: true });
  (function loop() {
    cx += (x - cx) * .18; cy += (y - cy) * .18;
    el.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  const label = el.firstElementChild;
  const hot = '[data-film], .play, .panel, [data-panel-toggle], .slide, .shop__stage';
  const small = 'a, button, input, .opt, .qty';
  document.addEventListener('pointerover', e => {
    const h = e.target.closest(hot), s = e.target.closest(small);
    el.classList.toggle('is-hot', !!h && !s);
    el.classList.toggle('is-small', !h && !!s);
    if (h && !s) label.textContent = h.matches('[data-film], .play') ? 'Play' : (h.closest('.shop__stage') ? 'Glisser' : 'Voir');
  });

  /* magnétisme */
  $$('[data-magnetic]').forEach(m => {
    m.addEventListener('pointermove', e => {
      const r = m.getBoundingClientRect();
      m.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
    });
    m.addEventListener('pointerleave', () => {
      m.style.transition = 'transform .7s cubic-bezier(.19,1,.22,1)';
      m.style.transform = '';
      setTimeout(() => m.style.transition = '', 700);
    });
  });
})();

/* =========================================================================
   3. SPLIT TEXT + REVEAL
   ========================================================================= */
(function splitText() {
  $$('[data-split] .line').forEach(line => {
    const frag = document.createDocumentFragment();
    let i = 0;
    const walk = (node, cls) => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach(tok => {
            if (!tok) return;
            const w = document.createElement('span');
            w.className = 'word';
            if (!tok.trim()) { w.innerHTML = '&nbsp;'; frag.appendChild(w); return; }
            [...tok].forEach(c => {
              const ch = document.createElement('span');
              ch.className = 'ch' + (cls ? ' ' + cls : '');
              ch.textContent = c;
              ch.style.setProperty('--d', i++ * 24);
              w.appendChild(ch);
            });
            frag.appendChild(w);
          });
        } else if (n.nodeType === 1) walk(n, n.className);
      });
    };
    walk(line, '');
    line.textContent = '';
    line.appendChild(frag);
  });
})();

const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('is-inview');
    io.unobserve(e.target);
  });
}, { threshold: .12, rootMargin: '0px 0px -8% 0px' });

$$('[data-reveal], [data-reveal-group], .mask, .imgwrap, .stat').forEach(el => io.observe(el));

/* =========================================================================
   4. PARALLAXE + PROGRESSION
   ========================================================================= */
(function parallax() {
  const items = $$('[data-parallax]').map(el => ({ el, k: parseFloat(el.dataset.parallax) || .1 }));
  const prog = $('#scrollProgress');
  let ticking = false;
  const run = () => {
    const vh = innerHeight;
    if (!REDUCED) items.forEach(({ el, k }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      el.style.transform = `translate3d(0,${(r.top + r.height / 2 - vh / 2) * -k}px,0)`;
    });
    const h = document.documentElement.scrollHeight - vh;
    prog.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + '%';
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
  addEventListener('resize', run);
  run();
})();

/* =========================================================================
   5. HEADER + MENU + ANCRES
   ========================================================================= */
(function header() {
  const head = $('#header');
  let last = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    head.classList.toggle('is-solid', y > 40);
    head.classList.toggle('is-hidden', y > 400 && y > last && !document.body.classList.contains('menu-open'));
    last = y;
  }, { passive: true });

  const burger = $('#burger'), menu = $('#menu');
  const toggleMenu = (force) => {
    const open = force !== undefined ? force : !document.body.classList.contains('menu-open');
    document.body.classList.toggle('menu-open', open);
    document.body.classList.toggle('is-locked', open);
    burger.setAttribute('aria-expanded', open);
    if (open) menu.querySelector('a')?.focus();
  };
  burger.addEventListener('click', () => toggleMenu());
  $$('#menu a[href^="#"]').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') toggleMenu(false); });

  /* défilement doux sur les ancres */
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const t = document.querySelector(id);
    if (!t) return;
    e.preventDefault();
    const top = id === '#top' ? 0 : t.getBoundingClientRect().top + scrollY - (innerWidth > 860 ? 70 : 60);
    scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' });
  }));

  /* lien actif */
  const links = $$('#nav a');
  const secs = ['#boutique', '#origine', '#rituel'].map(s => $(s)).filter(Boolean);
  const nio = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    links.forEach(l => l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id));
  }), { threshold: .3 });
  secs.forEach(s => nio.observe(s));
})();

/* =========================================================================
   6. RAIL 01/02/03
   ========================================================================= */
(function rail() {
  const rail = $('#rail'); if (!rail) return;
  const btns = $$('button', rail), bars = $$('.bar', rail);
  const map = ['hero', 'boutique', 'rituel'];
  btns.forEach(b => b.addEventListener('click', () => {
    const t = $('#' + b.dataset.goto);
    if (t) scrollTo({ top: t.offsetTop, behavior: REDUCED ? 'auto' : 'smooth' });
  }));
  const rio = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const i = map.indexOf(en.target.id);
    btns.forEach((b, k) => b.classList.toggle('is-on', k <= i));
    bars.forEach((b, k) => b.classList.toggle('is-on', k < i));
  }), { threshold: .35 });
  map.forEach(id => { const el = $('#' + id); if (el) rio.observe(el); });
})();

/* =========================================================================
   7. MARQUEE
   ========================================================================= */
(function marquee() {
  const row = $('#marquee .marquee__row'); if (!row || REDUCED) return;
  const clone = row.cloneNode(true);
  row.parentNode.appendChild(clone);
  const rows = [row, clone];
  let x = 0, w = row.offsetWidth, vel = 0;
  addEventListener('resize', () => w = row.offsetWidth);
  addEventListener('scroll', () => { vel = 14; }, { passive: true });
  (function loop() {
    vel += (0 - vel) * .06;
    x -= .55 + vel * .06;
    if (w && x <= -w) x += w;
    rows.forEach((r, i) => r.style.transform = `translate3d(${x + i * w}px,0,0)`);
    requestAnimationFrame(loop);
  })();
})();

/* =========================================================================
   8. SÉQUENCE HÉRO (le « film » de la page d'accueil)
   ========================================================================= */
const FRAMES = [
  { t: 'Le goût.', s: 'Café torréfié et diar, l\'intensité du café Touba.', label: '01 — Le rituel' },
  { t: 'Le geste.', s: 'L\'eau versée lentement, les arômes qui se révèlent.', label: '02 — La matière' },
  { t: 'Le partage.', s: 'Les verres qui circulent, le lien qui se noue.', label: '03 — Le partage' }
];

(function heroPlayer() {
  const hero = $('#hero'); if (!hero) return;
  const frames = $$('.hero__frame', hero);
  const track = $('#heroTrack'), time = $('#heroTime'), label = $('#heroLabel'), toggle = $('#heroToggle');
  const TOTAL = 32, STEP = TOTAL / frames.length;
  let t = 0, paused = REDUCED, visible = true, last = performance.now();

  new IntersectionObserver(e => visible = e[0].isIntersecting, { threshold: .05 }).observe(hero);

  toggle.addEventListener('click', () => {
    paused = !paused;
    hero.classList.toggle('is-paused', paused);
    beep(paused ? 220 : 440);
  });

  (function loop(now) {
    const dt = clamp((now - last) / 1000, 0, .25); last = now;
    if (!paused && visible) {
      t = (t + dt) % TOTAL;
      const i = clamp(Math.floor(t / STEP), 0, frames.length - 1);
      frames.forEach((f, k) => f.classList.toggle('is-on', k === i));
      if (label.textContent !== FRAMES[i].label) label.textContent = FRAMES[i].label;
      track.style.transform = `scaleX(${t / TOTAL})`;
      time.textContent = pad(Math.floor(t / 60)) + ':' + pad(Math.floor(t % 60));
    }
    requestAnimationFrame(loop);
  })(performance.now());

  hero.classList.toggle('is-paused', paused);
})();

/* =========================================================================
   9. PANNEAUX INGRÉDIENTS
   ========================================================================= */
$$('[data-panel]').forEach(panel => {
  const btn = $('[data-panel-toggle]', panel);
  const open = () => {
    const was = panel.classList.contains('is-open');
    $$('[data-panel]').forEach(p => p.classList.remove('is-open'));
    panel.classList.toggle('is-open', !was);
    beep(was ? 300 : 520);
  };
  btn?.addEventListener('click', e => { e.stopPropagation(); open(); });
  panel.addEventListener('click', open);
});

/* =========================================================================
   10. COMPTEURS
   ========================================================================= */
(function counters() {
  const cio = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const el = en.target, to = +el.dataset.count;
    cio.unobserve(el);
    const sfx = el.querySelector('i') ? 'h' : (to === 100 ? '%' : '');
    if (REDUCED) { el.innerHTML = to + (sfx ? `<i>${sfx}</i>` : ''); return; }
    const t0 = performance.now(), dur = 1400;
    const suffix = sfx;
    (function step(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.innerHTML = Math.round(to * e) + (suffix ? `<i>${suffix}</i>` : '');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));
})();

/* =========================================================================
   11. RITUEL — étapes auto
   ========================================================================= */
(function ritual() {
  const steps = $$('#steps .step'), figs = $$('#ritualMedia figure');
  if (!steps.length) return;
  let i = 0, timer = null, live = false;
  const DUR = 5000;

  const show = (n, auto) => {
    i = (n + steps.length) % steps.length;
    steps.forEach((s, k) => {
      s.classList.toggle('is-on', k === i);
      s.classList.toggle('is-done', k < i);
      const bar = $('.step__line i', s);
      bar.style.transition = 'none';
      bar.style.transform = `scaleX(${k < i ? 1 : 0})`;
      if (k === i && auto && !REDUCED) requestAnimationFrame(() => {
        bar.style.transition = `transform ${DUR}ms linear`;
        bar.style.transform = 'scaleX(1)';
      });
    });
    figs.forEach((f, k) => f.classList.toggle('is-on', k === i));
  };
  const play = () => { clearInterval(timer); if (REDUCED) return; timer = setInterval(() => show(i + 1, true), DUR); show(i, true); };
  const stop = () => clearInterval(timer);

  steps.forEach((s, k) => s.addEventListener('click', () => { show(k, true); play(); beep(400 + k * 90); }));
  new IntersectionObserver(e => {
    live = e[0].isIntersecting;
    live ? play() : stop();
  }, { threshold: .25 }).observe($('#rituel'));
  show(0, false);
})();

/* =========================================================================
   12. BOUTIQUE
   ========================================================================= */
let current = 0;

(function shop() {
  const slides = $('#shopSlides'), formats = $('#formats'), quick = $('#quickFormats');
  if (!slides) return;

  slides.innerHTML = PRODUCTS.map((p, i) => `
    <div class="slide${i === 0 ? ' is-on' : ''}" data-i="${i}">
      <img src="${p.img}" alt="${p.brand} ${p.weight} — ${p.name}" loading="${i === 0 ? 'eager' : 'lazy'}">
    </div>`).join('');

  const mkOpts = host => host.innerHTML = PRODUCTS.map((p, i) =>
    `<button class="opt${i === 0 ? ' is-on' : ''}" data-i="${i}" type="button">${p.weight}</button>`).join('');
  mkOpts(formats); mkOpts(quick);

  $('#shopTotal').textContent = pad(PRODUCTS.length);

  window.goTo = (n, silent) => {
    current = (n + PRODUCTS.length) % PRODUCTS.length;
    const p = PRODUCTS[current];
    $$('.slide', slides).forEach((s, k) => s.classList.toggle('is-on', k === current));
    $$('.opt', formats).concat($$('.opt', quick)).forEach(o => o.classList.toggle('is-on', +o.dataset.i === current));
    $('#buyEyebrow').textContent = p.brand;
    $('#buyName').textContent = p.name;
    $('#buyPrice').textContent = money(p.price);
    $('#buyWeight').textContent = p.weight;
    $('#buyDesc').textContent = p.desc;
    $('#shopIndex').textContent = pad(current + 1);
    $('#shopGhost').textContent = p.weight;
    $('#qty').value = 1;
    if (!silent) beep(520);
  };

  $('#prevBtn').addEventListener('click', () => goTo(current - 1));
  $('#nextBtn').addEventListener('click', () => goTo(current + 1));
  [formats, quick].forEach(host => host.addEventListener('click', e => {
    const b = e.target.closest('.opt'); if (b) goTo(+b.dataset.i);
  }));

  /* quantité */
  $$('[data-qty]').forEach(b => b.addEventListener('click', () => {
    const inp = $('#qty');
    inp.value = clamp((+inp.value || 1) + (+b.dataset.qty), 1, 99);
    inp.animate([{ transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 320, easing: 'cubic-bezier(.19,1,.22,1)' });
    beep(+b.dataset.qty > 0 ? 600 : 380);
  }));

  /* glisser / clavier */
  const stage = $('#shopStage');
  let x0 = null;
  stage.addEventListener('pointerdown', e => x0 = e.clientX);
  addEventListener('pointerup', e => {
    if (x0 === null) return;
    const d = e.clientX - x0; x0 = null;
    if (Math.abs(d) > 60) goTo(current + (d < 0 ? 1 : -1));
  });
  addEventListener('keydown', e => {
    if (document.body.classList.contains('cart-open') || document.body.classList.contains('menu-open')) return;
    const r = stage.getBoundingClientRect();
    if (r.top > innerHeight || r.bottom < 0) return;
    if (e.key === 'ArrowRight') goTo(current + 1);
    if (e.key === 'ArrowLeft') goTo(current - 1);
  });

  goTo(0, true);
})();

/* =========================================================================
   13. PANIER
   ========================================================================= */
const CART_KEY = 'dm-cart-v1';
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { cart = []; }

const saveCart = () => { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} };
const cartCount = () => cart.reduce((n, i) => n + i.qty, 0);
const cartTotal = () => cart.reduce((n, i) => n + i.qty * i.price, 0);

function renderCart(view) {
  const body = $('#drawerBody'), foot = $('#drawerFoot');
  $('#cartCount').textContent = cartCount();
  $('#drawerCount').textContent = '(' + cartCount() + ')';

  if (view === 'done') return;

  if (view === 'checkout') {
    body.innerHTML = `
      <button class="back-link" id="backToCart">← Retour au panier</button>
      <form id="orderForm" novalidate>
        <div class="field"><label for="f-nom">Nom complet</label><input id="f-nom" name="nom" required autocomplete="name"></div>
        <div class="field"><label for="f-tel">Téléphone (WhatsApp)</label><input id="f-tel" name="telephone" type="tel" required autocomplete="tel" placeholder="77 000 00 00"></div>
        <div class="field"><label for="f-adr">Adresse de livraison</label><textarea id="f-adr" name="adresse" required autocomplete="street-address"></textarea></div>
        <div class="field field-2">
          <div><label for="f-date">Date</label><input id="f-date" name="date_livraison" type="date" required></div>
          <div><label for="f-heure">Heure</label><input id="f-heure" name="heure_livraison" type="time" required></div>
        </div>
        <div class="field"><label for="f-rem">Remarques</label><textarea id="f-rem" name="remarques" placeholder="Étage, point de repère, préférences…"></textarea></div>
        <p class="form-note">En validant, votre commande est enregistrée puis ouverte dans WhatsApp pour confirmation avec notre équipe.</p>
      </form>`;
    foot.innerHTML = `
      <div class="totals">
        <div><span>Sous-total</span><span>${money(cartTotal())}</span></div>
        <div><span>Livraison</span><span>${CONFIG.shipping === null ? 'à confirmer' : money(CONFIG.shipping)}</span></div>
        <div class="grand"><span>Total</span><b>${money(cartTotal() + (CONFIG.shipping || 0))}</b></div>
      </div>
      <button class="btn btn--solid btn--block" id="submitOrder"><span>Valider la commande <svg class="arrow" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 11 11 2M4 2h7v7"/></svg></span></button>`;
    const d = $('#f-date'); if (d) d.min = new Date().toISOString().slice(0, 10);
    $('#backToCart').addEventListener('click', () => renderCart());
    $('#submitOrder').addEventListener('click', submitOrder);
    return;
  }

  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty">
        <svg viewBox="0 0 24 24"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>
        <p>Votre panier est vide.</p>
        <button class="btn btn--ghost" id="goShop"><span>Voir nos cafés</span></button>
      </div>`;
    foot.innerHTML = '';
    $('#goShop')?.addEventListener('click', () => { closeCart(); $('#boutique').scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' }); });
    return;
  }

  body.innerHTML = cart.map((it, i) => `
    <div class="citem" data-i="${i}" style="animation-delay:${i * 60}ms">
      <div class="citem__img"><img src="${it.img}" alt=""></div>
      <div>
        <h4>${it.brand}</h4>
        <p>${it.name} · ${it.weight}</p>
        <div class="qty">
          <button type="button" data-ci="${i}" data-d="-1" aria-label="Diminuer">−</button>
          <input type="number" value="${it.qty}" min="1" max="99" data-ci="${i}" aria-label="Quantité">
          <button type="button" data-ci="${i}" data-d="1" aria-label="Augmenter">+</button>
        </div>
      </div>
      <div class="citem__price">${money(it.qty * it.price)}
        <button class="citem__rm" data-rm="${i}">Retirer</button>
      </div>
    </div>`).join('');

  foot.innerHTML = `
    <div class="totals">
      <div><span>Sous-total</span><span>${money(cartTotal())}</span></div>
      <div><span>Livraison</span><span>${CONFIG.shipping === null ? 'à confirmer' : money(CONFIG.shipping)}</span></div>
      <div class="grand"><span>Total</span><b>${money(cartTotal() + (CONFIG.shipping || 0))}</b></div>
    </div>
    <button class="btn btn--solid btn--block" id="toCheckout"><span>Commander <svg class="arrow" width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M2 11 11 2M4 2h7v7"/></svg></span></button>`;

  $('#toCheckout').addEventListener('click', () => renderCart('checkout'));
  $$('[data-d]', body).forEach(b => b.addEventListener('click', () => {
    const i = +b.dataset.ci;
    cart[i].qty = clamp(cart[i].qty + (+b.dataset.d), 1, 99);
    saveCart(); renderCart(); beep(520);
  }));
  $$('input[data-ci]', body).forEach(inp => inp.addEventListener('change', () => {
    cart[+inp.dataset.ci].qty = clamp(parseInt(inp.value, 10) || 1, 1, 99);
    saveCart(); renderCart();
  }));
  $$('[data-rm]', body).forEach(b => b.addEventListener('click', () => {
    const row = b.closest('.citem');
    row.classList.add('is-out');
    setTimeout(() => { cart.splice(+b.dataset.rm, 1); saveCart(); renderCart(); }, 420);
    toast('Produit retiré du panier');
  }));
}

function addToCart(product, qty, fromEl) {
  const found = cart.find(i => i.id === product.id);
  if (found) found.qty = clamp(found.qty + qty, 1, 99);
  else cart.push({ id: product.id, brand: product.brand, name: product.name, weight: product.weight, price: product.price, img: product.img, qty });
  saveCart(); renderCart();
  $('#header').classList.remove('is-hidden');
  $('#cartBtn').classList.add('is-bump');
  setTimeout(() => $('#cartBtn').classList.remove('is-bump'), 520);
  if (fromEl) flyToCart(fromEl);
  toast(`${product.brand} ${product.weight} ajouté au panier`);
  beep(680);
}

function flyToCart(srcImg) {
  if (REDUCED) return;
  const a = srcImg.getBoundingClientRect(), b = $('#cartBtn').getBoundingClientRect();
  const el = document.createElement('div');
  el.className = 'fly';
  el.style.cssText = `left:${a.left}px;top:${a.top}px;width:${a.width}px;height:${a.height}px`;
  el.innerHTML = `<img src="${srcImg.currentSrc || srcImg.src}" alt="">`;
  document.body.appendChild(el);
  el.animate([
    { transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${b.left - a.left + b.width / 2 - a.width / 2}px,${b.top - a.top + b.height / 2 - a.height / 2}px) scale(.06)`, opacity: .2 }
  ], { duration: 950, easing: 'cubic-bezier(.76,0,.24,1)' }).onfinish = () => el.remove();
}

const openCart = () => { document.body.classList.add('cart-open', 'is-locked'); renderCart(); setTimeout(() => $('#closeCart')?.focus(), 300); };
const closeCart = () => document.body.classList.remove('cart-open', 'is-locked');

$('#cartBtn').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#scrim').addEventListener('click', () => { closeCart(); closeFilm(); });
addEventListener('keydown', e => { if (e.key === 'Escape') { closeCart(); closeFilm(); } });

$('#addBtn').addEventListener('click', () => {
  addToCart(PRODUCTS[current], clamp(parseInt($('#qty').value, 10) || 1, 1, 99), $('.slide.is-on img'));
});
$('#buyNow').addEventListener('click', () => {
  addToCart(PRODUCTS[current], clamp(parseInt($('#qty').value, 10) || 1, 1, 99), $('.slide.is-on img'));
  setTimeout(() => { openCart(); renderCart('checkout'); }, 260);
});

/* =========================================================================
   14. ENVOI DE LA COMMANDE
   ========================================================================= */
function orderText(d) {
  const lines = cart.map(i => `• ${i.brand} ${i.weight} (${i.name}) × ${i.qty} — ${money(i.qty * i.price)}`);
  return [
    'Bonjour Darou Minam Cafe, je passe commande :',
    '',
    ...lines,
    '',
    `Total produits : ${money(cartTotal())}`,
    CONFIG.shipping === null ? 'Livraison : à confirmer' : `Livraison : ${money(CONFIG.shipping)}`,
    '',
    `Nom : ${d.nom}`,
    `Téléphone : ${d.telephone}`,
    `Adresse : ${d.adresse}`,
    `Livraison souhaitée : ${d.date_livraison} à ${d.heure_livraison}`,
    d.remarques ? `Remarques : ${d.remarques}` : ''
  ].filter(Boolean).join('\n');
}

async function submitOrder() {
  const form = $('#orderForm');
  if (!form.reportValidity()) return;
  const data = Object.fromEntries(new FormData(form).entries());
  const btn = $('#submitOrder');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'Envoi en cours…';

  const payload = {
    ...data,
    commande: cart.map(i => `${i.brand} ${i.weight} x${i.qty}`).join(' | '),
    details: cart.map(i => `${i.id}:${i.qty}`).join(','),
    total: cartTotal(),
    devise: CONFIG.currency,
    source: 'site darouminam'
  };

  if (CONFIG.sheet) {
    try {
      await fetch(CONFIG.sheet, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(payload) });
    } catch (e) { /* la commande part quand même sur WhatsApp */ }
  }

  const url = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(orderText(data))}`;
  const win = window.open(url, '_blank');

  $('#drawerBody').innerHTML = `
    <div class="done">
      <div class="done__mark"><svg viewBox="0 0 30 30" fill="none"><path d="M6 15.5l6 6L24 9"/></svg></div>
      <h3 style="font-family:var(--f-display);text-transform:uppercase;font-weight:400;margin:0">Commande envoyée.</h3>
      <p style="color:var(--cream-dim);margin:0">Nous confirmons tout par WhatsApp. Si la fenêtre ne s'est pas ouverte, utilisez le bouton ci-dessous.</p>
      <a class="btn btn--ghost" href="${url}" target="_blank" rel="noopener"><span>Ouvrir WhatsApp</span></a>
    </div>`;
  $('#drawerFoot').innerHTML = `<button class="btn btn--solid btn--block" id="newOrder"><span>Continuer mes achats</span></button>`;
  $('#newOrder').addEventListener('click', () => { closeCart(); setTimeout(() => renderCart(), 600); });

  cart = []; saveCart();
  $('#cartCount').textContent = '0';
  $('#drawerCount').textContent = '(0)';
  renderCart('done');
  toast('Commande transmise ✓');
  beep(760); setTimeout(() => beep(980), 140);
  if (!win) location.href = url;
}

/* =========================================================================
   15. FILM
   ========================================================================= */
const FILM = [
  { t: 'Le goût.', s: 'Café torréfié et diar, l\'intensité du café Touba.' },
  { t: 'La matière.', s: 'Le grain, moulu avec le poivre de Guinée.' },
  { t: 'Le geste.', s: 'L\'eau versée lentement, les arômes révélés.' },
  { t: 'Le partage.', s: 'Les verres circulent, le lien se noue.' }
];

let filmTimer = null;
function openFilm() {
  document.body.classList.add('film-open', 'is-locked');
  const figs = $$('#film figure'), bar = $('#filmTrack');
  let i = 0;
  const show = () => {
    figs.forEach((f, k) => f.classList.toggle('is-on', k === i));
    $('#filmTitle').textContent = FILM[i].t;
    $('#filmText').textContent = FILM[i].s;
    bar.style.transition = 'none'; bar.style.width = '0%';
    requestAnimationFrame(() => { bar.style.transition = 'width 5s linear'; bar.style.width = '100%'; });
    i = (i + 1) % figs.length;
  };
  show();
  clearInterval(filmTimer);
  if (!REDUCED) filmTimer = setInterval(show, 5000);
  setTimeout(() => $('#closeFilm').focus(), 300);
}
function closeFilm() {
  document.body.classList.remove('film-open');
  if (!document.body.classList.contains('cart-open')) document.body.classList.remove('is-locked');
  clearInterval(filmTimer);
}
$$('[data-film]').forEach(b => b.addEventListener('click', openFilm));
$('#closeFilm').addEventListener('click', closeFilm);

/* =========================================================================
   16. TOASTS
   ========================================================================= */
function toast(msg) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<i></i><span>${msg}</span>`;
  host.appendChild(el);
  setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 450); }, 3200);
}

/* =========================================================================
   17. SON (clics discrets, désactivés par défaut)
   ========================================================================= */
let audioOn = false, actx = null;
function beep(freq) {
  if (!audioOn) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.05, actx.currentTime + .01);
    g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + .18);
    o.connect(g).connect(actx.destination);
    o.start(); o.stop(actx.currentTime + .2);
  } catch (e) {}
}
$('#soundBtn')?.addEventListener('click', e => {
  audioOn = !audioOn;
  e.currentTarget.setAttribute('aria-pressed', audioOn);
  $('#soundLabel').textContent = audioOn ? 'Couper le son' : 'Activer le son';
  if (audioOn) { beep(520); setTimeout(() => beep(780), 120); }
});

/* =========================================================================
   18. DIVERS
   ========================================================================= */
$('#year').textContent = new Date().getFullYear();
renderCart();

/* ============================================================
   STRIDE Sports Co. — main.js
   Global storefront core, loaded on every page:
   • design-system helpers (icons, stars, currency, dates)
   • safe localStorage wrapper (with in-memory fallback)
   • announcement bar, sticky header, nav, dropdown, search
   • cart state + slide-in cart drawer + free-shipping progress
   • wishlist + wishlist drawer
   • promo codes, toasts, mobile nav, policy modals, footer
   • homepage rendering (hero, categories, featured grid,
     countdown, testimonials, newsletter)
   Exposes window.STRIDE for product.js / checkout.js.
   ============================================================ */
(function () {
  'use strict';
  if (window.STRIDE) { return; } // idempotent

  var D = window.STRIDE_DATA;
  var CFG = D.config;

  /* ==========================================================
     1. UTILITIES
     ========================================================== */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function escapeHTML(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  function formatCurrency(n) {
    var num = Number(n);
    if (!isFinite(num)) { num = 0; }
    return fmt.format(num);
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, ctx = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(ctx, args); }, wait);
    };
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  /* Date helpers — business-day arithmetic shared across pages */
  var dateFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  function formatDate(d) { return dateFmt.format(d); }

  function addBusinessDays(from, days) {
    var d = new Date(from);
    d.setHours(12, 0, 0, 0);
    var added = 0, guard = 0;
    while (added < days && guard < 400) {
      d.setDate(d.getDate() + 1);
      var w = d.getDay();
      if (w !== 0 && w !== 6) { added++; }
      guard++;
    }
    return d;
  }

  /* Delivery estimate: base shipping days + per-state modifier.
     Returns { minDate, maxDate, minDays, maxDays } */
  function deliveryEstimate(stateCode, shippingDays) {
    var state = stateCode ? D.stateByCode[stateCode] : null;
    var base = CFG.defaultShipDays;
    var min = base[0], max = base[1];
    if (state) { min = CFG.defaultShipDays[0] + state.minDays; max = CFG.defaultShipDays[1] + state.maxDays; }
    if (shippingDays != null) { min = min - CFG.defaultShipDays[0] + shippingDays; max = max - CFG.defaultShipDays[1] + shippingDays; }
    return {
      minDate: addBusinessDays(new Date(), min),
      maxDate: addBusinessDays(new Date(), max),
      minDays: min,
      maxDays: max
    };
  }

  /* Shipping cost for an order subtotal after discount.
     Free when >= freeShipThreshold, otherwise the state's flat rate. */
  function computeShipping(subtotalAfterDiscount, stateCode) {
    var rate = (stateCode && D.stateByCode[stateCode]) ? D.stateByCode[stateCode].rate : CFG.defaultShipRate;
    var free = subtotalAfterDiscount >= CFG.freeShipThreshold;
    return { free: free, cost: free ? 0 : rate, rate: rate };
  }

  function taxRateFor(stateCode) {
    if (Object.prototype.hasOwnProperty.call(CFG.taxRates, stateCode)) { return CFG.taxRates[stateCode]; }
    return CFG.defaultTaxRate;
  }

  /* ==========================================================
     2. SAFE STORAGE (localStorage w/ in-memory fallback)
     ========================================================== */
  var memStore = {};
  var store = {
    get: function (key, fallback) {
      try {
        var raw = window.localStorage.getItem(key);
        if (raw === null) { return fallback; }
        return JSON.parse(raw);
      } catch (e) {
        return (key in memStore) ? memStore[key] : fallback;
      }
    },
    set: function (key, value) {
      memStore[key] = value;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* Quota exceeded / privacy mode — session memory keeps the app usable */
      }
    },
    remove: function (key) {
      delete memStore[key];
      try { window.localStorage.removeItem(key); } catch (e) { /* noop */ }
    }
  };

  var KEYS = {
    cart: 'sportcart_cart_v1',
    wishlist: 'sportcart_wishlist_v1',
    promo: 'sportcart_promo_v1',
    checkoutInfo: 'sportcart_checkout_info_v1',
    orders: 'sportcart_orders_v1',
    helpful: 'sportcart_review_helpful_v1',
    userReviews: 'sportcart_reviews_user_v1',
    headCode: 'sportcart_headcode_v1'
  };

  /* ==========================================================
     2.5 CUSTOM HEAD CODE (site-owner tool)
     Raw snippets (Google Tag Manager, analytics, meta verification…)
     saved from the announcement-bar `</>` dialog are injected at the end
     of <head> on EVERY page. Runs before first paint of the body, and
     never lets a malformed snippet break the storefront.
     ========================================================== */
  var HEAD_MARK = 'data-stride-head';

  function getHeadCode() {
    var v = store.get(KEYS.headCode, '');
    return typeof v === 'string' ? v : '';
  }

  function removeInjectedHeadCode() {
    $all('[' + HEAD_MARK + ']', document.head).forEach(function (el) {
      if (el.parentNode) { el.parentNode.removeChild(el); }
    });
  }

  /* Parse the raw snippet and re-create its nodes in the live <head>.
     <script> elements must be rebuilt manually — scripts inserted via
     innerHTML/importNode never execute; freshly created ones do. */
  function injectHeadCode(code) {
    if (!code || !code.trim()) { return; }
    var parsed = new DOMParser().parseFromString(code, 'text/html');
    var nodes = [];
    ['head', 'body'].forEach(function (part) {
      Array.prototype.forEach.call(parsed[part].childNodes, function (n) { nodes.push(n); });
    });
    nodes.forEach(function (node) {
      var el;
      if (node.nodeType === 1 && node.tagName === 'SCRIPT') {
        el = document.createElement('script');
        Array.prototype.forEach.call(node.attributes, function (a) { el.setAttribute(a.name, a.value); });
        el.textContent = node.textContent;
      } else if (node.nodeType === 1) {
        el = document.importNode(node, true);
      } else {
        return; // skip stray text/whitespace nodes
      }
      el.setAttribute(HEAD_MARK, '1');
      document.head.appendChild(el);
    });
  }

  function applyHeadCodeFromStore() {
    try {
      removeInjectedHeadCode();
      injectHeadCode(getHeadCode());
    } catch (e) {
      /* A broken user snippet must never take the storefront down */
      if (window.console && console.warn) { console.warn('STRIDE: custom head code could not be injected.', e); }
    }
  }

  /* Inject immediately — before header/init work, as close to a real
     "end of <head>" position as this page's script order allows. */
  applyHeadCodeFromStore();

  /* ==========================================================
     3. ICONS (inline SVG, stroke-based)
     ========================================================== */
  var ICON_PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>',
    heart: '<path d="M12 21s-7.6-4.8-10-9.3C.6 8.6 2.7 4.5 6.6 4.5c2.2 0 3.9 1.2 5.4 3.1 1.5-1.9 3.2-3.1 5.4-3.1 3.9 0 6 4.1 4.6 7.2C19.6 16.2 12 21 12 21z"/>',
    cart: '<path d="M3 4h2l2.3 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.55L21 8H6"/><circle cx="9.7" cy="20" r="1.4"/><circle cx="17.3" cy="20" r="1.4"/>',
    menu: '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
    x: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
    star: '<path d="M12 2.6l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/>',
    truck: '<rect x="1.5" y="6" width="13" height="10" rx="1.5"/><path d="M14.5 9h4l3 3.2V16h-7"/><circle cx="6" cy="18" r="1.8"/><circle cx="17.5" cy="18" r="1.8"/>',
    cash: '<rect x="2" y="6.5" width="20" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M5.5 9.5v.01M18.5 14.5v.01"/>',
    returns: '<path d="M3.5 9.5a9 9 0 1 1-.5 4"/><polyline points="3.5 4 3.5 9.5 9 9.5"/>',
    shield: '<path d="M12 3l7.5 3.2v5.1c0 4.6-3.2 8.6-7.5 10.2-4.3-1.6-7.5-5.6-7.5-10.2V6.2z"/><polyline points="9 11.5 11.2 13.7 15.2 9.7"/>',
    plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    minus: '<line x1="5" y1="12" x2="19" y2="12"/>',
    trash: '<polyline points="3.5 6.5 20.5 6.5"/><path d="M6 6.5l1 13a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-13"/><path d="M9 6.5V4.8A1.3 1.3 0 0 1 10.3 3.5h3.4A1.3 1.3 0 0 1 15 4.8v1.7"/><line x1="10" y1="10.5" x2="10" y2="17"/><line x1="14" y1="10.5" x2="14" y2="17"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    chevronLeft: '<polyline points="14.5 5.5 8 12 14.5 18.5"/>',
    chevronRight: '<polyline points="9.5 5.5 16 12 9.5 18.5"/>',
    check: '<polyline points="20 6.5 9.5 17 4 11.5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5.5 15H4.8A1.8 1.8 0 0 1 3 13.2v-8A1.8 1.8 0 0 1 4.8 3.5h8A1.8 1.8 0 0 1 14.5 5.3V6"/>',
    print: '<polyline points="7 8 7 3 17 3 17 8"/><path d="M7 17H4.5A1.5 1.5 0 0 1 3 15.5v-6A1.5 1.5 0 0 1 4.5 8h15A1.5 1.5 0 0 1 21 9.5v6a1.5 1.5 0 0 1-1.5 1.5H17"/><rect x="7" y="14" width="10" height="7" rx="1"/>',
    share: '<circle cx="6" cy="12" r="2.6"/><circle cx="17.5" cy="5.5" r="2.6"/><circle cx="17.5" cy="18.5" r="2.6"/><line x1="8.4" y1="10.8" x2="15.3" y2="6.9"/><line x1="8.4" y1="13.2" x2="15.3" y2="17.1"/>',
    mail: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><polyline points="3.5 6.5 12 13 20.5 6.5"/>',
    phone: '<path d="M5 3.5h3.2l1.6 4.2-2 1.6a12.6 12.6 0 0 0 6.4 6.4l1.6-2 4.2 1.6V19a1.9 1.9 0 0 1-2 1.9C10 20.4 3.6 14 3.1 5.5A1.9 1.9 0 0 1 5 3.5z"/>',
    pin: '<path d="M12 21.5s-7.5-6.2-7.5-11.5a7.5 7.5 0 0 1 15 0c0 5.3-7.5 11.5-7.5 11.5z"/><circle cx="12" cy="10" r="2.8"/>',
    arrowUp: '<line x1="12" y1="20" x2="12" y2="4.5"/><polyline points="5.5 11 12 4.5 18.5 11"/>',
    arrowRight: '<line x1="4" y1="12" x2="19" y2="12"/><polyline points="12.5 5.5 19 12 12.5 18.5"/>',
    package: '<path d="M21 8.2 12 3 3 8.2v7.6L12 21l9-5.2z"/><polyline points="3 8.2 12 13.4 21 8.2"/><line x1="12" y1="13.4" x2="12" y2="21"/>',
    alert: '<path d="M12 3.5 22 20H2z"/><line x1="12" y1="9.5" x2="12" y2="14"/><circle cx="12" cy="16.8" r="0.4"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/><line x1="8.5" y1="11" x2="13.5" y2="11"/><line x1="11" y1="8.5" x2="11" y2="13.5"/>',
    upload: '<path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/><polyline points="7.5 8.5 12 4 16.5 8.5"/><line x1="12" y1="4" x2="12" y2="16"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><line x1="17.2" y1="6.8" x2="17.2" y2="6.8"/>',
    facebook: '<path d="M14.5 8.5H17V5h-2.5A4.5 4.5 0 0 0 10 9.5V12H7v3.5h3V21h3.5v-5.5h3l.5-3.5h-3.5V9.7a.9.9 0 0 1 .9-1.2z"/>',
    youtube: '<rect x="2.5" y="6" width="19" height="12.5" rx="3.5"/><path d="M10.2 9.6v5.3l4.8-2.65z"/>',
    xsocial: '<path d="M4.5 4.5 19 19.5M19 4.5 4.5 19.5"/><path d="M4.5 4.5h3.4L19 19.5h-3.4z" fill="currentColor" stroke="none" opacity="0.25"/>',
    thumb: '<path d="M7 10.5v9H4.5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7 10.5 11 3.2a2 2 0 0 1 2 2v3.3h5.3a1.8 1.8 0 0 1 1.8 2.1l-1.1 6.6a1.8 1.8 0 0 1-1.8 1.5H7"/>',
    info: '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.4"/>',
    code: '<polyline points="8.5 6.5 3.5 12 8.5 17.5"/><polyline points="15.5 6.5 20.5 12 15.5 17.5"/><line x1="13.4" y1="4.5" x2="10.6" y2="19.5"/>',
    tag: '<path d="M3.5 12.5 11 20a2 2 0 0 0 2.8 0l6.2-6.2a2 2 0 0 0 0-2.8L12.5 3.5H6a2.5 2.5 0 0 0-2.5 2.5z"/><circle cx="8.3" cy="8.3" r="1.3"/>'
  };

  function icon(name, size, filled) {
    var p = ICON_PATHS[name] || ICON_PATHS.info;
    var s = size || 20;
    var fill = filled ? 'currentColor' : 'none';
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="' + fill + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + '</svg>';
  }

  /* Star row used for ratings (fill % handles fractional ratings) */
  function starRow() {
    return '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true" focusable="false">' + ICON_PATHS.star + '</svg>';
  }
  function starsHTML(rating, large) {
    var pct = clamp(Math.round((Number(rating) / 5) * 100), 0, 100);
    var cls = large ? ' stars--lg' : '';
    var row = starRow();
    return '<span class="stars' + cls + '" role="img" aria-label="Rated ' + Number(rating).toFixed(1) + ' out of 5 stars">' +
      '<span class="stars__row">' + row + row + row + row + row + '</span>' +
      '<span class="stars__row stars__row--fill" style="width:' + pct + '%">' + row + row + row + row + row + '</span>' +
      '</span>';
  }

  /* NOTE: single quotes inside this URI are %-encoded (%27) so the URI can be
     safely embedded in the single-quoted JS string of inline onerror handlers. */
  var FALLBACK_IMG = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27800%27 height=%27800%27 viewBox=%270 0 800 800%27%3E%3Crect width=%27800%27 height=%27800%27 fill=%27%23EEF0F3%27/%3E%3Cpath d=%27M430 190 L300 470 h90 L360 620 L520 380 h-95 L470 190 Z%27 fill=%27%23C6CBD4%27/%3E%3C/svg%3E";

  /* Standard <img> builder with lazy loading, aspect-ratio safety, and
     an inline-SVG fallback on network failure (no broken images ever). */
  function imgTag(src, alt, w, h, eager) {
    return '<img src="' + escapeHTML(src) + '" alt="' + escapeHTML(alt || '') + '" width="' + (w || 800) + '" height="' + (h || 800) + '"' +
      (eager ? ' loading="eager"' : ' loading="lazy"') +
      ' decoding="async" onerror="this.onerror=null;this.src=\'' + FALLBACK_IMG + '\'">';
  }

  /* ==========================================================
     4. TOASTS
     ========================================================== */
  var toastRoot = null;
  function toast(message, type, duration) {
    if (!toastRoot) { toastRoot = document.getElementById('toast-root'); } // lazy lookup — covers any call order
    if (!toastRoot) { return; }
    var t = document.createElement('div');
    t.className = 'toast toast--' + (type || 'info');
    t.setAttribute('role', 'status');
    var icName = type === 'success' ? 'check' : (type === 'error' ? 'alert' : 'info');
    t.innerHTML = '<span class="toast__icon">' + icon(icName, 18) + '</span>' +
      '<span class="toast__msg">' + escapeHTML(message) + '</span>' +
      '<button type="button" class="toast__close" aria-label="Dismiss notification">' + icon('x', 14) + '</button>';
    toastRoot.appendChild(t);
    requestAnimationFrame(function () { requestAnimationFrame(function () { t.classList.add('show'); }); });

    var life = duration || 3600;
    var timer = setTimeout(dismiss, life);

    function dismiss() {
      clearTimeout(timer);
      t.classList.remove('show');
      setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 300);
    }
    t.querySelector('.toast__close').addEventListener('click', dismiss);
    // Keep stack tidy: max 4 visible
    var all = $all('.toast', toastRoot);
    if (all.length > 4) { all[0].remove(); }
  }

  /* ==========================================================
     5. SCROLL REVEAL + HEADER SHADOW + BACK TO TOP
     ========================================================== */
  function initReveal() {
    var els = $all('.reveal');
    if (!els.length) { return; }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) { return; }
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      var header = $('#site-header');
      if (header) { header.classList.toggle('is-scrolled', y > 8); }
      var back = $('#back-top');
      if (back) { back.classList.toggle('show', y > 500); }
      ticking = false;
    });
  }

  /* ==========================================================
     6. FOCUS TRAP + ESC STACK
     ========================================================== */
  var FOCUS_SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function trapFocus(container) {
    function handler(e) {
      if (e.key !== 'Tab') { return; }
      var f = $all(FOCUS_SEL, container).filter(function (el) { return el.offsetParent !== null; });
      if (!f.length) { return; }
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
    container.addEventListener('keydown', handler);
    return function () { container.removeEventListener('keydown', handler); };
  }

  /* One shared overlay + one "open layer" at a time keeps ESC handling simple */
  var openLayer = null; // {name, close}

  function setLayer(name, closeFn) {
    if (openLayer && openLayer.name !== name) { openLayer.close(); }
    openLayer = { name: name, close: closeFn };
  }
  function clearLayer(name) {
    if (openLayer && openLayer.name === name) { openLayer = null; }
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openLayer) {
      e.preventDefault();
      openLayer.close();
    }
  });

  function lockScroll(lock) {
    document.body.classList.toggle('no-scroll', lock);
  }

  function showOverlay() {
    var ov = $('#site-overlay');
    if (ov) { ov.classList.add('show'); }
  }
  function hideOverlay() {
    var ov = $('#site-overlay');
    if (ov) { ov.classList.remove('show'); }
  }

  /* ==========================================================
     7. HEADER / NAV / SEARCH / ANNOUNCEMENT
     ========================================================== */
  var ANNOUNCE_MSGS = [
    'Free shipping on orders over $75 · Cash on Delivery available',
    '30-day hassle-free returns on every order',
    'Use code SPORT10 for 10% off — new customers welcome'
  ];

  var BRAND_SVG =
    '<svg class="brand__logo" viewBox="0 0 40 40" width="34" height="34" aria-hidden="true" focusable="false">' +
    '<rect width="40" height="40" rx="9" fill="#1F2733"></rect>' +
    '<path d="M23 7 10 23h7.4l-2.6 10L28 17h-7.4L23 7z" fill="#FF5A1F"></path>' +
    '</svg>';

  var CATEGORIES_NAV = D.home.categories.map(function (c) {
    return '<a href="' + c.href + '">' + icon('tag', 15) + escapeHTML(c.name) + '</a>';
  }).join('');

  function buildAnnouncement() {
    var root = $('#announcement-root');
    if (!root) { return; }
    root.innerHTML =
      '<div class="announcement" id="announcement-bar">' +
      '<span class="announcement__msg" data-msg>' + escapeHTML(ANNOUNCE_MSGS[0]) + '</span>' +
      '<button type="button" class="announce-code-btn" id="headcode-btn" aria-haspopup="dialog" aria-label="Manage custom head code snippets">' +
      icon('code', 14) + '<span class="announce-code-btn__label">Head code</span></button>' +
      '</div>';
    var hcBtn = $('#headcode-btn');
    if (hcBtn) { hcBtn.addEventListener('click', openHeadCodeModal); }
    var el = root.querySelector('[data-msg]');
    var idx = 0;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }
    setInterval(function () {
      idx = (idx + 1) % ANNOUNCE_MSGS.length;
      el.classList.remove('announcement__msg');
      void el.offsetWidth; // restart animation
      el.textContent = ANNOUNCE_MSGS[idx];
      el.classList.add('announcement__msg');
    }, 5000);
  }

  function buildHeader() {
    var root = $('#header-root');
    if (!root) { return; }
    var page = document.body.getAttribute('data-page') || 'home';
    root.innerHTML =
      '<header class="site-header" id="site-header">' +
      '  <div class="container header-inner">' +
      '    <button type="button" class="icon-btn hamburger" id="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobile-nav">' + icon('menu', 22) + '</button>' +
      '    <a class="brand" href="index.html" aria-label="STRIDE Sports — home">' + BRAND_SVG +
      '      <span class="brand__name">STRIDE<em>.</em></span></a>' +
      '    <nav class="main-nav" aria-label="Primary">' +
      '      <ul class="nav-list">' +
      '        <li><a class="nav-link" href="index.html"' + (page === 'home' ? ' aria-current="page"' : '') + '>Home</a></li>' +
      '        <li><a class="nav-link" href="index.html#featured">Shop</a></li>' +
      '        <li class="has-dropdown">' +
      '          <button type="button" class="nav-link" id="cat-dd-btn" aria-expanded="false" aria-controls="cat-dd">Categories ' + icon('chevronDown', 14) + '</button>' +
      '          <div class="dropdown" id="cat-dd">' + CATEGORIES_NAV + '</div>' +
      '        </li>' +
      '        <li><a class="nav-link" href="index.html#about">About</a></li>' +
      '        <li><a class="nav-link" href="index.html#contact">Contact</a></li>' +
      '      </ul>' +
      '    </nav>' +
      '    <div class="header-actions">' +
      '      <div class="search-wrap">' +
      '        <button type="button" class="icon-btn" id="search-btn" aria-label="Search products" aria-expanded="false" aria-controls="search-box">' + icon('search', 21) + '</button>' +
      '        <div class="search-box" id="search-box" hidden>' +
      '          <div class="search-row">' +
      '            <input type="search" id="search-input" placeholder="Search gear, brands, categories…" aria-label="Search products" autocomplete="off">' +
      '          </div>' +
      '          <div class="search-results" id="search-results" role="listbox" aria-label="Search results"></div>' +
      '        </div>' +
      '      </div>' +
      '      <button type="button" class="icon-btn" id="wishlist-btn" aria-label="Open wishlist" aria-haspopup="dialog">' + icon('heart', 21) +
      '        <span class="icon-btn__badge" id="wishlist-badge" hidden>0</span></button>' +
      '      <button type="button" class="icon-btn" id="cart-btn" aria-label="Open shopping cart" aria-haspopup="dialog">' + icon('cart', 21) +
      '        <span class="icon-btn__badge" id="cart-badge" hidden>0</span></button>' +
      '    </div>' +
      '  </div>' +
      '</header>' +
      '<div class="overlay" id="site-overlay"></div>';

    // Categories dropdown
    var ddBtn = $('#cat-dd-btn');
    var dd = $('#cat-dd');
    if (ddBtn && dd) {
      ddBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = dd.classList.toggle('open');
        ddBtn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', function (e) {
        if (dd.classList.contains('open') && !dd.contains(e.target) && e.target !== ddBtn) {
          dd.classList.remove('open');
          ddBtn.setAttribute('aria-expanded', 'false');
        }
      });
      dd.addEventListener('click', function () {
        dd.classList.remove('open');
        ddBtn.setAttribute('aria-expanded', 'false');
      });
    }

    // Search
    var sBtn = $('#search-btn');
    var sBox = $('#search-box');
    var sInput = $('#search-input');
    var sResults = $('#search-results');
    if (sBtn && sBox && sInput) {
      function closeSearch() {
        sBox.classList.remove('open');
        sBox.hidden = true;
        sBtn.setAttribute('aria-expanded', 'false');
      }
      sBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = sBox.hidden;
        if (willOpen) {
          sBox.hidden = false;
          requestAnimationFrame(function () { sBox.classList.add('open'); });
          sBtn.setAttribute('aria-expanded', 'true');
          setLayer('search', closeSearch);
          sInput.focus();
        } else {
          closeSearch();
          clearLayer('search');
        }
      });
      document.addEventListener('click', function (e) {
        if (!sBox.hidden && !sBox.contains(e.target) && !sBtn.contains(e.target)) {
          closeSearch();
          clearLayer('search');
        }
      });
      sResults.addEventListener('click', function () {
        closeSearch();
        clearLayer('search');
      });

      var runSearch = debounce(function () {
        var q = sInput.value.trim().toLowerCase();
        if (q.length < 2) { sResults.innerHTML = ''; return; }
        var hits = D.products.filter(function (p) {
          return (p.name + ' ' + p.brand + ' ' + p.category).toLowerCase().indexOf(q) !== -1;
        }).slice(0, 6);
        if (!hits.length) {
          sResults.innerHTML = '<p class="search-empty">No products match “' + escapeHTML(q) + '”. Try “running”, “yoga”, “helmet”…</p>';
          return;
        }
        sResults.innerHTML = hits.map(function (p) {
          return '<a class="search-result" role="option" href="product-' + p.id.slice(1) + '.html">' +
            imgTag(p.images[0], p.name, 40, 40) +
            '<span><span class="sr-name">' + escapeHTML(p.name) + '</span>' +
            '<span class="sr-meta">' + escapeHTML(p.brand) + ' · ' + escapeHTML(p.category) + '</span></span>' +
            '<span class="sr-price">' + formatCurrency(p.price) + '</span></a>';
        }).join('');
      }, 200);
      sInput.addEventListener('input', runSearch);
      sInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          var first = sResults.querySelector('a.search-result');
          if (first) { window.location.href = first.getAttribute('href'); }
        }
      });
    }
  }

  /* ==========================================================
     8. FOOTER + POLICY MODAL
     ========================================================== */
  var POLICIES = {
    shipping: {
      title: 'Shipping Policy',
      body: '<h4>Processing time</h4><p>Orders are picked and packed within 1–2 business days. You will receive a tracking link by email the moment your parcel leaves our warehouse.</p>' +
        '<h4>Delivery estimates</h4><ul><li>Standard delivery: 2–7 business days depending on your state (exact range shown on each product page).</li><li>Free standard shipping on orders over $75 (after discounts).</li><li>Flat-rate shipping of $6.99–$14.99 below the threshold, based on your state.</li></ul>' +
        '<h4>Cash on Delivery</h4><p>COD is available on all orders. Inspect your items at the door, then pay the courier in cash or by card. A $0 pre-authorization may appear on card-linked COD orders and clears automatically.</p>'
    },
    returns: {
      title: 'Returns & Exchanges',
      body: '<h4>30-day promise</h4><p>Not the right fit? Return any item within 30 days of delivery for a full refund — no restocking fees, ever.</p>' +
        '<h4>How it works</h4><ul><li>Start a return from the link in your order confirmation email.</li><li>Print the prepaid label and drop the parcel at any carrier point.</li><li>Refunds are issued within 3 business days after the item is scanned by the carrier.</li></ul>' +
        '<h4>Conditions</h4><p>Items should be unused and in original packaging. For hygiene reasons, we cannot accept used yoga mats or opened supplements — defective items are always covered by warranty.</p>'
    },
    faq: {
      title: 'Frequently Asked Questions',
      body: D.home.faq.map(function (f) { return '<h4>' + escapeHTML(f.q) + '</h4><p>' + escapeHTML(f.a) + '</p>'; }).join('')
    },
    warranty: {
      title: 'Warranty',
      body: '<h4>Coverage</h4><p>Every STRIDE product carries a 1–2 year manufacturer warranty (see each product\'s specification table) against defects in materials and workmanship under normal use.</p>' +
        '<h4>Claims</h4><ul><li>Email support@stridesports.example with your order ID and a photo of the defect.</li><li>Approved claims are replaced or refunded within 10 business days — shipping on us.</li><li>Normal wear, crash damage and misuse are not covered, but we offer discounted crash-replacement for helmets.</li></ul>'
    }
  };

  function openPolicy(key) {
    var p = POLICIES[key];
    if (!p) { return; }
    var modal = $('#policy-modal');
    if (!modal) { return; }
    if (modal.classList.contains('open')) { return; } // idempotent — ignore repeat triggers
    $('#policy-modal-title').textContent = p.title;
    $('#policy-modal-body').innerHTML = p.body;
    modal.classList.add('open');
    lockScroll(true);
    var closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) { closeBtn.focus(); }
    var release = trapFocus(modal);
    setLayer('policy', function () {
      modal.classList.remove('open');
      lockScroll(false);
      release();
      clearLayer('policy');
    });
  }

  function buildPolicyModal() {
    var root = $('#modal-root');
    if (!root) { return; }
    root.innerHTML =
      '<div class="modal" id="policy-modal" role="dialog" aria-modal="true" aria-labelledby="policy-modal-title">' +
      '  <div class="modal__box">' +
      '    <div class="modal__head"><h3 class="modal__title" id="policy-modal-title">Policy</h3>' +
      '    <button type="button" class="drawer__close modal__close" aria-label="Close dialog">' + icon('x', 20) + '</button></div>' +
      '    <div class="modal__body" id="policy-modal-body"></div>' +
      '  </div>' +
      '</div>';
    var modal = $('#policy-modal');
    modal.querySelector('.modal__close').addEventListener('click', function () {
      if (openLayer && openLayer.name === 'policy') { openLayer.close(); }
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal && openLayer && openLayer.name === 'policy') { openLayer.close(); }
    });
  }

  /* ------------------------------------------------------------
     8.5 CUSTOM HEAD CODE MANAGER (announcement-bar `</>` button)
     Site-owner dialog: paste GTM / analytics / verification snippets,
     save to localStorage, inject live + on every future page load.
     ------------------------------------------------------------ */
  function buildHeadCodeModal() {
    if ($('#headcode-modal')) { return; } // build once
    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'headcode-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'headcode-title');
    modal.innerHTML =
      '<div class="modal__box modal__box--wide">' +
      '  <div class="modal__head">' +
      '    <h3 class="modal__title modal__title--icon" id="headcode-title">' + icon('code', 20) + ' Custom head code</h3>' +
      '    <button type="button" class="drawer__close modal__close" aria-label="Close dialog">' + icon('x', 20) + '</button>' +
      '  </div>' +
      '  <div class="modal__body">' +
      '    <p class="headcode-hint">Paste third-party snippets below — Google Tag Manager, Analytics, Search Console verification, meta tags, structured data. They are injected at the end of the <code>&lt;head&gt;</code> section, right before <code>&lt;/head&gt;</code>, on <strong>every page</strong> of this site.</p>' +
      '    <div class="headcode-status" id="headcode-status" aria-live="polite"><span class="headcode-dot"></span><span id="headcode-status-text"></span></div>' +
      '    <label class="sr-only" for="headcode-input">Custom head code snippets</label>' +
      '    <textarea class="headcode-textarea" id="headcode-input" rows="9" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="<!-- Example: Google Tag Manager -->&#10;<script>window.dataLayer = window.dataLayer || [];</script>"></textarea>' +
      '    <div class="headcode-count"><span id="headcode-chars">0</span> characters</div>' +
      '    <p class="headcode-warn">' + icon('alert', 15) + '<span>Only paste code from sources you trust — snippets saved here run on every storefront page, for every visitor.</span></p>' +
      '    <div class="headcode-actions">' +
      '      <button type="button" class="btn btn--primary" id="headcode-save">Save &amp; apply</button>' +
      '      <button type="button" class="btn btn--outline" id="headcode-clear">Remove code</button>' +
      '    </div>' +
      '  </div>' +
      '</div>';
    document.body.appendChild(modal);

    modal.querySelector('.modal__close').addEventListener('click', function () {
      if (openLayer && openLayer.name === 'headcode') { openLayer.close(); }
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal && openLayer && openLayer.name === 'headcode') { openLayer.close(); }
    });

    var ta = $('#headcode-input', modal);
    ta.addEventListener('input', function () {
      $('#headcode-chars').textContent = String(ta.value.length);
    });

    $('#headcode-save').addEventListener('click', function () {
      var code = ta.value;
      store.set(KEYS.headCode, code);
      applyHeadCodeFromStore(); // live on this page; persists for every other page
      updateHeadCodeStatus();
      closeHeadCodeModal();
      toast(code.trim()
        ? 'Head code saved — injected into <head> on this page and all others.'
        : 'Head code box was empty — nothing injected.', code.trim() ? 'success' : 'info');
    });

    $('#headcode-clear').addEventListener('click', function () {
      ta.value = '';
      $('#headcode-chars').textContent = '0';
      store.remove(KEYS.headCode);
      applyHeadCodeFromStore(); // strips previously injected nodes
      updateHeadCodeStatus();
      toast('Custom head code removed from all pages.', 'info');
      ta.focus();
    });
  }

  function updateHeadCodeStatus() {
    var status = $('#headcode-status');
    var txt = $('#headcode-status-text');
    if (!status || !txt) { return; }
    var code = getHeadCode();
    if (code.trim()) {
      status.classList.add('is-active');
      txt.textContent = 'Active — ' + code.length.toLocaleString('en-US') + ' characters injected before </head> on every page.';
    } else {
      status.classList.remove('is-active');
      txt.textContent = 'No custom code saved yet.';
    }
  }

  function openHeadCodeModal() {
    buildHeadCodeModal();
    var modal = $('#headcode-modal');
    if (!modal || modal.classList.contains('open')) { return; }
    var ta = $('#headcode-input', modal);
    ta.value = getHeadCode();
    $('#headcode-chars').textContent = String(ta.value.length);
    updateHeadCodeStatus();
    modal.classList.add('open');
    lockScroll(true);
    var closeBtn = modal.querySelector('.modal__close');
    if (closeBtn) { closeBtn.focus(); }
    var release = trapFocus(modal);
    setLayer('headcode', function () {
      modal.classList.remove('open');
      lockScroll(false);
      release();
      clearLayer('headcode');
    });
  }

  function closeHeadCodeModal() {
    var modal = $('#headcode-modal');
    if (!modal || !modal.classList.contains('open')) { return; }
    if (openLayer && openLayer.name === 'headcode') { openLayer.close(); }
  }

  function buildFooter() {
    var root = $('#footer-root');
    if (!root) { return; }
    var year = new Date().getFullYear();
    root.innerHTML =
      '<footer class="site-footer" id="contact">' +
      '  <div class="container">' +
      '    <div class="footer-grid">' +
      '      <div class="footer-col footer-brand">' +
      '        <a class="brand" href="index.html" aria-label="STRIDE Sports — home">' + BRAND_SVG + '<span class="brand__name">STRIDE<em>.</em></span></a>' +
      '        <p class="footer-about">Premium sports equipment for athletes of every level. Gear up with vetted brands, free shipping over $75, and pay on delivery — because trust should arrive with your order.</p>' +
      '        <div class="footer-social">' +
      '          <a class="social-link" href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="STRIDE on Instagram">' + icon('instagram', 18) + '</a>' +
      '          <a class="social-link" href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="STRIDE on Facebook">' + icon('facebook', 18) + '</a>' +
      '          <a class="social-link" href="https://youtube.com" target="_blank" rel="noopener noreferrer" aria-label="STRIDE on YouTube">' + icon('youtube', 18) + '</a>' +
      '          <a class="social-link" href="https://x.com" target="_blank" rel="noopener noreferrer" aria-label="STRIDE on X">' + icon('xsocial', 18) + '</a>' +
      '        </div>' +
      '      </div>' +
      '      <div class="footer-col">' +
      '        <h4>Shop</h4>' +
      '        <ul>' + D.home.categories.map(function (c) {
          return '<li><a href="' + c.href + '">' + escapeHTML(c.name) + '</a></li>';
        }).join('') +
      '          <li><a href="index.html#featured">All Products</a></li>' +
      '        </ul>' +
      '      </div>' +
      '      <div class="footer-col">' +
      '        <h4>Help</h4>' +
      '        <ul>' +
      '          <li><button type="button" data-policy="shipping">Shipping Policy</button></li>' +
      '          <li><button type="button" data-policy="returns">Returns &amp; Exchanges</button></li>' +
      '          <li><button type="button" data-policy="faq">FAQ</button></li>' +
      '          <li><button type="button" data-policy="warranty">Warranty</button></li>' +
      '        </ul>' +
      '      </div>' +
      '      <div class="footer-col">' +
      '        <h4>Contact</h4>' +
      '        <ul class="footer-contact">' +
      '          <li>' + icon('pin', 16) + '<span>4200 Velocity Ave, Suite 12<br>Austin, TX 78701</span></li>' +
      '          <li>' + icon('phone', 16) + '<span><a href="tel:+18005550199">+1 (800) 555-0199</a><br>Mon–Fri, 8am–6pm CT</span></li>' +
      '          <li>' + icon('mail', 16) + '<span><a href="mailto:support@stridesports.example">support@stridesports.example</a></span></li>' +
      '        </ul>' +
      '        <div class="footer-pay">' +
      '          <span class="pay-badge">VISA</span><span class="pay-badge">MASTERCARD</span><span class="pay-badge">AMEX</span><span class="pay-badge pay-badge--cod">CASH ON DELIVERY</span>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <div class="footer-bottom">' +
      '      <span>© ' + year + ' STRIDE Sports Co. All rights reserved.</span>' +
      '      <span class="legal-links">' +
      '        <button type="button" data-policy="shipping">Shipping</button>' +
      '        <button type="button" data-policy="returns">Returns</button>' +
      '        <button type="button" data-policy="faq">FAQ</button>' +
      '      </span>' +
      '    </div>' +
      '  </div>' +
      '</footer>' +
      '<button type="button" class="back-top" id="back-top" aria-label="Back to top">' + icon('arrowUp', 20) + '</button>';

    root.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-policy]');
      if (btn) { openPolicy(btn.getAttribute('data-policy')); }
      if (e.target.closest('#back-top')) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  /* ==========================================================
     9. CART STATE
     Line item uniqueness = product id + color + size.
     ========================================================== */
  function getCart() {
    var cart = store.get(KEYS.cart, []);
    if (!Array.isArray(cart)) { return []; }
    // Prune lines whose product no longer exists in the catalog
    return cart.filter(function (line) { return !!D.findProduct(line.productId); });
  }

  function saveCart(cart) { store.set(KEYS.cart, cart); }

  function lineKey(productId, color, size) {
    return productId + '|' + (color || '') + '|' + (size || '');
  }

  function cartCount() {
    return getCart().reduce(function (n, l) { return n + l.qty; }, 0);
  }

  function cartSubtotal() {
    return getCart().reduce(function (n, l) { return n + l.unitPrice * l.qty; }, 0);
  }

  function lineUnitPrice(p, size) {
    if (p.sizePrices && size && Object.prototype.hasOwnProperty.call(p.sizePrices, size)) {
      return p.sizePrices[size];
    }
    return p.price;
  }

  /* Add to cart. options: { color, size, qty, unitPrice, silent } */
  function addToCart(productId, options) {
    options = options || {};
    var p = D.findProduct(productId);
    if (!p) { toast('Sorry, that product could not be found.', 'error'); return null; }
    if (p.stockStatus === 'Out of Stock' || p.stockQty <= 0) {
      toast('This item is currently out of stock.', 'error');
      return null;
    }
    var color = options.color || (p.colors[0] ? p.colors[0].name : '');
    var size = options.size || (p.sizes && p.sizes[0] ? p.sizes[0] : '');
    var qty = Math.max(1, parseInt(options.qty, 10) || 1);
    var cart = getCart();
    var key = lineKey(productId, color, size);
    var existing = cart.filter(function (l) { return l.key === key; })[0];
    var newQty = (existing ? existing.qty : 0) + qty;
    var clamped = false;
    if (newQty > p.stockQty) { newQty = p.stockQty; clamped = true; }
    if (newQty <= 0) { toast('This item is currently out of stock.', 'error'); return null; }

    if (existing) { existing.qty = newQty; }
    else {
      cart.push({
        key: key,
        productId: productId,
        color: color,
        size: size,
        qty: newQty,
        unitPrice: options.unitPrice != null ? options.unitPrice : lineUnitPrice(p, size),
        addedAt: Date.now()
      });
    }
    saveCart(cart);
    updateBadges(true);

    if (clamped) { toast('Only ' + p.stockQty + ' available — adjusted your quantity.', 'info'); }
    else if (!options.silent) {
      var desc = [color, size].filter(Boolean).join(' · ');
      toast('Added to cart: ' + p.name + (desc ? ' (' + desc + ')' : ''), 'success');
    }
    if (typeof openLayer !== 'undefined' && openLayer && openLayer.name === 'cart') { renderCartDrawer(); }
    return key;
  }

  function setLineQty(key, qty) {
    var cart = getCart();
    var line = cart.filter(function (l) { return l.key === key; })[0];
    if (!line) { return; }
    var p = D.findProduct(line.productId);
    var max = p ? p.stockQty : 99;
    qty = clamp(parseInt(qty, 10) || 0, 0, max);
    if (qty <= 0) { removeLine(key, true); return; }
    line.qty = qty;
    saveCart(cart);
    updateBadges(false);
    renderCartDrawer();
    if (document.body.getAttribute('data-page') === 'checkout' && typeof window.STRIDE_CHECKOUT_SYNC === 'function') {
      window.STRIDE_CHECKOUT_SYNC();
    }
  }

  function removeLine(key, keepToast) {
    var cart = getCart();
    var line = cart.filter(function (l) { return l.key === key; })[0];
    cart = cart.filter(function (l) { return l.key !== key; });
    saveCart(cart);
    updateBadges(false);
    renderCartDrawer();
    if (!keepToast && line) {
      var p = D.findProduct(line.productId);
      toast('Removed from cart: ' + (p ? p.name : 'item'), 'info');
    }
    if (document.body.getAttribute('data-page') === 'checkout' && typeof window.STRIDE_CHECKOUT_SYNC === 'function') {
      window.STRIDE_CHECKOUT_SYNC();
    }
  }

  function clearCart() {
    store.remove(KEYS.cart);
    updateBadges(false);
    renderCartDrawer();
  }

  /* ==========================================================
     10. PROMO CODES
     ========================================================== */
  function getPromo() { return store.get(KEYS.promo, null); }

  function applyPromo(code, silent) {
    var clean = String(code || '').trim().toUpperCase();
    if (!clean) { return { ok: false, msg: 'Enter a promo code first.' }; }
    if (!CFG.promoCodes[clean]) {
      return { ok: false, msg: '“' + clean + '” is not a valid promo code.' };
    }
    store.set(KEYS.promo, { code: clean });
    if (!silent) { toast('Promo applied: ' + CFG.promoCodes[clean].label, 'success'); }
    renderCartDrawer();
    if (document.body.getAttribute('data-page') === 'checkout' && typeof window.STRIDE_CHECKOUT_SYNC === 'function') {
      window.STRIDE_CHECKOUT_SYNC();
    }
    return { ok: true, msg: CFG.promoCodes[clean].label };
  }

  function removePromo(silent) {
    store.remove(KEYS.promo);
    if (!silent) { toast('Promo code removed.', 'info'); }
    renderCartDrawer();
    if (document.body.getAttribute('data-page') === 'checkout' && typeof window.STRIDE_CHECKOUT_SYNC === 'function') {
      window.STRIDE_CHECKOUT_SYNC();
    }
  }

  function discountFor(subtotal) {
    var promo = getPromo();
    if (!promo || !CFG.promoCodes[promo.code]) { return 0; }
    var pc = CFG.promoCodes[promo.code];
    return pc.type === 'percent' ? subtotal * (pc.value / 100) : 0;
  }

  /* ==========================================================
     11. BADGES
     ========================================================== */
  function updateBadges(pop) {
    var count = cartCount();
    var badge = $('#cart-badge');
    if (badge) {
      badge.hidden = count === 0;
      badge.textContent = count > 99 ? '99+' : String(count);
      if (pop && count > 0) {
        badge.classList.remove('pop');
        void badge.offsetWidth;
        badge.classList.add('pop');
      }
      var cartBtn = $('#cart-btn');
      if (cartBtn) { cartBtn.setAttribute('aria-label', 'Open shopping cart, ' + count + ' item' + (count === 1 ? '' : 's')); }
    }
    var wl = getWishlist();
    var wBadge = $('#wishlist-badge');
    if (wBadge) {
      wBadge.hidden = wl.length === 0;
      wBadge.textContent = String(wl.length);
    }
  }

  /* ==========================================================
     12. DRAWERS (cart + wishlist) & MOBILE NAV
     ========================================================== */
  function freeShipProgressHTML(subtotalAfterDiscount) {
    var remaining = CFG.freeShipThreshold - subtotalAfterDiscount;
    var pct = clamp(Math.round((subtotalAfterDiscount / CFG.freeShipThreshold) * 100), 0, 100);
    var done = remaining <= 0;
    var text = done
      ? icon('check', 15) + ' You\'ve unlocked <b>FREE shipping</b>!'
      : 'You\'re <b>' + formatCurrency(Math.max(0, remaining)) + '</b> away from free shipping';
    return '<div class="ship-progress">' +
      '<p class="ship-progress__text">' + text + '</p>' +
      '<div class="ship-progress__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="Progress toward free shipping">' +
      '<div class="ship-progress__fill' + (done ? ' done' : '') + '" style="width:' + pct + '%"></div>' +
      '</div></div>';
  }

  function buildDrawerRoots() {
    var root = $('#drawer-root');
    if (!root) { return; }
    root.innerHTML =
      '<aside class="drawer drawer--right" id="cart-drawer" role="dialog" aria-modal="true" aria-label="Shopping cart" hidden>' +
      '  <div class="drawer__head"><h2 class="drawer__title">Your Cart <span class="drawer__count" id="drawer-count">0</span></h2>' +
      '    <button type="button" class="drawer__close" data-close-drawer aria-label="Close cart">' + icon('x', 20) + '</button></div>' +
      '  <div class="drawer__body" id="cart-body"></div>' +
      '  <div class="drawer__foot" id="cart-foot"></div>' +
      '</aside>' +
      '<aside class="drawer drawer--right" id="wishlist-drawer" role="dialog" aria-modal="true" aria-label="Wishlist" hidden>' +
      '  <div class="drawer__head"><h2 class="drawer__title">Wishlist <span class="drawer__count" id="wishlist-count">0</span></h2>' +
      '    <button type="button" class="drawer__close" data-close-drawer aria-label="Close wishlist">' + icon('x', 20) + '</button></div>' +
      '  <div class="drawer__body" id="wishlist-body"></div>' +
      '</aside>' +
      '<nav class="drawer drawer--left" id="mobile-nav" role="dialog" aria-modal="true" aria-label="Mobile menu" hidden>' +
      '  <div class="drawer__head"><span class="brand">' + BRAND_SVG + '<span class="brand__name">STRIDE<em>.</em></span></span>' +
      '    <button type="button" class="drawer__close" data-close-drawer aria-label="Close menu">' + icon('x', 20) + '</button></div>' +
      '  <div class="drawer__body"><ul class="nav-list" style="display:grid;gap:4px;list-style:none">' +
      '    <li><a class="nav-link" style="display:flex" href="index.html">Home</a></li>' +
      '    <li><a class="nav-link" style="display:flex" href="index.html#featured">Shop</a></li>' +
      '    <li style="padding:10px 13px 4px;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--c-muted)">Categories</li>' +
      D.home.categories.map(function (c) {
        return '<li><a class="nav-link" style="display:flex" href="' + c.href + '">' + escapeHTML(c.name) + '</a></li>';
      }).join('') +
      '    <li><a class="nav-link" style="display:flex" href="index.html#about">About</a></li>' +
      '    <li><a class="nav-link" style="display:flex" href="index.html#contact">Contact</a></li>' +
      '  </ul></div>' +
      '</nav>';

    // Delegate close buttons + qty/remove + promo inside drawers
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-close-drawer]')) { closeAllDrawers(); return; }
      var act = e.target.closest('[data-act]');
      if (act) {
        var actName = act.getAttribute('data-act');
        var key = act.getAttribute('data-key');
        if (actName === 'inc') {
          var line = getCart().filter(function (l) { return l.key === key; })[0];
          if (line) { setLineQty(key, line.qty + 1); }
        } else if (actName === 'dec') {
          var line2 = getCart().filter(function (l) { return l.key === key; })[0];
          if (line2) { setLineQty(key, line2.qty - 1); }
        } else if (actName === 'remove') {
          removeLine(key);
        } else if (actName === 'wish-remove') {
          toggleWishlist(key, true);
        } else if (actName === 'wish-add-cart') {
          var p = D.findProduct(key);
          if (p) { addToCart(p.id, {}); }
        }
        return;
      }
      if (e.target.closest('#promo-apply')) {
        var input = $('#promo-input');
        var res = applyPromo(input ? input.value : '');
        var msg = $('#promo-msg');
        if (msg) {
          msg.textContent = res.msg;
          msg.className = 'promo-msg ' + (res.ok ? 'ok' : 'err');
        }
        if (!res.ok && input) { input.focus(); }
      }
      if (e.target.closest('#promo-remove')) { removePromo(); }
    });
  }

  function openDrawer(el, onKeydownRelease) {
    el.hidden = false;
    requestAnimationFrame(function () { el.classList.add('open'); });
    showOverlay();
    lockScroll(true);
    var release = trapFocus(el);
    var first = el.querySelector(FOCUS_SEL);
    if (first) { first.focus(); }
    setLayer(el.id, function () {
      el.classList.remove('open');
      release();
      if (onKeydownRelease) { onKeydownRelease(); }
      setTimeout(function () { el.hidden = true; }, 290);
      if (!$all('.drawer.open').length) { hideOverlay(); lockScroll(false); }
      clearLayer(el.id);
    });
  }

  function closeAllDrawers() {
    if (openLayer) { openLayer.close(); }
  }

  function renderCartDrawer() {
    var body = $('#cart-body');
    var foot = $('#cart-foot');
    var countEl = $('#drawer-count');
    if (!body || !foot) { return; }
    var cart = getCart();
    if (countEl) { countEl.textContent = String(cartCount()); }

    if (!cart.length) {
      body.innerHTML = '<div class="cart-empty">' + icon('cart', 56) +
        '<h3>Your cart is empty</h3><p>Load up on gear — your next personal record is waiting.</p>' +
        '<a class="btn btn--primary" href="index.html#featured">Browse products</a></div>';
      foot.innerHTML = '';
      return;
    }

    var rows = cart.map(function (l) {
      var p = D.findProduct(l.productId);
      if (!p) { return ''; }
      var meta = [l.color, l.size].filter(Boolean).join(' · ');
      var max = p.stockQty;
      return '<div class="cart-line">' +
        '<a href="product-' + p.id.slice(1) + '.html" tabindex="-1" aria-hidden="true">' + imgTag(p.images[0], p.name, 76, 76) + '</a>' +
        '<div>' +
        '  <a class="cart-line__name" href="product-' + p.id.slice(1) + '.html">' + escapeHTML(p.name) + '</a>' +
        '  <p class="cart-line__meta">' + escapeHTML(meta) + (meta ? ' · ' : '') + formatCurrency(l.unitPrice) + ' each</p>' +
        '  <div class="cart-line__row">' +
        '    <span class="qty">' +
        '      <button type="button" class="qty__btn" data-act="dec" data-key="' + escapeHTML(l.key) + '" aria-label="Decrease quantity"' + (l.qty <= 1 ? ' disabled' : '') + '>' + icon('minus', 14) + '</button>' +
        '      <span class="qty__value" aria-live="polite">' + l.qty + '</span>' +
        '      <button type="button" class="qty__btn" data-act="inc" data-key="' + escapeHTML(l.key) + '" aria-label="Increase quantity"' + (l.qty >= max ? ' disabled' : '') + '>' + icon('plus', 14) + '</button>' +
        '    </span>' +
        '    <span class="cart-line__price">' + formatCurrency(l.unitPrice * l.qty) + '</span>' +
        '    <button type="button" class="cart-line__remove" data-act="remove" data-key="' + escapeHTML(l.key) + '" aria-label="Remove ' + escapeHTML(p.name) + ' from cart">' + icon('trash', 16) + '</button>' +
        '  </div>' +
        '</div></div>';
    }).join('');

    body.innerHTML = freeShipProgressHTML(cartSubtotal() - discountFor(cartSubtotal())) + rows;

    var subtotal = cartSubtotal();
    var discount = discountFor(subtotal);
    var est = computeShipping(subtotal - discount, null);
    var promo = getPromo();
    var promoValid = promo && CFG.promoCodes[promo.code];

    foot.innerHTML =
      (promoValid
        ? '<div class="drawer-totals" style="margin-top:12px"><div class="drawer-totals__row discount"><span>Promo ' + escapeHTML(promo.code) + ' (' + escapeHTML(CFG.promoCodes[promo.code].label) + ')</span><span>−' + formatCurrency(discount) + ' <button type="button" id="promo-remove" class="remove-promo">remove</button></span></div></div>'
        : '<div class="promo-row"><label class="sr-only" for="promo-input">Promo code</label>' +
          '<input type="text" id="promo-input" placeholder="Promo code (try SPORT10)" aria-describedby="promo-msg">' +
          '<button type="button" class="btn btn--dark btn--sm" id="promo-apply">Apply</button></div>' +
          '<p class="promo-msg" id="promo-msg" role="status"></p>') +
      '<div class="drawer-totals">' +
      '  <div class="drawer-totals__row"><span>Subtotal</span><span>' + formatCurrency(subtotal) + '</span></div>' +
      (discount > 0 ? '<div class="drawer-totals__row discount"><span>Discount</span><span>−' + formatCurrency(discount) + '</span></div>' : '') +
      '  <div class="drawer-totals__row"><span>Estimated shipping</span><span>' + (est.free ? '<span class="free">FREE</span>' : formatCurrency(est.cost)) + '</span></div>' +
      '  <div class="drawer-totals__row"><span style="font-size:12px">Taxes calculated at checkout</span><span></span></div>' +
      '  <div class="drawer-totals__row total"><span>Total (est.)</span><span>' + formatCurrency(subtotal - discount + est.cost) + '</span></div>' +
      '</div>' +
      '<div class="drawer__actions">' +
      '  <a class="btn btn--primary btn--block" href="checkout.html">Proceed to Checkout</a>' +
      '  <button type="button" class="btn btn--outline btn--block" data-close-drawer>Continue shopping</button>' +
      '</div>';
  }

  function openCartDrawer() {
    var el = $('#cart-drawer');
    if (!el) { return; }
    renderCartDrawer();
    openDrawer(el);
  }

  /* ---------- Wishlist ---------- */
  function getWishlist() {
    var w = store.get(KEYS.wishlist, []);
    return Array.isArray(w) ? w.filter(function (id) { return !!D.findProduct(id); }) : [];
  }

  function isWishlisted(id) { return getWishlist().indexOf(id) !== -1; }

  function toggleWishlist(id, forceRemove) {
    var w = getWishlist();
    var idx = w.indexOf(id);
    var p = D.findProduct(id);
    if (idx !== -1) {
      w.splice(idx, 1);
      store.set(KEYS.wishlist, w);
      toast('Removed from wishlist: ' + (p ? p.name : 'item'), 'info');
    } else if (!forceRemove) {
      w.push(id);
      store.set(KEYS.wishlist, w);
      toast('Saved to wishlist: ' + (p ? p.name : 'item'), 'success');
    }
    updateBadges(false);
    $all('[data-wish-id]').forEach(function (btn) {
      var active = isWishlisted(btn.getAttribute('data-wish-id'));
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
    if (openLayer && openLayer.name === 'wishlist') { renderWishlistDrawer(); }
  }

  function renderWishlistDrawer() {
    var body = $('#wishlist-body');
    var countEl = $('#wishlist-count');
    if (!body) { return; }
    var w = getWishlist();
    if (countEl) { countEl.textContent = String(w.length); }
    if (!w.length) {
      body.innerHTML = '<div class="cart-empty">' + icon('heart', 56) +
        '<h3>Your wishlist is empty</h3><p>Tap the heart on any product to save it for later.</p>' +
        '<a class="btn btn--primary" href="index.html#featured">Browse products</a></div>';
      return;
    }
    body.innerHTML = w.map(function (id) {
      var p = D.findProduct(id);
      if (!p) { return ''; }
      return '<div class="cart-line">' +
        '<a href="product-' + p.id.slice(1) + '.html" tabindex="-1" aria-hidden="true">' + imgTag(p.images[0], p.name, 76, 76) + '</a>' +
        '<div>' +
        '  <a class="cart-line__name" href="product-' + p.id.slice(1) + '.html">' + escapeHTML(p.name) + '</a>' +
        '  <p class="cart-line__meta">' + escapeHTML(p.brand) + ' · ' + formatCurrency(p.price) + '</p>' +
        '  <div class="cart-line__row">' +
        '    <button type="button" class="btn btn--dark btn--sm" data-act="wish-add-cart" data-key="' + p.id + '"' + (p.stockStatus === 'Out of Stock' ? ' disabled' : '') + '>Add to cart</button>' +
        '    <button type="button" class="cart-line__remove" data-act="wish-remove" data-key="' + p.id + '" aria-label="Remove ' + escapeHTML(p.name) + ' from wishlist">' + icon('trash', 16) + '</button>' +
        '  </div>' +
        '</div></div>';
    }).join('');
  }

  function openWishlistDrawer() {
    var el = $('#wishlist-drawer');
    if (!el) { return; }
    renderWishlistDrawer();
    openDrawer(el);
  }

  /* ==========================================================
     13. PRODUCT CARD FACTORY (home grid + related items)
     ========================================================== */
  function productCardHTML(p, opts) {
    opts = opts || {};
    var hoverImg = p.galleryImages && p.galleryImages[0] ? p.galleryImages[0] : null;
    var badge = p.badge
      ? '<span class="badge ' + (p.badge === 'New' ? 'badge--new' : (p.badge === 'Best Seller' ? 'badge--best' : (p.badge.indexOf('%') !== -1 ? 'badge--sale' : 'badge--pick'))) + '">' + escapeHTML(p.badge) + '</span>'
      : '';
    var oos = p.stockStatus === 'Out of Stock';
    var swatches = p.colors.map(function (c, i) {
      return '<span class="swatch' + (i === 0 ? ' swatch--active' : '') + '" style="background:' + c.hex + '" title="' + escapeHTML(c.name) + '"></span>';
    }).join('');
    var wished = isWishlisted(p.id);
    return '<article class="card reveal" data-product-card="' + p.id + '">' +
      '<div class="card__media">' +
      '  ' + badge +
      '  <button type="button" class="card__wish' + (wished ? ' is-active' : '') + '" data-wish-id="' + p.id + '" aria-pressed="' + wished + '" aria-label="Toggle wishlist for ' + escapeHTML(p.name) + '">' + icon('heart', 18) + '</button>' +
      '  <a class="card__media-link" href="product-' + p.id.slice(1) + '.html" aria-label="View ' + escapeHTML(p.name) + '">' +
      '    ' + imgTag(p.images[0], p.name + ' — main view', 800, 800, opts.eager) +
      (hoverImg ? imgTag(hoverImg, p.name + ' — alternate view', 800, 800) : '') +
      '  </a>' +
      (oos ? '<div class="card__oos"><span>Out of Stock</span></div>' : '') +
      '</div>' +
      '<div class="card__body">' +
      '  <span class="card__cat">' + escapeHTML(p.category) + '</span>' +
      '  <h3 class="card__name"><a href="product-' + p.id.slice(1) + '.html">' + escapeHTML(p.name) + '</a></h3>' +
      '  <span class="rating-line">' + starsHTML(p.rating) + '<span><strong>' + p.rating.toFixed(1) + '</strong> (' + p.reviewCount + ')</span></span>' +
      '  <div class="card__swatches" aria-hidden="true">' + swatches + '</div>' +
      '  <div class="card__foot"><span class="price">' +
      '    <span class="price__current">' + formatCurrency(p.price) + '</span>' +
      (p.oldPrice ? '<span class="price__old">' + formatCurrency(p.oldPrice) + '</span>' : '') +
      '  </span></div>' +
      '  <button type="button" class="card__add" data-quick-add="' + p.id + '"' + (oos ? ' disabled' : '') + '>' +
      (oos ? 'Out of Stock' : icon('cart', 17) + 'Add to Cart') +
      '  </button>' +
      '</div></article>';
  }

  /* ==========================================================
     14. HOMEPAGE RENDERING
     ========================================================== */
  function initHomePage() {
    /* Category tiles */
    var catGrid = $('#category-grid');
    if (catGrid) {
      catGrid.innerHTML = D.home.categories.map(function (c, i) {
        return '<a class="cat-card reveal" href="' + c.href + '" style="transition-delay:' + (i * 60) + 'ms">' +
          imgTag(c.image, c.name + ' category', 600, 640) +
          '<span class="cat-card__label">' + escapeHTML(c.name) + icon('arrowRight', 16) + '</span></a>';
      }).join('');
    }

    /* Featured grid — skeleton shimmer first, then render */
    var grid = $('#featured-grid');
    if (grid) {
      var skeleton = '';
      for (var i = 0; i < 6; i++) {
        skeleton += '<div class="skel-card skel">' +
          '<div class="skel-img"></div><div class="skel-line"></div><div class="skel-line short"></div></div>';
      }
      grid.innerHTML = skeleton;
      // Simulated async catalog fetch; data is local so this stays fast
      setTimeout(function () {
        grid.className = 'product-grid';
        grid.innerHTML = D.products.map(function (p, idx) {
          return productCardHTML(p, { eager: idx < 3 });
        }).join('');
        initReveal();
      }, 320);
    }

    /* Quick add + wishlist delegation (works for dynamically rendered cards) */
    document.addEventListener('click', function (e) {
      var add = e.target.closest('[data-quick-add]');
      if (add && !add.disabled) {
        addToCart(add.getAttribute('data-quick-add'), {});
        return;
      }
      var wish = e.target.closest('[data-wish-id]');
      if (wish) {
        e.preventDefault();
        toggleWishlist(wish.getAttribute('data-wish-id'));
      }
    });

    /* Promo countdown — mid-season sale end */
    var cd = $('#countdown');
    if (cd) {
      var target = new Date('2026-11-15T23:59:59');
      var cells = { d: $('[data-cd="d"]', cd), h: $('[data-cd="h"]', cd), m: $('[data-cd="m"]', cd), s: $('[data-cd="s"]', cd) };
      function pad(n) { return String(n).padStart(2, '0'); }
      function tick() {
        var diff = target - new Date();
        if (diff <= 0) {
          var note = $('#countdown-note');
          if (note) { note.textContent = 'Sale extended — limited time only!'; }
          return;
        }
        var d = Math.floor(diff / 86400000);
        var h = Math.floor((diff % 86400000) / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);
        if (cells.d) { cells.d.textContent = pad(d); }
        if (cells.h) { cells.h.textContent = pad(h); }
        if (cells.m) { cells.m.textContent = pad(m); }
        if (cells.s) { cells.s.textContent = pad(s); }
      }
      tick();
      setInterval(tick, 1000);
    }

    /* Testimonials */
    var tGrid = $('#testimonials-grid');
    if (tGrid) {
      tGrid.innerHTML = D.home.testimonials.map(function (t, i) {
        return '<article class="testi-card reveal" style="transition-delay:' + (i * 70) + 'ms">' +
          '<span class="rating-line">' + starsHTML(t.rating) + '</span>' +
          '<p class="testi-card__quote">' + escapeHTML(t.quote) + '</p>' +
          '<div class="testi-card__who">' + imgTag(t.avatar, 'Photo of ' + t.name, 96, 96) +
          '<span><b>' + escapeHTML(t.name) + '</b><span>' + escapeHTML(t.detail) + '</span></span></div>' +
          '</article>';
      }).join('');
    }

    /* Newsletter */
    var form = $('#newsletter-form');
    if (form) {
      var input = $('#newsletter-email');
      var msg = $('#newsletter-msg');
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = (input.value || '').trim();
        var ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
        if (!ok) {
          input.classList.add('invalid');
          msg.textContent = 'Please enter a valid email address.';
          msg.className = 'newsletter__msg err';
          input.focus();
          return;
        }
        input.classList.remove('invalid');
        store.set('sportcart_newsletter_v1', { email: v, at: Date.now() });
        form.hidden = true;
        msg.textContent = 'Check your inbox! Welcome offer sent to ' + v + '.';
        msg.className = 'newsletter__msg ok';
        toast('Subscribed successfully — check your inbox!', 'success');
      });
      input.addEventListener('input', function () { input.classList.remove('invalid'); });
    }
  }

  /* ==========================================================
     15. GLOBAL WIRING + INIT
     ========================================================== */
  function initHeaderActions() {
    var cartBtn = $('#cart-btn');
    if (cartBtn) { cartBtn.addEventListener('click', openCartDrawer); }
    var wishBtn = $('#wishlist-btn');
    if (wishBtn) { wishBtn.addEventListener('click', openWishlistDrawer); }

    var burger = $('#hamburger');
    var nav = $('#mobile-nav');
    if (burger && nav) {
      burger.addEventListener('click', function () {
        burger.setAttribute('aria-expanded', 'true');
        openDrawer(nav, function () {
          burger.setAttribute('aria-expanded', 'false');
        });
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) { closeAllDrawers(); } // close menu after item click
      });
    }

    // Overlay click closes whatever layer is open
    document.addEventListener('click', function (e) {
      if (e.target.id === 'site-overlay' && openLayer) { openLayer.close(); }
    });

    // Delegated policy links anywhere on the page (footer, checkout terms, etc.)
    document.addEventListener('click', function (e) {
      var pol = e.target.closest('[data-policy]');
      if (pol) { openPolicy(pol.getAttribute('data-policy')); }
    });

    // Delegated Add to Cart for product-page related items & buy boxes
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-related-add]');
      if (btn && !btn.disabled) {
        addToCart(btn.getAttribute('data-related-add'), {});
      }
    });
  }

  function init() {
    buildAnnouncement();
    buildHeader();
    buildDrawerRoots();
    buildPolicyModal();
    buildFooter();
    initHeaderActions();
    updateBadges(false);
    var page = document.body.getAttribute('data-page');
    if (page === 'home') { initHomePage(); }
    initReveal();

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Sync badges across tabs (storage event fires in other tabs)
    window.addEventListener('storage', function (e) {
      if (e.key === KEYS.cart || e.key === KEYS.wishlist) { updateBadges(false); }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ==========================================================
     16. PUBLIC API for product.js / checkout.js
     ========================================================== */
  window.STRIDE = {
    /* utils */
    $: $, $all: $all, escapeHTML: escapeHTML, formatCurrency: formatCurrency,
    debounce: debounce, clamp: clamp, toast: toast, icon: icon, starsHTML: starsHTML,
    imgTag: imgTag, FALLBACK_IMG: FALLBACK_IMG,
    addBusinessDays: addBusinessDays, deliveryEstimate: deliveryEstimate,
    formatDate: formatDate, computeShipping: computeShipping, taxRateFor: taxRateFor,
    trapFocus: trapFocus, FOCUS_SEL: FOCUS_SEL, lockScroll: lockScroll,
    setLayer: setLayer, clearLayer: clearLayer,
    /* commerce */
    store: store, KEYS: KEYS, CFG: CFG,
    getCart: getCart, saveCart: saveCart, cartCount: cartCount, cartSubtotal: cartSubtotal,
    addToCart: addToCart, setLineQty: setLineQty, removeLine: removeLine, clearCart: clearCart,
    lineKey: lineKey, lineUnitPrice: lineUnitPrice,
    getPromo: getPromo, applyPromo: applyPromo, removePromo: removePromo, discountFor: discountFor,
    updateBadges: updateBadges,
    getWishlist: getWishlist, isWishlisted: isWishlisted, toggleWishlist: toggleWishlist,
    openCartDrawer: openCartDrawer, closeAllDrawers: closeAllDrawers,
    productCardHTML: productCardHTML, openPolicy: openPolicy
  };
})();

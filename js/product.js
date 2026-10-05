/* ============================================================
   STRIDE Sports Co. — product.js
   Renders the product detail pages (product-1.html … product-6.html).
   Reads document.body[data-product-id] and builds:
   breadcrumbs • image gallery + lightbox • buy box (color/size/qty,
   stock, per-state shipping estimator) • tabs • detail images •
   specifications • related products • full review system
   (summary bars, filters, sort, helpful votes, write-a-review).
   Handles missing/invalid product IDs with a friendly 404 state.
   ============================================================ */
(function () {
  'use strict';

  var S = window.STRIDE;
  var D = window.STRIDE_DATA;
  var $ = S.$, $all = S.$all, esc = S.escapeHTML, ic = S.icon;

  var ROOT = document.getElementById('product-root');
  var PRODUCT = D.findProduct(document.body.getAttribute('data-product-id'));

  /* Shared state for the buy box */
  var state = {
    colorIndex: 0,
    size: null,
    qty: 1,
    stateCode: '',
    reviews: [],       // working review list (user reviews + seed reviews)
    filter: 'all',
    sort: 'recent',
    visible: 4
  };

  /* ==========================================================
     0. NOT FOUND (404 SAFETY)
     ========================================================== */
  function renderNotFound() {
    document.title = 'Product not found | STRIDE';
    ROOT.innerHTML =
      '<div class="container"><div class="no-order">' +
      ic('package', 64) +
      '<h2>Product not found</h2>' +
      '<p class="muted">The product you\'re looking for doesn\'t exist or is no longer available. Check the link, or head back to the shop to find your next favorite piece of gear.</p>' +
      '<a class="btn btn--primary" href="index.html#featured" style="margin-top:16px">Browse all products</a>' +
      '</div></div>';
  }

  if (!ROOT) { return; }
  if (!PRODUCT) { renderNotFound(); return; }

  /* ==========================================================
     1. HELPERS
     ========================================================== */
  function productHref(p) { return 'product-' + p.id.slice(1) + '.html'; }

  function starCount(rating) {
    return Math.round(Number(rating));
  }

  function priceFor() {
    return S.lineUnitPrice(PRODUCT, state.size);
  }

  function effectiveStock() {
    return PRODUCT.stockQty;
  }

  /* ==========================================================
     2. SKELETON → RENDER
     ========================================================== */
  ROOT.innerHTML =
    '<div class="container">' +
    '  <div class="breadcrumbs"><span class="skel" style="width:220px;height:14px"></span></div>' +
    '  <div class="pdp">' +
    '    <div class="skel" style="aspect-ratio:1/1;border-radius:18px"></div>' +
    '    <div style="display:grid;gap:14px;align-content:start">' +
    '      <span class="skel" style="width:40%;height:16px"></span>' +
    '      <span class="skel" style="width:75%;height:30px"></span>' +
    '      <span class="skel" style="width:30%;height:26px"></span>' +
    '      <span class="skel" style="width:100%;height:120px;border-radius:18px"></span>' +
    '      <span class="skel" style="width:55%;height:46px;border-radius:12px"></span>' +
    '    </div>' +
    '  </div>' +
    '</div>';

  /* Simulated async render; data is local so latency stays minimal */
  setTimeout(function () {
    loadUserReviews();
    renderAll();
    document.body.classList.add('has-buybar'); // toast offset on mobile
  }, 280);

  function loadUserReviews() {
    var saved = S.store.get(S.KEYS.userReviews, {});
    var mine = (saved && saved[PRODUCT.id]) || [];
    state.reviews = mine.concat(PRODUCT.reviews); // user reviews appear first (prepended)
  }

  function reviewCount() {
    return PRODUCT.reviewCount + countUserReviews();
  }

  function countUserReviews() {
    var saved = S.store.get(S.KEYS.userReviews, {});
    return (saved && saved[PRODUCT.id]) ? saved[PRODUCT.id].length : 0;
  }

  function avgRating() {
    if (!state.reviews.length) { return PRODUCT.rating; }
    var sum = state.reviews.reduce(function (a, r) { return a + r.rating; }, 0);
    return Math.round((sum / state.reviews.length) * 10) / 10;
  }

  /* ==========================================================
     3. RENDER ALL SECTIONS
     ========================================================== */
  function renderAll() {
    document.title = PRODUCT.name + ' | STRIDE';
    ROOT.innerHTML = ''; // remove loading skeleton
    renderBreadcrumbs();
    renderGallery();
    renderBuyBox();
    renderTabs();
    renderDetails();
    renderSpecs();
    renderRelated();
    renderReviews();
    renderMobileBar();
    fitBuyBox();
    // re-run reveal for newly injected sections
    observeNewReveals();
  }

  /* ------------------------------------------------------------
     Buy-box fit detection: when the sticky buy box's content fits the
     viewport, drop its max-height/overflow so it never becomes a wheel
     scroll container (which would swallow page scrolling while the
     cursor hovers the options). On short viewports the box keeps its
     internal scroll — and, with no `overscroll-behavior: contain`,
     still chains to the page once it reaches its end.
     ------------------------------------------------------------ */
  function fitBuyBox() {
    var bb = document.getElementById('buybox');
    if (!bb) { return; }
    bb.classList.remove('is-fit'); // restore CSS constraint for a clean measurement
    if (!window.matchMedia('(min-width: 1024px)').matches) { return; }
    if (bb.scrollHeight <= bb.clientHeight + 2) { bb.classList.add('is-fit'); }
  }

  var fitTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitBuyBox, 150); // debounce (fonts/layout settle)
  });
  window.addEventListener('load', fitBuyBox); // late content shifts (fonts, images)

  var revealObserver = null;
  function observeNewReveals() {
    var els = $all('.reveal:not(.is-visible)');
    if (!els.length) { return; }
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); revealObserver.unobserve(en.target); }
        });
      }, { threshold: 0.1 });
    }
    els.forEach(function (el) { revealObserver.observe(el); });
  }

  function renderBreadcrumbs() {
    ROOT.insertAdjacentHTML('afterbegin',
      '<nav class="breadcrumbs" aria-label="Breadcrumb">' +
      '<a href="index.html">Home</a><span class="bc-sep">/</span>' +
      '<a href="index.html#categories">' + esc(PRODUCT.category) + '</a><span class="bc-sep">/</span>' +
      '<span aria-current="page">' + esc(PRODUCT.name) + '</span>' +
      '</nav>');
  }

  /* ==========================================================
     4. GALLERY + LIGHTBOX
     ========================================================== */
  var lightbox = { el: null, list: [], index: 0, release: null };

  function buildLightbox() {
    if (lightbox.el) { return; }
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.id = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', 'Image viewer');
    lb.innerHTML =
      '<button type="button" class="lightbox__close" data-lb="close" aria-label="Close image viewer">' + ic('x', 20) + '</button>' +
      '<div class="lightbox__stage">' +
      '  <span class="lightbox__count" data-lb-count></span>' +
      '  <img class="lightbox__img" data-lb-img src="" alt="">' +
      '  <button type="button" class="lightbox__btn lightbox__btn--prev" data-lb="prev" aria-label="Previous image">' + ic('chevronLeft', 22) + '</button>' +
      '  <button type="button" class="lightbox__btn lightbox__btn--next" data-lb="next" aria-label="Next image">' + ic('chevronRight', 22) + '</button>' +
      '</div>';
    document.body.appendChild(lb);
    lightbox.el = lb;

    lb.addEventListener('click', function (e) {
      var act = e.target.closest('[data-lb]');
      if (act) {
        var a = act.getAttribute('data-lb');
        if (a === 'close') { closeLightbox(); }
        else if (a === 'prev') { stepLightbox(-1); }
        else if (a === 'next') { stepLightbox(1); }
        return;
      }
      if (e.target === lb) { closeLightbox(); } // click outside
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.el.classList.contains('open')) { return; }
      if (e.key === 'ArrowLeft') { stepLightbox(-1); }
      if (e.key === 'ArrowRight') { stepLightbox(1); }
    });
  }

  function openLightbox(list, index) {
    buildLightbox();
    lightbox.list = list;
    lightbox.index = S.clamp(index || 0, 0, list.length - 1);
    paintLightbox();
    lightbox.el.classList.add('open');
    S.lockScroll(true);
    lightbox.release = S.trapFocus(lightbox.el);
    S.setLayer('lightbox', closeLightbox);
    var btn = lightbox.el.querySelector('.lightbox__close');
    if (btn) { btn.focus(); }
  }

  function paintLightbox() {
    var item = lightbox.list[lightbox.index];
    var imgEl = lightbox.el.querySelector('[data-lb-img]');
    var countEl = lightbox.el.querySelector('[data-lb-count]');
    if (imgEl) { imgEl.src = item.src; imgEl.alt = item.alt || 'Product image'; }
    if (countEl) { countEl.textContent = (lightbox.index + 1) + ' / ' + lightbox.list.length; }
  }

  function stepLightbox(dir) {
    var n = lightbox.list.length;
    lightbox.index = (lightbox.index + dir + n) % n;
    paintLightbox();
  }

  function closeLightbox() {
    if (!lightbox.el || !lightbox.el.classList.contains('open')) { return; }
    lightbox.el.classList.remove('open');
    S.lockScroll(false);
    if (lightbox.release) { lightbox.release(); lightbox.release = null; }
    S.clearLayer('lightbox');
  }

  function galleryImagesList() {
    return (PRODUCT.galleryImages || []).map(function (src, i) {
      return { src: src, alt: PRODUCT.name + ' — view ' + (i + 1) };
    });
  }

  function renderGallery() {
    var imgs = galleryImagesList();
    var active = state.colorIndex % imgs.length;
    var html =
      '<section class="gallery" aria-label="Product images">' +
      '  <button type="button" class="gallery__main" id="gallery-main" aria-label="Open image zoom">' +
      '    <span id="gallery-main-img">' + S.imgTag(imgs[active].src, imgs[active].alt, 800, 800, true) + '</span>' +
      '    <span class="gallery__zoomhint">' + ic('zoom', 18) + '</span>' +
      '  </button>' +
      '  <div class="gallery__thumbs" id="gallery-thumbs" role="tablist" aria-label="Product image thumbnails">' +
      imgs.map(function (im, i) {
        return '<button type="button" class="gallery__thumb' + (i === active ? ' active' : '') + '" data-thumb="' + i + '" aria-label="Show image ' + (i + 1) + ' of ' + imgs.length + '" aria-selected="' + (i === active) + '">' +
          S.imgTag(im.src, im.alt, 152, 152) + '</button>';
      }).join('') +
      '  </div>' +
      '</section>';
    // Create the PDP grid as a self-contained fragment, then fill it:
    // insertAdjacentHTML auto-closes tags per fragment, so the grid wrapper
    // and the buy box must be injected as separate, balanced chunks.
    ROOT.insertAdjacentHTML('beforeend', '<div class="container"><div class="pdp" id="pdp-grid"></div></div>');
    var pdpGrid = document.getElementById('pdp-grid');
    pdpGrid.insertAdjacentHTML('beforeend', html);
    // gallery opened the .pdp grid; buy box appends below

    $('#gallery-main').addEventListener('click', function () { openLightbox(imgs, activeThumbIndex()); });
    $('#gallery-thumbs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-thumb]');
      if (!btn) { return; }
      setMainImage(parseInt(btn.getAttribute('data-thumb'), 10));
    });
  }

  function activeThumbIndex() {
    var t = $('#gallery-thumbs .gallery__thumb.active');
    return t ? parseInt(t.getAttribute('data-thumb'), 10) : 0;
  }

  function setMainImage(i) {
    var imgs = galleryImagesList();
    i = S.clamp(i, 0, imgs.length - 1);
    $('#gallery-main-img').innerHTML = S.imgTag(imgs[i].src, imgs[i].alt, 800, 800, true);
    $all('#gallery-thumbs .gallery__thumb').forEach(function (t, idx) {
      var on = idx === i;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', String(on));
    });
  }

  /* ==========================================================
     5. BUY BOX
     ========================================================== */
  function stockChipHTML() {
    var st = PRODUCT.stockStatus;
    var cls = st === 'In Stock' ? 'stock-chip--in' : (st === 'Low Stock' ? 'stock-chip--low' : 'stock-chip--out');
    return '<span class="stock-chip ' + cls + '">' + esc(st) + '</span>';
  }

  function renderBuyBox() {
    var p = PRODUCT;
    var disc = p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
    var sizes = p.sizes || [];
    if (!state.size && sizes.length) { state.size = sizes[0]; }

    var colorBtns = p.colors.map(function (c, i) {
      return '<button type="button" class="swatch-btn' + (i === state.colorIndex ? ' active' : '') + '" data-color="' + i + '" data-name="' + esc(c.name) + '" style="background:' + c.hex + '" aria-label="Color: ' + esc(c.name) + '" aria-pressed="' + (i === state.colorIndex) + '"></button>';
    }).join('');

    var sizeBtns = sizes.map(function (s) {
      return '<button type="button" class="size-btn' + (s === state.size ? ' active' : '') + '" data-size="' + esc(s) + '" aria-pressed="' + (s === state.size) + '">' + esc(s) + '</button>';
    }).join('');

    var oos = p.stockStatus === 'Out of Stock';

    var stateOptions = '<option value="">Select your state…</option>' + D.usStates.map(function (s) {
      return '<option value="' + s.code + '">' + esc(s.name) + '</option>';
    }).join('');

    var html =
      '<div class="buybox" id="buybox">' +
      '  <div>' +
      '    <span class="buybox__brand">' + esc(p.brand) + '</span>' +
      '    <h1 class="buybox__name">' + esc(p.name) + '</h1>' +
      '    <div class="buybox__meta-row" style="margin-bottom:10px">' +
      '      <a class="rating-line" href="#reviews" id="rating-link">' + S.starsHTML(p.rating) +
      '        <span><strong>' + p.rating.toFixed(1) + '</strong> · <span id="review-link-count">' + reviewCount() + '</span> reviews</span></a>' +
      '      <span class="buybox__sold">Sold: ' + p.soldUnits.toLocaleString('en-US') + ' units</span>' +
      '    </div>' +
      '    <div class="price-lg">' +
      '      <span class="price"><span class="price__current" id="bb-price">' + S.formatCurrency(priceFor()) + '</span>' +
      (p.oldPrice ? '<span class="price__old">' + S.formatCurrency(p.oldPrice) + '</span>' : '') + '</span>' +
      (disc > 0 ? '<span class="badge badge--sale">−' + disc + '%</span>' : '') +
      '    </div>' +
      '    <div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">' +
      stockChipHTML() +
      (p.stockStatus === 'Low Stock' ? '<span class="stock-note">Only ' + p.stockQty + ' left in stock</span>' : '') +
      '    </div>' +
      '  </div>' +

      (p.colors.length ? '<div class="opt-group"><span class="opt-label">Color: <span id="color-name">' + esc(p.colors[state.colorIndex].name) + '</span></span><div class="swatch-row" id="color-row">' + colorBtns + '</div></div>' : '') +
      (sizes.length ? '<div class="opt-group"><span class="opt-label">' + (p.category === 'Racket Sports' ? 'Grip size' : (p.category === 'Running' ? 'Size' : 'Option')) + ': <span id="size-name">' + esc(state.size) + '</span></span><div class="size-list" id="size-list">' + sizeBtns + '</div></div>' : '') +

      '  <div class="qty-row">' +
      '    <span class="qty qty--lg">' +
      '      <button type="button" class="qty__btn" id="qty-dec" aria-label="Decrease quantity"' + (state.qty <= 1 ? ' disabled' : '') + '>' + ic('minus', 16) + '</button>' +
      '      <span class="qty__value" id="qty-value" aria-live="polite">' + state.qty + '</span>' +
      '      <button type="button" class="qty__btn" id="qty-inc" aria-label="Increase quantity"' + (state.qty >= effectiveStock() || oos ? ' disabled' : '') + '>' + ic('plus', 16) + '</button>' +
      '    </span>' +
      '    <span class="stock-note" id="qty-max-note" hidden>Only ' + effectiveStock() + ' left</span>' +
      (oos ? '' : '<button type="button" class="wish-btn' + (S.isWishlisted(p.id) ? ' is-active' : '') + '" id="wish-toggle" data-wish-id="' + p.id + '" aria-pressed="' + S.isWishlisted(p.id) + '">' + ic('heart', 19) + ' Wishlist</button>') +
      '  </div>' +

      '  <div class="ship-block">' +
      '    <p class="ship-block__title">' + ic('truck', 18) + ' Ships in ' + p.shippingDays + ' business day' + (p.shippingDays > 1 ? 's' : '') + '</p>' +
      '    <div class="field" style="margin:0">' +
      '      <label for="ship-state">Delivery estimate by state</label>' +
      '      <select id="ship-state">' + stateOptions + '</select>' +
      '      <p class="field-error" id="ship-state-error">Please select your state for an accurate delivery estimate.</p>' +
      '    </div>' +
      '    <p class="ship-est" id="ship-est">Select your state to see the estimated delivery date and shipping cost. Default estimate: ' + S.formatDate(S.deliveryEstimate(null, p.shippingDays).minDate) + ' – ' + S.formatDate(S.deliveryEstimate(null, p.shippingDays).maxDate) + '.</p>' +
      '  </div>' +

      (oos
        ? '<div class="buy-actions"><button type="button" class="btn btn--dark btn--lg" disabled>Out of Stock</button><a class="btn btn--outline btn--lg" href="index.html#featured">Browse similar</a></div>'
        : '<div class="buy-actions">' +
      '    <button type="button" class="btn btn--primary btn--lg" id="add-to-cart">' + ic('cart', 19) + '<span class="btn__label-icon"></span>Add to Cart</button>' +
      '    <button type="button" class="btn btn--dark btn--lg" id="buy-now">Buy Now</button>' +
      '  </div>') +

      '  <div class="buybox__meta-row">' +
      '    <button type="button" class="share-btn" id="share-btn">' + ic('share', 19) + ' Share</button>' +
      '  </div>' +
      '  <div class="buybox__trust">' +
      '    <span class="trust-pill">' + ic('cash', 15) + ' Secure COD</span>' +
      '    <span class="trust-pill">' + ic('returns', 15) + ' Easy 30-day returns</span>' +
      '    <span class="trust-pill">' + ic('shield', 15) + ' ' + esc(p.specs['Warranty'] || '2-year warranty') + '</span>' +
      '  </div>' +
      '</div>';

    // append the buy box into the existing #pdp-grid (inside .pdp grid)
    document.getElementById('pdp-grid').insertAdjacentHTML('beforeend', html);
    bindBuyBox();
  }

  function bindBuyBox() {
    var p = PRODUCT;

    /* Color swatches — update main image too */
    var colorRow = $('#color-row');
    if (colorRow) {
      colorRow.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-color]');
        if (!btn) { return; }
        state.colorIndex = parseInt(btn.getAttribute('data-color'), 10);
        $all('#color-row .swatch-btn').forEach(function (b, i) {
          var on = i === state.colorIndex;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        $('#color-name').textContent = p.colors[state.colorIndex].name;
        var imgs = galleryImagesList();
        if (imgs.length) { setMainImage(state.colorIndex % imgs.length); }
      });
    }

    /* Sizes */
    var sizeList = $('#size-list');
    if (sizeList) {
      sizeList.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-size]');
        if (!btn) { return; }
        state.size = btn.getAttribute('data-size');
        $all('#size-list .size-btn').forEach(function (b) {
          var on = b.getAttribute('data-size') === state.size;
          b.classList.toggle('active', on);
          b.setAttribute('aria-pressed', String(on));
        });
        $('#size-name').textContent = state.size;
        $('#bb-price').textContent = S.formatCurrency(priceFor());
        syncMobileBar();
      });
    }

    /* Qty stepper */
    var dec = $('#qty-dec'), inc = $('#qty-inc'), val = $('#qty-value');
    function setQty(q) {
      var max = effectiveStock();
      state.qty = S.clamp(q, 1, Math.max(1, max));
      val.textContent = String(state.qty);
      dec.disabled = state.qty <= 1;
      inc.disabled = state.qty >= max || max <= 0;
      var note = $('#qty-max-note');
      if (note) { note.hidden = !(state.qty >= max && max > 0 && max <= 10); }
      syncMobileBar();
    }
    if (dec) { dec.addEventListener('click', function () { setQty(state.qty - 1); }); }
    if (inc) { inc.addEventListener('click', function () { setQty(state.qty + 1); }); }

    /* Wishlist */
    var wish = $('#wish-toggle');
    if (wish) {
      wish.addEventListener('click', function () {
        S.toggleWishlist(p.id);
        wish.classList.toggle('is-active', S.isWishlisted(p.id));
        wish.setAttribute('aria-pressed', String(S.isWishlisted(p.id)));
      });
    }

    /* Share */
    var share = $('#share-btn');
    if (share) {
      share.addEventListener('click', function () {
        var url = window.location.href;
        if (navigator.share) {
          navigator.share({ title: p.name, text: p.shortDescription, url: url }).catch(function () { /* user cancelled */ });
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () {
            S.toast('Link copied to clipboard!', 'success');
          }, function () { S.toast('Could not copy link.', 'error'); });
        } else {
          S.toast('Copy this link: ' + url, 'info', 6000);
        }
      });
    }

    /* State select → delivery estimate + shipping cost */
    var stateSel = $('#ship-state');
    if (stateSel) {
      stateSel.addEventListener('change', function () {
        state.stateCode = stateSel.value;
        var err = $('#ship-state-error');
        if (state.stateCode) {
          err.style.display = 'none';
          stateSel.closest('.field').classList.remove('invalid');
          var est = S.deliveryEstimate(state.stateCode, p.shippingDays);
          var st = D.stateByCode[state.stateCode];
          var probe = priceFor() * state.qty;
          var ship = S.computeShipping(probe, state.stateCode);
          $('#ship-est').innerHTML =
            'Delivery to <b>' + esc(st.name) + '</b>: <b>' + S.formatDate(est.minDate) + ' – ' + S.formatDate(est.maxDate) + '</b>' +
            ' (' + est.minDays + '–' + est.maxDays + ' business days).<br>' +
            'Shipping: ' + (ship.free ? '<span class="free">FREE</span> on this item' : '<b>' + S.formatCurrency(ship.cost) + '</b> — or FREE on orders over $75.');
        } else {
          var def = S.deliveryEstimate(null, p.shippingDays);
          $('#ship-est').textContent = 'Select your state to see the estimated delivery date and shipping cost. Default estimate: ' + S.formatDate(def.minDate) + ' – ' + S.formatDate(def.maxDate) + '.';
        }
      });
    }

    /* Add to cart / Buy now */
    function currentOptions() {
      return {
        color: p.colors[state.colorIndex] ? p.colors[state.colorIndex].name : '',
        size: state.size,
        qty: state.qty,
        unitPrice: priceFor()
      };
    }
    var addBtn = $('#add-to-cart');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        if (!state.stateCode) {
          // inline validation error; the add still proceeds on the default estimate
          var err = $('#ship-state-error');
          if (err) {
            err.style.display = 'block';
            var field = err.closest('.field');
            if (field) { field.classList.add('invalid'); }
          }
        }
        var ok = S.addToCart(p.id, currentOptions());
        if (ok) { S.openCartDrawer(); }
      });
    }
    var buyNow = $('#buy-now');
    if (buyNow) {
      buyNow.addEventListener('click', function () {
        var ok = S.addToCart(p.id, currentOptions());
        if (ok) { window.location.href = 'checkout.html'; }
      });
    }

    /* Review link scrolls to reviews */
    var rLink = $('#rating-link');
    if (rLink) {
      rLink.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.getElementById('reviews');
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    }
  }

  function syncMobileBar() {
    var bar = document.getElementById('mobile-buybar');
    if (!bar) { return; }
    var priceEl = bar.querySelector('.mb-price');
    if (priceEl) { priceEl.textContent = S.formatCurrency(priceFor() * state.qty); }
  }

  /* ==========================================================
     6. TABS
     ========================================================== */
  function renderTabs() {
    var p = PRODUCT;
    var tabs = [
      { id: 'desc', label: 'Description' },
      { id: 'specs', label: 'Specifications' },
      { id: 'shipping', label: 'Shipping & Returns' },
      { id: 'warranty', label: 'Warranty' }
    ];
    var est = S.deliveryEstimate(null, p.shippingDays);
    var panels = {
      desc: '<div class="prose"><p>' + esc(p.shortDescription) + '</p>' +
        p.fullDescription.map(function (par) { return '<p>' + esc(par) + '</p>'; }).join('') +
        '<ul class="feature-list">' + p.features.map(function (f) { return '<li>' + ic('check', 17) + esc(f) + '</li>'; }).join('') + '</ul></div>',
      specs: '<p class="muted">Full technical specifications are also shown in the table below.</p>',
      shipping: '<div class="prose">' +
        '<h4>Processing & transit</h4><p>' + esc(p.name) + ' ships within <b>' + p.shippingDays + ' business day' + (p.shippingDays > 1 ? 's' : '') + '</b>. Delivery typically takes ' + est.minDays + '–' + est.maxDays + ' business days depending on your state — pick your state in the buy box above for an exact date range.</p>' +
        '<h4>Shipping cost</h4><p>Flat-rate shipping is $6.99–$14.99 based on your state. Orders over $75 (after discounts) always ship <b>free</b>. Alaska and Hawaii currently carry a $14.99 surcharge.</p>' +
        '<h4>Cash on Delivery</h4><p>Pay in cash or by card when your order arrives — inspect it at the door first. No prepayment is required.</p>' +
        '<h4>Returns</h4><p>Not the perfect fit? Return within 30 days for a full refund. Start a return from your confirmation email; a prepaid label is included with every order.</p></div>',
      warranty: '<div class="prose"><h4>' + esc(p.specs['Warranty'] || '2-year warranty') + ' from STRIDE</h4>' +
        '<p>' + esc(p.name) + ' is covered against defects in materials and workmanship under normal use. Keep your order ID as proof of purchase.</p>' +
        '<h4>How to claim</h4><ul><li>Email support@stridesports.example with your order ID and a photo of the issue.</li><li>Approved claims are replaced or refunded within 10 business days — shipping is on us.</li><li>Normal wear and misuse are not covered; crash-replacement discounts are available for helmets.</li></ul></div>'
    };

    var html =
      '<section class="tabs container" aria-label="Product information tabs">' +
      '  <div class="tab-list" role="tablist" aria-label="Product information">' +
      tabs.map(function (t, i) {
        return '<button type="button" class="tab-btn" role="tab" id="tab-' + t.id + '" aria-controls="panel-' + t.id + '" aria-selected="' + (i === 0) + '" tabindex="' + (i === 0 ? '0' : '-1') + '">' + t.label + '</button>';
      }).join('') +
      '  </div>' +
      tabs.map(function (t, i) {
        return '<div class="tab-panel' + (i === 0 ? ' active' : '') + '" role="tabpanel" id="panel-' + t.id + '" aria-labelledby="tab-' + t.id + '" tabindex="0">' + panels[t.id] + '</div>';
      }).join('') +
      '</section>';

    ROOT.insertAdjacentHTML('beforeend', html);

    var btns = $all('.tab-btn', ROOT);
    btns.forEach(function (btn, idx) {
      btn.addEventListener('click', function () { activate(idx); });
      btn.addEventListener('keydown', function (e) {
        var dir = e.key === 'ArrowRight' ? 1 : (e.key === 'ArrowLeft' ? -1 : 0);
        if (dir) {
          e.preventDefault();
          var next = (idx + dir + btns.length) % btns.length;
          activate(next);
          btns[next].focus();
        }
      });
    });
    function activate(i) {
      btns.forEach(function (b, j) {
        var on = i === j;
        b.setAttribute('aria-selected', String(on));
        b.setAttribute('tabindex', on ? '0' : '-1');
        var panel = document.getElementById(b.getAttribute('aria-controls'));
        if (panel) { panel.classList.toggle('active', on); }
      });
    }
  }

  /* ==========================================================
     7. DETAILS FLOW (stacked feature images + bullets)
     ========================================================== */
  function renderDetails() {
    var p = PRODUCT;
    var html =
      '<section class="section container" aria-labelledby="details-title">' +
      '  <div class="section-head reveal"><span class="kicker">Product Details</span>' +
      '  <h2 id="details-title">Every angle, every detail</h2></div>' +
      '  <div class="details-flow">';

    p.detailImages.forEach(function (d, i) {
      html += '<figure class="detail-figure reveal">' +
        S.imgTag(d.src, d.caption + ' — ' + p.name, 800, 600) +
        '<figcaption>' + esc(d.caption) + '</figcaption>' +
        '<p>' + esc(d.text) + '</p>' +
        '</figure>';
      if (i === 1) {
        html += '<ul class="feature-list reveal">' +
          p.features.slice(0, Math.ceil(p.features.length / 2)).map(function (f) {
            return '<li>' + ic('check', 17) + esc(f) + '</li>';
          }).join('') + '</ul>';
      } else if (i === 3) {
        html += '<ul class="feature-list reveal">' +
          p.features.slice(Math.ceil(p.features.length / 2)).map(function (f) {
            return '<li>' + ic('check', 17) + esc(f) + '</li>';
          }).join('') + '</ul>';
      }
    });

    html += '</div></section>';
    ROOT.insertAdjacentHTML('beforeend', html);
  }

  /* ==========================================================
     8. SPECIFICATIONS TABLE
     ========================================================== */
  function renderSpecs() {
    var keys = Object.keys(PRODUCT.specs);
    if (!keys.length) { return; }
    var rows = keys.map(function (k) {
      return '<tr><th scope="row">' + esc(k) + '</th><td>' + esc(PRODUCT.specs[k]) + '</td></tr>';
    }).join('');
    ROOT.insertAdjacentHTML('beforeend',
      '<section class="section container specs-wrap" aria-labelledby="specs-title">' +
      '  <div class="section-head reveal"><span class="kicker">Tech Sheet</span><h2 id="specs-title">Specifications</h2></div>' +
      '  <div class="specs-table reveal"><table>' + rows + '</table></div>' +
      '</section>');
  }

  /* ==========================================================
     9. RELATED PRODUCTS (other categories first)
     ========================================================== */
  function renderRelated() {
    var others = D.products.filter(function (p) { return p.id !== PRODUCT.id; });
    var diffCat = others.filter(function (p) { return p.category !== PRODUCT.category; });
    var sameCat = others.filter(function (p) { return p.category === PRODUCT.category; });
    var picks = diffCat.slice(0, 3);
    if (picks.length < 3) { picks = picks.concat(sameCat); }
    picks = picks.slice(0, 3);

    ROOT.insertAdjacentHTML('beforeend',
      '<section class="section container related" aria-labelledby="related-title">' +
      '  <div class="section-head reveal"><span class="kicker">You May Also Like</span><h2 id="related-title">Frequently bought together</h2></div>' +
      '  <div class="product-grid">' +
      picks.map(function (p) {
        var oos = p.stockStatus === 'Out of Stock';
        var card = S.productCardHTML(p, {});
        // swap quick-add into a related-add (delegated globally in main.js)
        return card.replace('data-quick-add="' + p.id + '"', 'data-related-add="' + p.id + '"');
      }).join('') +
      '  </div></section>');
  }

  /* ==========================================================
     10. REVIEWS
     ========================================================== */
  function helpfulKey(r) { return PRODUCT.id + '|' + r.id; }

  function isHelpful(r) {
    var map = S.store.get(S.KEYS.helpful, {});
    return !!(map && map[helpfulKey(r)]);
  }

  function toggleHelpful(r) {
    var map = S.store.get(S.KEYS.helpful, {});
    var k = helpfulKey(r);
    if (map[k]) {
      delete map[k];
      r.helpfulCount = Math.max(0, (r.helpfulCount || 0) - 1);
      S.store.set(S.KEYS.helpful, map);
      renderReviewList();
      return false;
    }
    map[k] = true;
    r.helpfulCount = (r.helpfulCount || 0) + 1;
    S.store.set(S.KEYS.helpful, map);
    renderReviewList();
    return true;
  }

  function reportReview(r, btn) {
    var reported = S.store.get('sportcart_review_reported_v1', []);
    if (reported.indexOf(r.id) !== -1) { return; }
    reported.push(r.id);
    S.store.set('sportcart_review_reported_v1', reported);
    r.reported = true;
    S.toast('Thank you — our moderation team will review this post.', 'info');
    if (btn) { btn.disabled = true; }
  }

  function isReported(r) {
    var reported = S.store.get('sportcart_review_reported_v1', []);
    return reported.indexOf(r.id) !== -1 || !!r.reported;
  }

  function filteredReviews() {
    var list = state.reviews.slice();
    if (state.filter !== 'all') {
      var target = parseInt(state.filter, 10);
      list = list.filter(function (r) { return r.rating === target; });
    }
    switch (state.sort) {
      case 'highest': list.sort(function (a, b) { return b.rating - a.rating || b.helpfulCount - a.helpfulCount; }); break;
      case 'lowest': list.sort(function (a, b) { return a.rating - b.rating || b.helpfulCount - a.helpfulCount; }); break;
      case 'helpful': list.sort(function (a, b) { return (b.helpfulCount || 0) - (a.helpfulCount || 0); }); break;
      case 'recent':
      default:
        list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    }
    return list;
  }

  function reviewCardHTML(r) {
    var verified = r.verified !== false;
    var helpful = isHelpful(r);
    var reported = isReported(r);
    var thumbs = (r.images || []).map(function (src, i) {
      return '<button type="button" data-rev-img="' + i + '" aria-label="Open review photo ' + (i + 1) + '">' +
        S.imgTag(src, 'Customer photo for ' + PRODUCT.name, 200, 200) + '</button>';
    }).join('');
    return '<article class="rev-card" data-review-id="' + esc(r.id) + '">' +
      '<div class="rev-card__head">' +
      '  <span class="rev-avatar" aria-hidden="true">' + esc(r.avatarInitials || r.name.slice(0, 2).toUpperCase()) + '</span>' +
      '  <div class="rev-card__who">' +
      '    <b>' + esc(r.name) + (verified ? '<span class="rev-verified">' + ic('check', 11) + ' Verified purchase</span>' : '') + '</b>' +
      '    <time datetime="' + esc(r.date) + '">' + esc(S.formatDate(new Date(r.date + 'T12:00:00'))) + '</time>' +
      '  </div>' +
      '  <span class="rev-card__rating">' + S.starsHTML(r.rating) + '</span>' +
      '</div>' +
      '<h4 class="rev-card__title">' + esc(r.title) + '</h4>' +
      '<p class="rev-card__body">' + esc(r.body) + '</p>' +
      (thumbs ? '<div class="rev-thumbs">' + thumbs + '</div>' : '') +
      '<div class="rev-card__actions">' +
      '  <button type="button" class="rev-helpful' + (helpful ? ' voted' : '') + '" data-helpful="' + esc(r.id) + '" aria-pressed="' + helpful + '" aria-label="Mark this review as helpful">' + ic('thumb', 15) + ' Helpful (' + (r.helpfulCount || 0) + ')</button>' +
      '  <button type="button" class="rev-report" data-report="' + esc(r.id) + '"' + (reported ? ' disabled' : '') + '>' + (reported ? 'Reported' : 'Report') + '</button>' +
      '</div>' +
      '</article>';
  }

  function renderReviewSummary() {
    var box = document.getElementById('rev-summary-box');
    if (!box) { return; }
    var avg = avgRating();
    var total = state.reviews.length;
    var dist = [5, 4, 3, 2, 1].map(function (star) {
      var n = state.reviews.filter(function (r) { return r.rating === star; }).length;
      return { star: star, n: n, pct: total ? Math.round((n / total) * 100) : 0 };
    });
    box.innerHTML =
      '<div class="rev-summary__top">' +
      '  <span class="rev-avg">' + avg.toFixed(1) + '</span>' +
      '  <div>' + S.starsHTML(avg, true) +
      '  <p class="rev-summary__meta">Based on ' + reviewCount() + ' review' + (reviewCount() === 1 ? '' : 's') + '</p></div>' +
      '</div>' +
      '<div class="rev-bars">' +
      dist.map(function (d) {
        return '<div class="rev-bar-row"><span>' + d.star + '★</span>' +
          '<span class="rev-bar"><i style="width:' + d.pct + '%"></i></span>' +
          '<span class="rev-pct">' + d.pct + '%</span></div>';
      }).join('') +
      '</div>' +
      '<button type="button" class="btn btn--dark btn--block" id="write-review-open">Write a Review</button>';

    var open = document.getElementById('write-review-open');
    if (open) {
      open.addEventListener('click', function () {
        var form = document.getElementById('rev-form');
        if (form) {
          form.classList.add('open');
          form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var firstInput = form.querySelector('input, textarea');
          if (firstInput) { firstInput.focus(); }
        }
      });
    }
  }

  function renderReviewControls() {
    var box = document.getElementById('rev-controls-box');
    if (!box) { return; }
    var counts = { all: state.reviews.length };
    [5, 4, 3, 2, 1].forEach(function (s) {
      counts[s] = state.reviews.filter(function (r) { return r.rating === s; }).length;
    });
    box.innerHTML =
      '<div class="rev-chips">' +
      ['all', 5, 4, 3, 2, 1].map(function (f) {
        var label = f === 'all' ? 'All' : f + '★';
        return '<button type="button" class="chip" data-rev-filter="' + f + '" aria-pressed="' + (String(state.filter) === String(f)) + '">' + label + ' (' + counts[f] + ')</button>';
      }).join('') +
      '</div>' +
      '<div class="rev-sort">' +
      '  <label for="rev-sort">Sort</label>' +
      '  <select id="rev-sort">' +
      '    <option value="recent">Most recent</option>' +
      '    <option value="highest">Highest rated</option>' +
      '    <option value="lowest">Lowest rated</option>' +
      '    <option value="helpful">Most helpful</option>' +
      '  </select>' +
      '</div>';
    var sel = box.querySelector('#rev-sort');
    sel.value = state.sort;
    sel.addEventListener('change', function () {
      state.sort = sel.value;
      state.visible = 4;
      renderReviewList();
    });
    box.querySelector('.rev-chips').addEventListener('click', function (e) {
      var chip = e.target.closest('[data-rev-filter]');
      if (!chip) { return; }
      state.filter = chip.getAttribute('data-rev-filter');
      state.visible = 4;
      renderReviewControls();
      renderReviewList();
    });
  }

  function renderReviewList() {
    var list = document.getElementById('rev-list');
    if (!list) { return; }
    var all = filteredReviews();
    var shown = all.slice(0, state.visible);
    if (!all.length) {
      list.innerHTML = '<p class="rev-empty">No reviews match this filter yet. Be the first to share your experience!</p>';
    } else {
      list.innerHTML = shown.map(reviewCardHTML).join('');
    }
    var more = document.getElementById('rev-more');
    if (more) {
      var btn = more.querySelector('button');
      btn.hidden = state.visible >= all.length;
    }
    var note = document.getElementById('rev-count-note');
    if (note) { note.textContent = 'Showing ' + Math.min(state.visible, all.length) + ' of ' + all.length + ' written review' + (all.length === 1 ? '' : 's'); }
  }

  function bindReviewEvents() {
    ROOT.addEventListener('click', function (e) {
      /* Helpful vote */
      var h = e.target.closest('[data-helpful]');
      if (h) {
        var r = findReview(h.getAttribute('data-helpful'));
        if (r) { toggleHelpful(r); }
        return;
      }
      /* Report */
      var rep = e.target.closest('[data-report]');
      if (rep && !rep.disabled) {
        var r2 = findReview(rep.getAttribute('data-report'));
        if (r2) { reportReview(r2, rep); }
        return;
      }
      /* Review photo lightbox */
      var thumb = e.target.closest('[data-rev-img]');
      if (thumb) {
        var card = thumb.closest('.rev-card');
        var r3 = findReview(card.getAttribute('data-review-id'));
        if (r3 && r3.images && r3.images.length) {
          var list = r3.images.map(function (src, i) {
            return { src: src, alt: 'Customer photo ' + (i + 1) + ' for ' + PRODUCT.name };
          });
          openLightbox(list, parseInt(thumb.getAttribute('data-rev-img'), 10));
        }
        return;
      }
      /* Load more */
      if (e.target.closest('#load-more-btn')) {
        state.visible += 4;
        renderReviewList();
      }
    });

    function findReview(id) {
      return state.reviews.filter(function (r) { return r.id === id; })[0] || null;
    }
  }

  function bindReviewForm() {
    var form = document.getElementById('rev-form');
    if (!form) { return; }
    var picked = 0;
    var picker = form.querySelector('.star-picker');
    picker.innerHTML = [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" data-star="' + n + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '">' + ic('star', 26, true) + '</button>';
    }).join('');
    picker.addEventListener('click', function (e) {
      var b = e.target.closest('[data-star]');
      if (!b) { return; }
      picked = parseInt(b.getAttribute('data-star'), 10);
      $all('[data-star]', picker).forEach(function (btn) {
        btn.classList.toggle('lit', parseInt(btn.getAttribute('data-star'), 10) <= picked);
      });
      clearFieldError(form, 'rev-rating');
    });

    var file = form.querySelector('#rev-photos');
    var fileNote = form.querySelector('.file-note');
    if (file) {
      file.addEventListener('change', function () {
        var n = file.files ? file.files.length : 0;
        fileNote.textContent = n ? n + ' photo' + (n > 1 ? 's' : '') + ' attached (demo store — photos are not uploaded)' : 'Attach up to 3 photos (optional, demo only)';
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var title = form.querySelector('#rev-title');
      var body = form.querySelector('#rev-body');
      var name = form.querySelector('#rev-name');
      var valid = true;
      if (picked < 1) { setFieldError(form, 'rev-rating', 'Please select a star rating.'); valid = false; }
      if (!title.value || title.value.trim().length < 3) { setFieldError(form, 'rev-title', 'Title must be at least 3 characters.'); valid = false; }
      if (!body.value || body.value.trim().length < 10) { setFieldError(form, 'rev-body', 'Review must be at least 10 characters.'); valid = false; }
      if (!name.value || name.value.trim().length < 2) { setFieldError(form, 'rev-name', 'Please enter your name (min 2 characters).'); valid = false; }
      if (!valid) {
        var firstErr = form.querySelector('.field.invalid');
        if (firstErr) { firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        S.toast('Please fix the highlighted fields.', 'error');
        return;
      }

      var review = {
        id: 'user-' + PRODUCT.id + '-' + Date.now().toString(36),
        name: name.value.trim(),
        avatarInitials: name.value.trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase(),
        rating: picked,
        date: new Date().toISOString().slice(0, 10),
        title: title.value.trim(),
        body: body.value.trim(),
        verified: false,
        helpfulCount: 0
      };

      var saved = S.store.get(S.KEYS.userReviews, {});
      if (!saved[PRODUCT.id]) { saved[PRODUCT.id] = []; }
      saved[PRODUCT.id].unshift(review); // prepend to persisted list
      try { S.store.set(S.KEYS.userReviews, saved); }
      catch (err) { /* storage full — review still shows this session */ }

      state.reviews.unshift(review);
      state.filter = 'all';
      state.sort = 'recent';
      state.visible = 4;

      form.reset();
      picked = 0;
      $all('[data-star]', picker).forEach(function (b) { b.classList.remove('lit'); });
      form.classList.remove('open');

      renderReviewSummary();
      renderReviewControls();
      renderReviewList();
      var linkCount = document.getElementById('review-link-count');
      if (linkCount) { linkCount.textContent = String(reviewCount()); }
      S.toast('Thanks for your review! It is now live.', 'success');
    });
  }

  function setFieldError(form, id, msg) {
    var el = form.querySelector('#' + id);
    if (!el) { return; }
    var field = el.closest('.field') || el.closest('.opt-group') || el;
    field.classList.add('invalid');
    var errEl = field.querySelector('.field-error');
    if (!errEl) {
      errEl = document.createElement('p');
      errEl.className = 'field-error';
      field.appendChild(errEl);
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }

  function clearFieldError(form, id) {
    var el = form.querySelector('#' + id);
    if (!el) { return; }
    var field = el.closest('.field') || el.closest('.opt-group') || el;
    field.classList.remove('invalid');
    var errEl = field.querySelector('.field-error');
    if (errEl) { errEl.style.display = 'none'; }
  }

  function renderReviews() {
    ROOT.insertAdjacentHTML('beforeend',
      '<section class="reviews container" id="reviews" aria-labelledby="reviews-title">' +
      '  <div class="section-head reveal"><span class="kicker">Ratings & Reviews</span><h2 id="reviews-title">What athletes say</h2></div>' +
      '  <div class="reviews__grid">' +
      '    <div class="rev-summary reveal" id="rev-summary-box"></div>' +
      '    <div>' +
      '      <div class="rev-controls reveal" id="rev-controls-box"></div>' +
      '      <div class="rev-list" id="rev-list" aria-live="polite"></div>' +
      '      <div class="rev-more" id="rev-more"><button type="button" class="btn btn--outline" id="load-more-btn">Load More Reviews</button></div>' +
      '      <p class="rev-count-note" id="rev-count-note"></p>' +
      '      <form class="rev-form" id="rev-form" novalidate>' +
      '        <h3>Write a Review</h3>' +
      '        <div class="field"><label id="rev-rating-label">Your rating</label>' +
      '          <div class="star-picker" role="radiogroup" aria-labelledby="rev-rating-label"></div>' +
      '          <p class="field-error"></p></div>' +
      '        <div class="field"><label for="rev-title">Title <span class="req">*</span></label>' +
      '          <input type="text" id="rev-title" maxlength="80" placeholder="Sum up your experience">' +
      '          <p class="field-error"></p></div>' +
      '        <div class="field"><label for="rev-body">Your review <span class="req">*</span></label>' +
      '          <textarea id="rev-body" maxlength="1200" placeholder="What did you like or dislike? How did it perform?"></textarea>' +
      '          <p class="field-error"></p></div>' +
      '        <div class="field"><label for="rev-name">Your name <span class="req">*</span></label>' +
      '          <input type="text" id="rev-name" maxlength="60" placeholder="e.g. Jordan K.">' +
      '          <p class="field-error"></p></div>' +
      '        <div class="field"><label for="rev-photos">Add photos <span class="optional">(optional)</span></label>' +
      '          <input type="file" id="rev-photos" accept="image/*" multiple>' +
      '          <p class="file-note">Attach up to 3 photos (optional, demo only)</p></div>' +
      '        <button type="submit" class="btn btn--primary">Submit Review</button>' +
      '      </form>' +
      '    </div>' +
      '  </div>' +
      '</section>');

    renderReviewSummary();
    renderReviewControls();
    renderReviewList();
    bindReviewEvents();
    bindReviewForm();
  }

  /* ==========================================================
     11. MOBILE STICKY BUY BAR
     ========================================================== */
  function renderMobileBar() {
    var oos = PRODUCT.stockStatus === 'Out of Stock';
    var bar = document.createElement('div');
    bar.className = 'mobile-buybar';
    bar.id = 'mobile-buybar';
    bar.innerHTML =
      '<div class="mb-info"><span class="mb-name">' + esc(PRODUCT.name) + '</span>' +
      '<span class="mb-price">' + S.formatCurrency(priceFor() * state.qty) + '</span></div>' +
      (oos
        ? '<button type="button" class="btn btn--dark" disabled>Out of Stock</button>'
        : '<button type="button" class="btn btn--primary" id="mb-add">' + ic('cart', 18) + 'Add to Cart</button>');
    document.body.appendChild(bar);

    var add = document.getElementById('mb-add');
    if (add) {
      add.addEventListener('click', function () {
        var ok = S.addToCart(PRODUCT.id, {
          color: PRODUCT.colors[state.colorIndex] ? PRODUCT.colors[state.colorIndex].name : '',
          size: state.size,
          qty: state.qty,
          unitPrice: priceFor()
        });
        if (ok) { S.openCartDrawer(); }
      });
    }
  }
})();

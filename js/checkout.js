/* ============================================================
   STRIDE Sports Co. — checkout.js
   Powers two pages:
   • checkout.html  — COD checkout: order summary, promo, per-state
     shipping & tax, full inline form validation, "ship to a
     different address", save-info prefill, order creation
     (SP-YYYY-XXXXXX), cart clear, redirect to thank-you page.
   • thank-you.html — order confirmation: animated checkmark, copy
     order ID, full order recap, delivery estimate, 3-step timeline,
     print receipt, and a friendly guard for missing orders.
   ============================================================ */
(function () {
  'use strict';

  var S = window.STRIDE;
  var D = window.STRIDE_DATA;
  var $ = S.$, $all = S.$all, esc = S.escapeHTML, ic = S.icon;

  var PAGE = document.body.getAttribute('data-page');
  /* NOTE: initCheckout()/initThankYou() are invoked at the BOTTOM of this
     IIFE so that every var (e.g. RULES) is assigned before use — function
     declarations hoist, but their var dependencies do not. */

  /* ==========================================================
     CHECKOUT PAGE
     ========================================================== */
  function initCheckout() {
    var formWrap = document.getElementById('co-form-wrap');
    var emptyWrap = document.getElementById('co-empty');
    var aside = document.getElementById('co-aside');

    if (!S.getCart().length) {
      if (formWrap) { formWrap.hidden = true; }
      if (aside) { aside.hidden = true; }
      if (emptyWrap) { emptyWrap.hidden = false; }
      return;
    }

    fillStateSelects();
    prefillSavedInfo();
    renderSummary();
    bindForm();

    // Re-render when cart lines change from the drawer / other tabs
    window.STRIDE_CHECKOUT_SYNC = function () {
      if (!S.getCart().length) {
        window.location.reload();
        return;
      }
      renderSummary();
    };
    window.addEventListener('storage', function (e) {
      if (e.key === S.KEYS.cart || e.key === S.KEYS.promo) { window.STRIDE_CHECKOUT_SYNC(); }
    });
  }

  function fillStateSelects() {
    ['f-state', 'd-state'].forEach(function (id) {
      var sel = document.getElementById(id);
      if (!sel) { return; }
      var placeholder = sel.querySelector('option[value=""]');
      var html = placeholder ? placeholder.outerHTML : '<option value="">Select…</option>';
      html += D.usStates.map(function (s) {
        return '<option value="' + s.code + '">' + esc(s.name) + '</option>';
      }).join('');
      sel.innerHTML = html;
    });
  }

  function totals() {
    var subtotal = S.cartSubtotal();
    var discount = S.discountFor(subtotal);
    var stateCode = ($('#f-state') && $('#f-state').value) || '';
    var shipping = S.computeShipping(subtotal - discount, stateCode);
    var taxable = subtotal - discount;
    var tax = taxable * S.taxRateFor(stateCode);
    return {
      subtotal: subtotal,
      discount: discount,
      shipping: shipping,
      tax: tax,
      total: taxable + shipping.cost + tax,
      stateCode: stateCode
    };
  }

  function renderSummary() {
    var items = document.getElementById('co-items');
    if (!items) { return; }
    var cart = S.getCart();
    items.innerHTML = cart.map(function (l) {
      var p = D.findProduct(l.productId);
      if (!p) { return ''; }
      var meta = [l.color, l.size].filter(Boolean).join(' · ');
      return '<div class="co-item">' +
        S.imgTag(p.images[0], p.name, 112, 112) +
        '<span><span class="co-item__name">' + esc(p.name) + '</span>' +
        '<span class="co-item__meta">' + esc(meta) + ' × ' + l.qty + '</span></span>' +
        '<span class="co-item__price">' + S.formatCurrency(l.unitPrice * l.qty) + '</span>' +
        '</div>';
    }).join('');

    var t = totals();
    var promo = S.getPromo();
    var promoValid = promo && D.config.promoCodes[promo.code];
    var promoBox = document.getElementById('co-promo-box');
    var discountRow = document.getElementById('sum-discount-row');

    if (promoBox) {
      promoBox.innerHTML = promoValid
        ? '<p class="promo-msg ok" style="margin:0">Promo <b>' + esc(promo.code) + '</b> applied — ' + esc(D.config.promoCodes[promo.code].label) + '. <button type="button" id="co-promo-remove" class="remove-promo" style="text-decoration:underline;color:var(--c-muted);font-size:12px;font-weight:700;background:none;padding:0">Remove</button></p>'
        : '<div class="promo-row"><label class="sr-only" for="co-promo-input">Promo code</label>' +
          '<input type="text" id="co-promo-input" placeholder="Promo code (try SPORT10)">' +
          '<button type="button" class="btn btn--dark btn--sm" id="co-promo-apply">Apply</button></div>' +
          '<p class="promo-msg" id="co-promo-msg" role="status"></p>';
    }
    if (discountRow) { discountRow.hidden = t.discount <= 0; }

    $('#sum-subtotal').textContent = S.formatCurrency(t.subtotal);
    $('#sum-discount').textContent = '−' + S.formatCurrency(t.discount);
    $('#sum-shipping').innerHTML = t.shipping.free
      ? '<span class="free">FREE</span>'
      : S.formatCurrency(t.shipping.cost);
    $('#sum-shipping-note').textContent = t.stateCode
      ? 'Shipping to ' + D.stateByCode[t.stateCode].name
      : 'Select a state to calculate shipping';
    $('#sum-tax').textContent = S.formatCurrency(t.tax);
    $('#sum-total').textContent = S.formatCurrency(t.total);

    if (promoBox && !promoValid) {
      var apply = document.getElementById('co-promo-apply');
      if (apply) {
        apply.addEventListener('click', function () {
          var input = document.getElementById('co-promo-input');
          var msg = document.getElementById('co-promo-msg');
          var res = S.applyPromo(input ? input.value : '');
          if (msg) { msg.textContent = res.msg; msg.className = 'promo-msg ' + (res.ok ? 'ok' : 'err'); }
        });
      }
    } else if (promoBox) {
      var rm = document.getElementById('co-promo-remove');
      if (rm) { rm.addEventListener('click', function () { S.removePromo(); }); }
    }
  }

  /* ---------- Validation ---------- */
  var RULES = {
    'f-fullname': { label: 'Full name', test: function (v) { return v.trim().length >= 2; }, msg: 'Please enter your full name (min 2 characters).' },
    'f-email': { label: 'Email', test: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()); }, msg: 'Please enter a valid email address (e.g. you@example.com).' },
    'f-phone': {
      label: 'Phone',
      test: function (v) {
        var digits = v.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15 && /^[0-9+\-\s().]+$/.test(v.trim());
      },
      msg: 'Please enter a valid phone number (min 10 digits).'
    },
    'f-state': { label: 'State', test: function (v) { return !!v; }, msg: 'Please select your state — it determines shipping cost and delivery estimate.' },
    'f-city': { label: 'City', test: function (v) { return v.trim().length >= 2; }, msg: 'Please enter your city.' },
    'f-address1': { label: 'Street address', test: function (v) { return v.trim().length >= 4; }, msg: 'Please enter your street address.' },
    'f-zip': { label: 'ZIP code', test: function (v) { return /^\d{5}(-\d{4})?$/.test(v.trim()); }, msg: 'Please enter a valid 5-digit ZIP code (e.g. 78701).' },
    'd-name': { label: 'Recipient name', test: function (v) { return v.trim().length >= 2; }, msg: 'Please enter the recipient\'s name.', whenDifferent: true },
    'd-address1': { label: 'Street address', test: function (v) { return v.trim().length >= 4; }, msg: 'Please enter the delivery street address.', whenDifferent: true },
    'd-city': { label: 'City', test: function (v) { return v.trim().length >= 2; }, msg: 'Please enter the delivery city.', whenDifferent: true },
    'd-state': { label: 'State', test: function (v) { return !!v; }, msg: 'Please select the delivery state.', whenDifferent: true },
    'd-zip': { label: 'ZIP code', test: function (v) { return /^\d{5}(-\d{4})?$/.test(v.trim()); }, msg: 'Please enter a valid 5-digit ZIP code.', whenDifferent: true }
  };

  function validateField(id) {
    var rule = RULES[id];
    var el = document.getElementById(id);
    if (!rule || !el) { return true; }
    var field = el.closest('.field');
    var ok = rule.test(el.value || '');
    if (field) {
      field.classList.toggle('invalid', !ok);
      var err = field.querySelector('.field-error');
      if (err) {
        err.textContent = ok ? '' : rule.msg;
        err.style.display = ok ? 'none' : 'block';
      }
      el.setAttribute('aria-invalid', String(!ok));
    }
    return ok;
  }

  function validateTerms() {
    var el = document.getElementById('f-terms');
    if (!el) { return true; }
    var field = el.closest('.field') || el.closest('.check-row');
    var ok = el.checked;
    if (field) { field.classList.toggle('invalid', !ok); }
    var err = document.getElementById('terms-error');
    if (err) { err.style.display = ok ? 'none' : 'block'; }
    el.setAttribute('aria-invalid', String(!ok));
    return ok;
  }

  function prefillSavedInfo() {
    var saved = S.store.get(S.KEYS.checkoutInfo, null);
    if (!saved) { return; }
    ['f-fullname', 'f-email', 'f-phone', 'f-city', 'f-address1', 'f-address2', 'f-zip', 'f-notes'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el && saved[id.replace('f-', '')]) { el.value = saved[id.replace('f-', '')]; }
    });
    if (saved.state) {
      var sel = document.getElementById('f-state');
      if (sel) { sel.value = saved.state; renderSummary(); }
    }
    if (saved.different) {
      var diff = document.getElementById('f-diff');
      if (diff) {
        diff.checked = true;
        var panel = document.getElementById('ship-diff');
        if (panel) { panel.classList.add('open'); }
        ['d-name', 'd-address1', 'd-address2', 'd-city', 'd-zip'].forEach(function (id) {
          var el = document.getElementById(id);
          if (el && saved[id.replace('d-', 'd-')]) { el.value = saved[id]; }
        });
        if (saved.dstate) {
          var dsel = document.getElementById('d-state');
          if (dsel) { dsel.value = saved.dstate; }
        }
      }
    }
  }

  function bindForm() {
    /* Inline validation on blur */
    Object.keys(RULES).forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) { return; }
      el.addEventListener('blur', function () {
        if (el.value || el.tagName === 'SELECT') { validateField(id); }
      });
      el.addEventListener('input', function () {
        var field = el.closest('.field');
        if (field && field.classList.contains('invalid')) { validateField(id); }
      });
    });

    var terms = document.getElementById('f-terms');
    if (terms) { terms.addEventListener('change', validateTerms); }

    /* Ship-to-different toggle */
    var diff = document.getElementById('f-diff');
    if (diff) {
      diff.addEventListener('change', function () {
        var panel = document.getElementById('ship-diff');
        if (panel) { panel.classList.toggle('open', diff.checked); }
        if (!diff.checked) {
          ['d-name', 'd-address1', 'd-address2', 'd-city', 'd-state', 'd-zip'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) {
              var field = el.closest('.field');
              if (field) { field.classList.remove('invalid'); }
            }
          });
        }
      });
    }

    /* State change → shipping + tax recalculation */
    var stateSel = document.getElementById('f-state');
    if (stateSel) { stateSel.addEventListener('change', renderSummary); }

    /* Submit */
    var form = document.getElementById('checkout-form');
    var submitBtn = document.getElementById('place-order');
    if (!form || !submitBtn) { return; }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var banner = document.getElementById('form-error-banner');
      var firstInvalid = null;
      var errorCount = 0;

      Object.keys(RULES).forEach(function (id) {
        var rule = RULES[id];
        var el = document.getElementById(id);
        if (!el) { return; }
        if (rule.whenDifferent) {
          var diff2 = document.getElementById('f-diff');
          if (!diff2 || !diff2.checked) { return; }
        }
        var ok = validateField(id);
        if (!ok) {
          errorCount++;
          if (!firstInvalid) { firstInvalid = el; }
        }
      });

      var termsOk = validateTerms();
      if (!termsOk) { errorCount++; if (!firstInvalid) { firstInvalid = terms; } }

      if (errorCount > 0) {
        if (banner) {
          banner.textContent = 'Please fix ' + errorCount + ' highlighted field' + (errorCount > 1 ? 's' : '') + ' below before placing your order.';
          banner.classList.add('show');
          banner.setAttribute('role', 'alert');
        }
        if (firstInvalid) {
          firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstInvalid.focus({ preventScroll: true });
        }
        S.toast('Your order could not be placed — check the highlighted fields.', 'error');
        return;
      }
      if (banner) { banner.classList.remove('show'); }

      placeOrder(submitBtn);
    });
  }

  function makeOrderId() {
    var chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) { window.crypto.getRandomValues(bytes); }
    else { for (var i = 0; i < 6; i++) { bytes[i] = Math.floor(Math.random() * 256); } }
    var rand = '';
    for (var j = 0; j < 6; j++) { rand += chars[bytes[j] % chars.length]; }
    return 'SP-' + new Date().getFullYear() + '-' + rand;
  }

  function placeOrder(btn) {
    btn.classList.add('is-loading');
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');

    // Simulated payment-free confirmation step (COD) — keeps UX honest & prevents double submit
    setTimeout(function () {
      try {
        var cart = S.getCart();
        if (!cart.length) {
          S.toast('Your cart is empty.', 'error');
          window.location.href = 'index.html#featured';
          return;
        }
        var t = totals();
        var est = S.deliveryEstimate(t.stateCode, null);
        var different = $('#f-diff') && $('#f-diff').checked;

        var order = {
          id: makeOrderId(),
          placedAt: new Date().toISOString(),
          paymentMethod: 'Cash on Delivery',
          items: cart.map(function (l) {
            var p = D.findProduct(l.productId);
            return {
              productId: l.productId,
              name: p ? p.name : l.productId,
              color: l.color, size: l.size, qty: l.qty,
              unitPrice: l.unitPrice,
              image: p ? p.images[0] : S.FALLBACK_IMG
            };
          }),
          totals: {
            subtotal: t.subtotal,
            discount: t.discount,
            promo: S.getPromo() ? S.getPromo().code : null,
            shipping: t.shipping.cost,
            shippingFree: t.shipping.free,
            tax: t.tax,
            total: t.total
          },
          customer: {
            fullName: $('#f-fullname').value.trim(),
            email: $('#f-email').value.trim(),
            phone: $('#f-phone').value.trim(),
            address1: $('#f-address1').value.trim(),
            address2: $('#f-address2').value.trim(),
            city: $('#f-city').value.trim(),
            state: $('#f-state').value,
            zip: $('#f-zip').value.trim(),
            notes: $('#f-notes').value.trim()
          },
          deliveryAddress: different ? {
            fullName: $('#d-name').value.trim(),
            address1: $('#d-address1').value.trim(),
            address2: $('#d-address2').value.trim(),
            city: $('#d-city').value.trim(),
            state: $('#d-state').value,
            zip: $('#d-zip').value.trim()
          } : null,
          deliveryEstimate: {
            from: est.minDate.toISOString(),
            to: est.maxDate.toISOString()
          }
        };

        /* Save order (persist for order history / thank-you page) */
        var orders = S.store.get(S.KEYS.orders, []);
        if (!Array.isArray(orders)) { orders = []; }
        orders.unshift(order);
        S.store.set(S.KEYS.orders, orders.slice(0, 20));

        /* Save info for next time (if requested) */
        if ($('#f-save-info') && $('#f-save-info').checked) {
          S.store.set(S.KEYS.checkoutInfo, {
            'fullname': order.customer.fullName,
            'email': order.customer.email,
            'phone': order.customer.phone,
            'address1': order.customer.address1,
            'address2': order.customer.address2,
            'city': order.customer.city,
            'state': order.customer.state,
            'zip': order.customer.zip,
            'notes': order.customer.notes,
            'different': different,
            'd-name': different ? order.deliveryAddress.fullName : '',
            'd-address1': different ? order.deliveryAddress.address1 : '',
            'd-address2': different ? order.deliveryAddress.address2 : '',
            'd-city': different ? order.deliveryAddress.city : '',
            'dstate': different ? order.deliveryAddress.state : '',
            'd-zip': different ? order.deliveryAddress.zip : ''
          });
        } else {
          S.store.remove(S.KEYS.checkoutInfo);
        }

        /* Clear cart + promo, then redirect */
        S.clearCart();
        S.store.remove(S.KEYS.promo);
        S.updateBadges(false);
        window.location.href = 'thank-you.html?order=' + encodeURIComponent(order.id);
      } catch (err) {
        S.toast('Something went wrong while placing your order. Please try again.', 'error');
        btn.classList.remove('is-loading');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    }, 900);
  }

  /* ==========================================================
     THANK YOU PAGE
     ========================================================== */
  function initThankYou() {
    var params = new URLSearchParams(window.location.search);
    var orderId = params.get('order');
    var orders = S.store.get(S.KEYS.orders, []);
    var order = null;

    if (orderId) {
      order = orders.filter(function (o) { return o.id === orderId; })[0] || null;
    }

    var okWrap = document.getElementById('ty-content');
    var noWrap = document.getElementById('ty-no-order');

    if (!order) {
      if (okWrap) { okWrap.hidden = true; }
      if (noWrap) { noWrap.hidden = false; }
      document.title = 'Order not found | STRIDE';
      return;
    }

    document.title = 'Thank you for your order! | STRIDE';
    renderThankYou(order);
  }

  function renderThankYou(order) {
    $('#ty-order-id').textContent = order.id;
    $('#ty-email-note').textContent = 'A confirmation email is on its way to ' + order.customer.email + '.';

    /* Items */
    $('#ty-items').innerHTML = order.items.map(function (it) {
      var meta = [it.color, it.size].filter(Boolean).join(' · ');
      return '<div class="co-item">' +
        S.imgTag(it.image, it.name, 112, 112) +
        '<span><span class="co-item__name">' + esc(it.name) + '</span>' +
        '<span class="co-item__meta">' + esc(meta) + ' × ' + it.qty + '</span></span>' +
        '<span class="co-item__price">' + S.formatCurrency(it.unitPrice * it.qty) + '</span>' +
        '</div>';
    }).join('');

    /* Totals */
    var t = order.totals;
    $('#ty-subtotal').textContent = S.formatCurrency(t.subtotal);
    var discRow = document.getElementById('ty-discount-row');
    if (discRow) { discRow.hidden = !(t.discount > 0); }
    $('#ty-discount').textContent = '−' + S.formatCurrency(t.discount);
    $('#ty-shipping').innerHTML = t.shippingFree ? '<span class="free">FREE</span>' : S.formatCurrency(t.shipping);
    $('#ty-tax').textContent = S.formatCurrency(t.tax);
    $('#ty-total').textContent = S.formatCurrency(t.total);
    $('#ty-payment').textContent = order.paymentMethod + ' — pay ' + S.formatCurrency(t.total) + ' when your order arrives';

    /* Delivery address */
    var addr = order.deliveryAddress || order.customer;
    var stateName = D.stateByCode[addr.state] ? D.stateByCode[addr.state].name : addr.state;
    $('#ty-address').innerHTML =
      '<b>' + esc(addr.fullName) + '</b><br>' +
      esc(addr.address1) + (addr.address2 ? '<br>' + esc(addr.address2) : '') + '<br>' +
      esc(addr.city) + ', ' + esc(stateName) + ' ' + esc(addr.zip) + '<br>' +
      'United States';

    /* Delivery estimate */
    var from = new Date(order.deliveryEstimate.from);
    var to = new Date(order.deliveryEstimate.to);
    $('#ty-eta').innerHTML = 'Estimated delivery: <b>' + esc(S.formatDate(from)) + ' – ' + esc(S.formatDate(to)) + '</b>';

    /* Timeline step 1 done */
    var step1 = document.getElementById('ty-step-placed');
    if (step1) { step1.classList.add('ty-step--done'); }

    /* Copy to clipboard */
    var copyBtn = document.getElementById('copy-order-id');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var label = copyBtn.querySelector('.copy-label');
        function done() {
          copyBtn.classList.add('copied');
          if (label) { label.textContent = 'Copied!'; }
          setTimeout(function () {
            copyBtn.classList.remove('copied');
            if (label) { label.textContent = 'Copy'; }
          }, 2000);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(order.id).then(done, function () { fallbackCopy(order.id, done); });
        } else {
          fallbackCopy(order.id, done);
        }
      });
    }

    /* Print receipt */
    var printBtn = document.getElementById('print-receipt');
    if (printBtn) {
      printBtn.addEventListener('click', function () { window.print(); });
    }

    /* Order date */
    var placed = new Date(order.placedAt);
    $('#ty-placed-date').textContent = 'Order placed ' + S.formatDate(placed) + ' · ' + order.id;
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) {
      S.toast('Copy failed — your order ID is ' + text, 'info', 8000);
    }
  }

  /* ==========================================================
     BOOT (after all declarations & assignments)
     ========================================================== */
  if (PAGE === 'checkout') { initCheckout(); }
  else if (PAGE === 'thankyou') { initThankYou(); }
})();

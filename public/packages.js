/* Meir Web Development Services: package details + customizer
 *
 * Home page:    "View details & customize" opens a window with everything that's
 *               included, the timeline, what we need from the client, and optional
 *               add-ons with a live estimated total. "Book with this setup" carries
 *               the choices to the booking page.
 * Booking page: shows the same add-ons for the chosen package so clients can adjust
 *               them before submitting.
 *
 * All package details and prices come from lib/services.js (via /api/packages).
 */
(function () {
  'use strict';

  let catalog = null;
  const loading = fetch('/api/packages', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => { catalog = d && d.packages ? d.packages : []; return catalog; })
    .catch(() => { catalog = []; return catalog; });

  const usd = (n) => 'US$' + Number(n).toLocaleString('en-US');
  const byId = (id) => (catalog || []).find((p) => p.id === id);

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v == null || v === false) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach((c) => c && node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return node;
  }

  // selection = { [addonId]: qty }
  function total(pkg, selection) {
    return pkg.usd + pkg.addons.reduce((sum, a) => sum + (selection[a.id] ? a.price * selection[a.id] : 0), 0);
  }
  function encode(selection) {
    return Object.entries(selection).filter(([, q]) => q > 0).map(([id, q]) => `${id}:${q}`).join(',');
  }
  function decode(str, pkg) {
    const sel = {};
    if (!str || !pkg) return sel;
    str.split(',').forEach((part) => {
      const [id, q] = part.split(':');
      const def = pkg.addons.find((a) => a.id === id);
      if (def) sel[id] = Math.min(Math.max(parseInt(q, 10) || 1, 1), def.maxQty || 1);
    });
    return sel;
  }

  /** Renders the add-on checklist into `container`; calls onChange(selection) on every change. */
  function renderAddons(container, pkg, selection, onChange) {
    container.textContent = '';
    if (!pkg.addons.length) return;
    pkg.addons.forEach((a) => {
      const checked = !!selection[a.id];
      const cb = el('input', { type: 'checkbox', id: `addon-${container.dataset.scope}-${a.id}` });
      cb.checked = checked;
      const qtyVal = el('span', { class: 'qty-val', 'aria-live': 'polite', text: String(selection[a.id] || 1) });
      const minus = el('button', { type: 'button', class: 'qty-btn', 'aria-label': `Fewer: ${a.name}`, text: '−' });
      const plus = el('button', { type: 'button', class: 'qty-btn', 'aria-label': `More: ${a.name}`, text: '+' });
      const qty = el('div', { class: 'qty', hidden: !(checked && a.maxQty > 1) }, [minus, qtyVal, plus]);
      const priceText = a.unit ? `${usd(a.price)} ${a.unit}` : usd(a.price);
      const row = el('div', { class: 'addon' + (checked ? ' on' : '') }, [
        el('label', { class: 'addon-main', for: cb.id }, [
          cb,
          el('span', { class: 'addon-text' }, [el('b', { text: a.name }), el('small', { text: '+' + priceText })]),
        ]),
        qty,
      ]);
      const update = () => {
        row.classList.toggle('on', !!selection[a.id]);
        qty.hidden = !(selection[a.id] && a.maxQty > 1);
        qtyVal.textContent = String(selection[a.id] || 1);
        minus.disabled = (selection[a.id] || 1) <= 1;
        plus.disabled = (selection[a.id] || 1) >= a.maxQty;
        onChange(selection);
      };
      cb.addEventListener('change', () => {
        if (cb.checked) selection[a.id] = selection[a.id] || 1; else delete selection[a.id];
        update();
      });
      minus.addEventListener('click', () => { selection[a.id] = Math.max(1, (selection[a.id] || 1) - 1); update(); });
      plus.addEventListener('click', () => { selection[a.id] = Math.min(a.maxQty, (selection[a.id] || 1) + 1); update(); });
      minus.disabled = (selection[a.id] || 1) <= 1;
      plus.disabled = (selection[a.id] || 1) >= a.maxQty;
      container.appendChild(row);
    });
  }

  function list(items, cls) {
    return el('ul', { class: cls }, items.map((t) => el('li', { text: t })));
  }

  // ======================= HOME PAGE: details window =======================
  let dialog = null;
  function openDetails(id) {
    const pkg = byId(id);
    if (!pkg) { location.href = `/book?package=${encodeURIComponent(id)}`; return; }
    if (dialog) dialog.remove();

    const selection = {};
    const totalEl = el('b', { class: 'pm-total-num', text: usd(pkg.usd) });
    const countEl = el('span', { class: 'pm-total-count', text: 'Base package' });
    const bookBtn = el('a', { class: 'btn btn-primary btn-block btn-lg', href: `/book?package=${pkg.id}`, text: 'Book with this setup' });
    const addonBox = el('div', { class: 'addon-list', 'data-scope': 'modal' });
    const onChange = (sel) => {
      totalEl.textContent = usd(total(pkg, sel));
      const n = Object.keys(sel).length;
      countEl.textContent = n ? `Base package + ${n} add-on${n > 1 ? 's' : ''}` : 'Base package';
      const enc = encode(sel);
      bookBtn.href = `/book?package=${pkg.id}${enc ? `&addons=${encodeURIComponent(enc)}` : ''}`;
    };
    renderAddons(addonBox, pkg, selection, onChange);

    const closeBtn = el('button', { type: 'button', class: 'pm-close', 'aria-label': 'Close details', text: '×' });
    dialog = el('dialog', { class: 'pkg-modal', 'aria-labelledby': 'pm-title' }, [
      el('div', { class: 'pm-head' }, [
        el('div', {}, [
          el('p', { class: 'eyebrow', text: pkg.popular ? 'Most popular package' : 'Package details' }),
          el('h2', { id: 'pm-title', text: pkg.name }),
          el('p', { class: 'pm-tag', text: pkg.tagline }),
        ]),
        closeBtn,
      ]),
      el('div', { class: 'pm-body' }, [
        el('div', { class: 'pm-info' }, [
          el('p', { class: 'pm-desc', text: pkg.description }),
          el('div', { class: 'pm-meta' }, [
            el('div', {}, [el('small', { text: 'Starts at' }), el('b', { text: usd(pkg.usd) })]),
            el('div', {}, [el('small', { text: 'Timeline' }), el('b', { text: pkg.timeline })]),
          ]),
          el('h3', { text: "What's included" }),
          list(pkg.included, 'includes'),
          el('h3', { text: "What we'll need from you" }),
          list(pkg.needFromYou, 'pm-needs'),
        ]),
        el('div', { class: 'pm-custom' }, [
          el('h3', { text: 'Customize your package' }),
          el('p', { class: 'hint', text: 'Optional. Tick any extras you want, and your estimate updates instantly.' }),
          addonBox,
          el('div', { class: 'pm-total' }, [
            el('div', { class: 'pm-total-row' }, [el('span', {}, ['Estimated total', el('br'), countEl]), totalEl]),
            el('small', { text: 'Your final price is confirmed in a written quote after the free consultation. No payment needed now.' }),
          ]),
          bookBtn,
        ]),
      ]),
    ]);

    document.body.appendChild(dialog);
    closeBtn.addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); }); // click on backdrop
    dialog.addEventListener('close', () => { dialog.remove(); dialog = null; });
    dialog.showModal();
    closeBtn.focus();
  }

  document.querySelectorAll('[data-details]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      if (typeof HTMLDialogElement === 'undefined') return; // very old browser: follow the link to /book
      e.preventDefault();
      await loading;
      openDetails(btn.getAttribute('data-details'));
    });
  });

  // ======================= BOOKING PAGE: customizer =======================
  const select = document.getElementById('serviceId');
  const field = document.getElementById('customizer-field');
  let bookingSelection = {};

  function renderBooking(initial) {
    if (!select || !field) return;
    const pkg = byId(select.value);
    if (!pkg) { field.hidden = true; bookingSelection = {}; return; }
    bookingSelection = initial || {};
    field.hidden = false;
    document.getElementById('cz-included').replaceWith(Object.assign(list(pkg.included, 'includes cz-included-list'), { id: 'cz-included' }));
    document.getElementById('cz-timeline').textContent = pkg.timeline;
    const totalEl = document.getElementById('cz-total');
    const countEl = document.getElementById('cz-count');
    const onChange = (sel) => {
      totalEl.textContent = usd(total(pkg, sel));
      const n = Object.keys(sel).length;
      countEl.textContent = n ? `Base ${usd(pkg.usd)} + ${n} add-on${n > 1 ? 's' : ''}` : `Base package ${usd(pkg.usd)}`;
    };
    renderAddons(document.getElementById('cz-addons'), pkg, bookingSelection, onChange);
    onChange(bookingSelection);
  }

  if (select && field) {
    loading.then(() => {
      const params = new URLSearchParams(location.search);
      const wanted = params.get('package');
      if (wanted && byId(wanted)) select.value = wanted;
      renderBooking(decode(params.get('addons'), byId(select.value)));
    });
    select.addEventListener('change', () => renderBooking({}));
  }

  window.MeirPackages = {
    /** Add-ons chosen on the booking page, as [{ id, qty }]. */
    getSelection: () => Object.entries(bookingSelection).map(([id, qty]) => ({ id, qty })),
    reset: () => { bookingSelection = {}; renderBooking({}); },
  };
})();

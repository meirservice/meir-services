/* Meir Web Development Services: page behaviour (home page + booking page) */
(function () {
  'use strict';

  // Messages created by JavaScript.
  const STR = {
    en: {
      hours: 'Available Monday to Sunday, 8:00 AM – 8:00 PM Philippine time (PHT).',
      browserTz: " Your device is set to {tz}; pick a time on your own clock and we'll convert it.",
      preview: "That's {time} for us.",
      name: 'Please enter your full name.',
      email: 'Please enter a valid email address.',
      contact: 'Please keep this under 100 characters.',
      service: 'Please choose a package.',
      dtRequired: 'Please choose a preferred date and time.',
      dtInvalid: 'Please choose a valid date and time.',
      dtSoon: 'Please choose a time at least an hour from now.',
      dtHours: 'Please pick a time within our consultation hours: Monday to Sunday, 8:00 AM – 8:00 PM (PHT).',
      consent: 'Please tick the box to give your consent so we can process your request.',
      briefShort: 'Please tell us a bit more about your business (at least 20 characters).',
      briefLong: 'Please keep this under 5,000 characters.',
      submit: 'Submit Booking Request',
      sending: 'Sending…',
      fix: 'Please fix the highlighted fields and try again.',
      offline: "We couldn't reach the server. Please check your internet connection and try again, or message us on WhatsApp (+63 976 132 9770) or at meirwebdevelopment@gmail.com.",
      tooMany: 'Too many requests. Please wait a few minutes and try again.',
      generic: 'Something went wrong. Please try again.',
      addons: 'One of the selected add-ons is not available for this package. Please review your choices and try again.',
    },
  };
  const t = (key, vars) => {
    let s = STR.en[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace(`{${k}}`, vars[k]); });
    return s;
  };

  // ---------- Header: mobile menu + shadow on scroll ----------
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');

  function closeMenu() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
  }
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  document.querySelectorAll('#year').forEach((el) => { el.textContent = new Date().getFullYear(); });

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // ---------- Booking form (only on /book) ----------
  const form = document.getElementById('booking-form');
  if (!form) return;

  const serviceSelect = document.getElementById('serviceId');
  const dtInput = document.getElementById('preferredDateTime');
  const brief = document.getElementById('brief');
  const briefCount = document.getElementById('brief-count');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const successEl = document.getElementById('booking-success');
  const tzHint = document.getElementById('tz-hint');
  const phtPreview = document.getElementById('pht-preview');
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const FIELDS = ['name', 'email', 'contact', 'serviceId', 'preferredDateTime', 'brief', 'consent'];

  // Consultation hours (Philippine business hours by default). The server
  // sends its real settings from /api/config and re-checks every booking.
  let schedule = { timezone: 'Asia/Manila', days: [0, 1, 2, 3, 4, 5, 6], openMinutes: 480, closeMinutes: 1200, meetingMinutes: 30 };
  const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Pre-select a package from the link, e.g. /book?package=business-website
  const params = new URLSearchParams(location.search);
  const wanted = params.get('package');
  if (wanted && serviceSelect.querySelector(`option[value="${CSS.escape(wanted)}"]`)) serviceSelect.value = wanted;

  function renderStatic() {
    const local = timezone === schedule.timezone ? '' : t('browserTz', { tz: timezone.replace(/_/g, ' ') });
    tzHint.textContent = t('hours') + local;
    if (!submitBtn.classList.contains('loading')) submitBtn.querySelector('.btn-label').textContent = t('submit');
    updatePhtPreview();
    FIELDS.forEach((f) => {
      const errEl = document.getElementById(`err-${f}`);
      if (errEl && errEl.dataset.key) errEl.textContent = t(errEl.dataset.key);
    });
    if (statusEl.dataset.key) statusEl.textContent = t(statusEl.dataset.key);
  }

  fetch('/api/config', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => { if (data && data.schedule) { schedule = data.schedule; renderStatic(); } })
    .catch(() => {});

  function zonedClock(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type).value;
    return { weekday: SHORT_DAYS.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  function withinHours(date) {
    const { weekday, minutes } = zonedClock(date, schedule.timezone);
    return schedule.days.includes(weekday) && minutes >= schedule.openMinutes && minutes + schedule.meetingMinutes <= schedule.closeMinutes;
  }
  function updatePhtPreview() {
    const d = dtInput.value ? new Date(dtInput.value) : null;
    if (!d || Number.isNaN(d.getTime()) || timezone === schedule.timezone) { phtPreview.hidden = true; return; }
    const s = new Intl.DateTimeFormat('en-US', { timeZone: schedule.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
    phtPreview.textContent = t('preview', { time: `${s} PHT` });
    phtPreview.hidden = false;
  }
  dtInput.addEventListener('input', updatePhtPreview);

  // Earliest selectable time: 1 hour from now, rounded to the next 15 minutes
  function toLocalInputValue(date) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function setMinDate() {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
    dtInput.min = toLocalInputValue(d);
    const max = new Date(); max.setFullYear(max.getFullYear() + 1);
    dtInput.max = toLocalInputValue(max);
  }
  setMinDate();

  brief.addEventListener('input', () => { briefCount.textContent = `${brief.value.length} / 5000`; });

  // ----- Errors -----
  function setError(field, key) {
    const input = form.elements[field];
    const errEl = document.getElementById(`err-${field}`);
    if (!input || !errEl) return;
    input.closest('.field').classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    errEl.dataset.key = key;
    errEl.textContent = t(key);
  }
  function clearError(field) {
    const input = form.elements[field];
    const errEl = document.getElementById(`err-${field}`);
    if (!input || !errEl) return;
    input.closest('.field').classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    delete errEl.dataset.key;
    errEl.textContent = '';
  }
  function showStatus(key) {
    if (key) statusEl.dataset.key = key; else delete statusEl.dataset.key;
    statusEl.textContent = key ? t(key) : '';
    statusEl.className = 'form-status' + (key ? ' error' : '');
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function validate(v) {
    const e = {};
    if (v.name.length < 2) e.name = 'name';
    if (!EMAIL_RE.test(v.email)) e.email = 'email';
    if (v.contact.length > 100) e.contact = 'contact';
    if (!v.serviceId) e.serviceId = 'service';
    if (!v.preferredLocal) e.preferredDateTime = 'dtRequired';
    else {
      const ms = new Date(v.preferredLocal).getTime();
      if (Number.isNaN(ms)) e.preferredDateTime = 'dtInvalid';
      else if (ms < Date.now() + 30 * 60 * 1000) e.preferredDateTime = 'dtSoon';
      else if (!withinHours(new Date(ms))) e.preferredDateTime = 'dtHours';
    }
    if (v.brief.length < 20) e.brief = 'briefShort';
    else if (v.brief.length > 5000) e.brief = 'briefLong';
    if (!v.consent) e.consent = 'consent';
    return e;
  }
  // Server error field -> message key
  const SERVER_KEYS = { name: 'name', email: 'email', contact: 'contact', serviceId: 'service', preferredDateTime: 'dtHours', brief: 'briefShort', consent: 'consent' };

  FIELDS.forEach((f) => {
    const el = form.elements[f];
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => clearError(f));
  });

  function setLoading(on) {
    submitBtn.classList.toggle('loading', on);
    submitBtn.disabled = on;
    submitBtn.querySelector('.btn-label').textContent = on ? t('sending') : t('submit');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('');
    FIELDS.forEach(clearError);

    const v = {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      contact: form.elements.contact.value.trim(),
      serviceId: serviceSelect.value,
      preferredLocal: dtInput.value,
      brief: brief.value.trim(),
      consent: form.elements.consent.checked,
      company_url: form.elements.company_url.value,
    };
    const errors = validate(v);
    const bad = Object.keys(errors);
    if (bad.length) {
      bad.forEach((f) => setError(f, errors[f]));
      form.elements[bad[0]].focus();
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: v.name,
          email: v.email,
          contact: v.contact,
          serviceId: v.serviceId,
          preferredDateTime: new Date(v.preferredLocal).toISOString(), // browser converts local time → UTC
          timezone,
          brief: v.brief,
          consent: v.consent,
          addons: window.MeirPackages ? window.MeirPackages.getSelection() : [],
          company_url: v.company_url, // honeypot
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        document.getElementById('success-name').textContent = v.name.split(' ')[0];
        document.getElementById('success-email').textContent = v.email;
        document.getElementById('success-id').textContent = data.id;
        form.hidden = true;
        successEl.hidden = false;
        successEl.focus();
        successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (data.errors) {
        const fields = Object.keys(data.errors).filter((f) => f !== 'addons');
        fields.forEach((f) => setError(f, SERVER_KEYS[f] || 'generic'));
        if (fields[0] && form.elements[fields[0]]) form.elements[fields[0]].focus();
        showStatus(data.errors.addons ? 'addons' : 'fix');
      } else {
        showStatus(res.status === 429 ? 'tooMany' : 'generic');
      }
    } catch (err) {
      showStatus('offline');
    } finally {
      setLoading(false);
    }
  });

  document.getElementById('book-another').addEventListener('click', () => {
    form.reset();
    briefCount.textContent = '0 / 5000';
    setMinDate();
    phtPreview.hidden = true;
    if (window.MeirPackages) window.MeirPackages.reset();
    successEl.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });

  renderStatic();
})();

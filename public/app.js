/* Meir Web Development Services: front-end behaviour */
(function () {
  'use strict';

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

  document.getElementById('year').textContent = new Date().getFullYear();

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

  // ---------- Booking form ----------
  const form = document.getElementById('booking-form');
  const serviceSelect = document.getElementById('serviceId');
  const dtInput = document.getElementById('preferredDateTime');
  const brief = document.getElementById('brief');
  const briefCount = document.getElementById('brief-count');
  const statusEl = document.getElementById('form-status');
  const submitBtn = document.getElementById('submit-btn');
  const successEl = document.getElementById('booking-success');
  const tzHint = document.getElementById('tz-hint');

  const timezone = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
  const phtPreview = document.getElementById('pht-preview');

  // Consultation hours (defaults = Philippine business hours). The server sends
  // its real config from /api/config and re-validates every booking.
  let schedule = {
    timezone: 'Asia/Manila',
    days: [1, 2, 3, 4, 5, 6],
    openMinutes: 9 * 60,
    closeMinutes: 18 * 60,
    meetingMinutes: 30,
    label: 'Monday to Saturday, 9:00 AM – 6:00 PM Philippine time (PHT)',
  };
  const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function renderHoursHint() {
    const local = timezone === schedule.timezone ? '' : ` Your browser is set to ${timezone.replace(/_/g, ' ')}; pick a time in your own clock and we'll convert it.`;
    tzHint.textContent = `Available ${schedule.label}.${local}`;
  }
  renderHoursHint();
  fetch('/api/config', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => { if (data && data.schedule) { schedule = data.schedule; renderHoursHint(); updatePhtPreview(); } })
    .catch(() => {});

  function zonedClock(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const get = (t) => parts.find((p) => p.type === t).value;
    return { weekday: SHORT_DAYS.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
  }
  function withinHours(date) {
    const { weekday, minutes } = zonedClock(date, schedule.timezone);
    return schedule.days.includes(weekday) && minutes >= schedule.openMinutes && minutes + schedule.meetingMinutes <= schedule.closeMinutes;
  }
  function formatBusinessTime(date) {
    const s = new Intl.DateTimeFormat('en-US', { timeZone: schedule.timezone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
    return schedule.timezone === 'Asia/Manila' ? `${s} PHT` : `${s} (${schedule.timezone})`;
  }
  // For clients outside the Philippines, show what their pick is in PHT.
  function updatePhtPreview() {
    const d = dtInput.value ? new Date(dtInput.value) : null;
    if (!d || Number.isNaN(d.getTime()) || timezone === schedule.timezone) { phtPreview.hidden = true; return; }
    phtPreview.textContent = `That's ${formatBusinessTime(d)} for us.`;
    phtPreview.hidden = false;
  }
  dtInput.addEventListener('input', updatePhtPreview);

  // "Book this service" buttons pre-select the dropdown and jump to the form
  function preselect(serviceId) {
    if (!serviceId) return;
    serviceSelect.value = serviceId;
    clearError('serviceId');
  }
  document.querySelectorAll('[data-service]').forEach((btn) => {
    btn.addEventListener('click', () => {
      preselect(btn.dataset.service);
      document.getElementById('book').scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => document.getElementById('name').focus({ preventScroll: true }), 500);
    });
  });
  document.querySelectorAll('[data-service-link]').forEach((a) => {
    a.addEventListener('click', () => preselect(a.dataset.serviceLink));
  });

  // Earliest selectable time: 1 hour from now, rounded up to the next 15 minutes
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

  brief.addEventListener('input', () => {
    briefCount.textContent = `${brief.value.length} / 5000`;
  });

  // ----- Validation helpers -----
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setError(field, message) {
    const input = form.elements[field];
    const errEl = document.getElementById(`err-${field}`);
    if (!input || !errEl) return;
    input.closest('.field').classList.add('invalid');
    input.setAttribute('aria-invalid', 'true');
    errEl.textContent = message;
  }
  function clearError(field) {
    const input = form.elements[field];
    const errEl = document.getElementById(`err-${field}`);
    if (!input || !errEl) return;
    input.closest('.field').classList.remove('invalid');
    input.removeAttribute('aria-invalid');
    errEl.textContent = '';
  }

  function validate(values) {
    const errors = {};
    if (values.name.length < 2) errors.name = 'Please enter your full name.';
    if (!EMAIL_RE.test(values.email)) errors.email = 'Please enter a valid email address.';
    if (values.contact.length > 100) errors.contact = 'Please keep this under 100 characters.';
    if (!values.serviceId) errors.serviceId = 'Please choose a service.';
    if (!values.preferredLocal) {
      errors.preferredDateTime = 'Please choose a preferred date and time.';
    } else {
      const t = new Date(values.preferredLocal).getTime();
      if (Number.isNaN(t)) errors.preferredDateTime = 'Please choose a valid date and time.';
      else if (t < Date.now() + 30 * 60 * 1000) errors.preferredDateTime = 'Please choose a time at least an hour from now.';
      else if (!withinHours(new Date(t))) errors.preferredDateTime = `Please pick a time within our consultation hours: ${schedule.label}.`;
    }
    if (!values.consent) errors.consent = 'Please confirm your consent so we can process your request.';
    if (values.brief.length < 20) errors.brief = 'Please share a bit more about your project (at least 20 characters).';
    if (values.brief.length > 5000) errors.brief = 'Please keep your brief under 5,000 characters.';
    return errors;
  }

  function readValues() {
    return {
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      contact: form.elements.contact.value.trim(),
      serviceId: serviceSelect.value,
      preferredLocal: dtInput.value,
      brief: brief.value.trim(),
      consent: form.elements.consent.checked,
      company_url: form.elements.company_url.value,
    };
  }

  // Clear a field's error as soon as the user fixes it
  const FIELDS = ['name', 'email', 'contact', 'serviceId', 'preferredDateTime', 'brief', 'consent'];
  FIELDS.forEach((f) => {
    const el = form.elements[f];
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => clearError(f));
  });

  function setLoading(on) {
    submitBtn.classList.toggle('loading', on);
    submitBtn.disabled = on;
    submitBtn.querySelector('.btn-label').textContent = on ? 'Booking…' : 'Submit / Book Consultation';
  }

  function showStatus(message) {
    statusEl.textContent = message;
    statusEl.className = 'form-status' + (message ? ' error' : '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    showStatus('');
    FIELDS.forEach(clearError);

    const values = readValues();
    const errors = validate(values);
    const fields = Object.keys(errors);
    if (fields.length) {
      fields.forEach((f) => setError(f, errors[f]));
      form.elements[fields[0]].focus();
      return;
    }

    const payload = {
      name: values.name,
      email: values.email,
      contact: values.contact,
      serviceId: values.serviceId,
      preferredDateTime: new Date(values.preferredLocal).toISOString(), // browser converts local → UTC
      timezone,
      brief: values.brief,
      consent: values.consent,
      company_url: values.company_url, // honeypot
    };

    setLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        document.getElementById('success-name').textContent = values.name.split(' ')[0];
        document.getElementById('success-email').textContent = values.email;
        document.getElementById('success-id').textContent = data.id;
        form.hidden = true;
        successEl.hidden = false;
        successEl.focus();
        return;
      }

      if (data.errors) {
        Object.entries(data.errors).forEach(([f, msg]) => setError(f, msg));
        const first = Object.keys(data.errors)[0];
        if (form.elements[first]) form.elements[first].focus();
      }
      showStatus(data.message || (res.status === 429
        ? 'Too many requests. Please wait a few minutes and try again.'
        : 'Something went wrong. Please try again.'));
    } catch (err) {
      showStatus("We couldn't reach the server. Please check your connection and try again, or email us at hello@meirwebdev.com.");
    } finally {
      setLoading(false);
    }
  });

  document.getElementById('book-another').addEventListener('click', () => {
    form.reset();
    briefCount.textContent = '0 / 5000';
    setMinDate();
    phtPreview.hidden = true;
    successEl.hidden = true;
    form.hidden = false;
    form.elements.name.focus();
  });
})();

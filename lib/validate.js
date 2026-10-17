const { SERVICE_BY_ID, priceSelection } = require('./services');
const { getSchedule, isWithinBusinessHours } = require('./schedule');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const HOUR = 60 * 60 * 1000;

const oneLine = (v, max) =>
  typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max + 1) : '';

function isValidTimeZone(tz) {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and normalises a booking payload from the client.
 * Returns { ok, errors, data }.
 */
function validateBooking(body = {}) {
  const errors = {};

  const name = oneLine(body.name, 120);
  if (name.length < 2) errors.name = 'Please enter your full name.';
  else if (name.length > 120) errors.name = 'Please keep your name under 120 characters.';

  const email = oneLine(body.email, 254).toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = 'Please enter a valid email address.';

  const contact = oneLine(body.contact, 100);
  if (contact.length > 100) errors.contact = 'Please keep this under 100 characters.';

  const serviceId = oneLine(body.serviceId, 64);
  const service = SERVICE_BY_ID[serviceId];
  if (!service) errors.serviceId = 'Please choose one of the listed services.';

  let preferredDateTime = '';
  const dt = new Date(typeof body.preferredDateTime === 'string' ? body.preferredDateTime : NaN);
  if (Number.isNaN(dt.getTime())) {
    errors.preferredDateTime = 'Please choose a preferred date and time.';
  } else if (dt.getTime() < Date.now() + 30 * 60 * 1000) {
    errors.preferredDateTime = 'Please choose a time at least an hour from now.';
  } else if (dt.getTime() > Date.now() + 366 * 24 * HOUR) {
    errors.preferredDateTime = 'Please choose a date within the next 12 months.';
  } else if (!isWithinBusinessHours(dt)) {
    errors.preferredDateTime = `Please pick a time within our consultation hours: ${getSchedule().label}.`;
  } else {
    preferredDateTime = dt.toISOString();
  }

  const timezone = isValidTimeZone(body.timezone) ? body.timezone : 'UTC';

  const brief =
    typeof body.brief === 'string'
      ? body.brief.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').trim()
      : '';
  if (brief.length < 20) errors.brief = 'Please share a bit more about your project (at least 20 characters).';
  else if (brief.length > 5000) errors.brief = 'Please keep your brief under 5,000 characters.';

  // Add-ons: checked against the catalog, and the estimate is calculated here (never trusted from the browser).
  let selection = { addons: [], estimate: null };
  if (service) {
    const priced = priceSelection(serviceId, body.addons);
    if (!priced.ok) errors.addons = priced.error;
    else selection = priced;
  }

  // Data Privacy Act of 2012 (RA 10173): explicit consent is required.
  if (body.consent !== true) {
    errors.consent = 'Please confirm your consent so we can process your request.';
  }

  const ok = Object.keys(errors).length === 0;
  return {
    ok,
    errors,
    data: ok
      ? {
          name,
          email,
          contact,
          serviceId,
          serviceName: service.name,
          preferredDateTime,
          timezone,
          brief,
          addons: selection.addons,
          estimate: selection.estimate,
          consentAt: new Date().toISOString(),
        }
      : null,
  };
}

module.exports = { validateBooking, isValidTimeZone };

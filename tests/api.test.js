// API smoke tests: `npm test` (runs in GitHub Actions on every push).
// Uses local JSON storage in a temp folder and console email, so no real
// Google or SMTP credentials are touched even if a .env file exists.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Blank values (not deleted) so dotenv won't refill them from a local .env.
Object.assign(process.env, {
  GOOGLE_SHEET_ID: '',
  GOOGLE_SERVICE_ACCOUNT_EMAIL: '',
  GOOGLE_PRIVATE_KEY: '',
  APPS_SCRIPT_WEBHOOK_URL: '',
  SMTP_HOST: '',
  OWNER_EMAIL: 'owner@example.com',
  OWNER_TIMEZONE: 'Asia/Manila',
  BUSINESS_DAYS: '1-6',
  BUSINESS_HOURS: '09:00-18:00',
  BOOKING_RATE_LIMIT: '100',
  DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'meir-test-')),
});

const app = require('../server');
const { isWithinBusinessHours } = require('../lib/schedule');

let server;
let base;
const realLog = console.log;
const realWarn = console.warn;

before(async () => {
  console.log = () => {};
  console.warn = () => {};
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  console.log = realLog;
  console.warn = realWarn;
  server.close();
});

/** Next date (≥2 days out) on the given Manila weekday at hh:mm PHT, as ISO. */
function nextManila(weekday, hh, mm = 0) {
  const d = new Date(Date.now() + 2 * 864e5);
  for (let i = 0; i < 8; i++) {
    const probe = new Date(d.getTime() + i * 864e5);
    const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(probe); // YYYY-MM-DD
    const candidate = new Date(`${ymd}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00+08:00`);
    // Noon PHT is 04:00 UTC on the same calendar date, so getUTCDay() = Manila weekday.
    if (new Date(`${ymd}T12:00:00+08:00`).getUTCDay() === weekday) {
      return candidate.toISOString();
    }
  }
  throw new Error('no date found');
}

const validBody = () => ({
  name: 'Juan Dela Cruz',
  email: 'juan@example.ph',
  contact: '0917 123 4567',
  serviceId: 'ecommerce',
  preferredDateTime: nextManila(2, 10), // Tuesday 10:00 AM PHT
  timezone: 'Asia/Manila',
  brief: 'Online store for our coffee brand with GCash and COD checkout.',
  consent: true,
});

const post = (body) =>
  fetch(`${base}/api/bookings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('health endpoint reports local storage and console email', async () => {
  const res = await fetch(`${base}/api/health`);
  const data = await res.json();
  assert.equal(res.status, 200);
  assert.equal(data.storage, 'local');
  assert.equal(data.email, 'console');
});

test('config exposes Philippine business hours', async () => {
  const data = await (await fetch(`${base}/api/config`)).json();
  assert.equal(data.schedule.timezone, 'Asia/Manila');
  assert.deepEqual(data.schedule.days, [1, 2, 3, 4, 5, 6]);
  assert.match(data.schedule.label, /Monday to Saturday, 9:00 AM – 6:00 PM Philippine time/);
});

test('homepage is served', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Meir Web Development Services/);
});

test('valid booking is saved and returns a reference', async () => {
  const res = await post(validBody());
  const data = await res.json();
  assert.equal(res.status, 201, JSON.stringify(data));
  assert.match(data.id, /^MWD-\d{6}-[0-9A-F]{6}$/);
  const saved = JSON.parse(fs.readFileSync(path.join(process.env.DATA_DIR, 'bookings.json'), 'utf8'));
  const row = saved.find((b) => b.id === data.id);
  assert.ok(row);
  assert.equal(row.email, 'juan@example.ph');
  assert.ok(row.consentAt);
});

test('booking without Data Privacy Act consent is rejected', async () => {
  const res = await post({ ...validBody(), consent: false });
  const data = await res.json();
  assert.equal(res.status, 422);
  assert.ok(data.errors.consent);
});

test('Sunday and after-hours slots are rejected', async () => {
  for (const preferredDateTime of [nextManila(0, 10), nextManila(3, 20), nextManila(3, 17, 45)]) {
    const res = await post({ ...validBody(), preferredDateTime });
    const data = await res.json();
    assert.equal(res.status, 422, preferredDateTime);
    assert.match(data.errors.preferredDateTime, /consultation hours/);
  }
});

test('invalid fields return per-field errors', async () => {
  const res = await post({ name: 'J', email: 'nope', serviceId: 'x', preferredDateTime: '2020-01-01T00:00:00Z', brief: 'short' });
  const data = await res.json();
  assert.equal(res.status, 422);
  for (const f of ['name', 'email', 'serviceId', 'preferredDateTime', 'brief', 'consent']) assert.ok(data.errors[f], f);
});

test('honeypot submissions are silently ignored', async () => {
  const res = await post({ company_url: 'http://spam.example' });
  assert.equal(res.status, 201);
});

test('business-hours helper handles the PHT boundaries', () => {
  assert.equal(isWithinBusinessHours(new Date(nextManila(1, 9, 0))), true); // Mon 9:00
  assert.equal(isWithinBusinessHours(new Date(nextManila(6, 17, 30))), true); // Sat 17:30 (ends 18:00)
  assert.equal(isWithinBusinessHours(new Date(nextManila(6, 17, 45))), false); // would end 18:15
  assert.equal(isWithinBusinessHours(new Date(nextManila(1, 8, 45))), false); // before opening
});

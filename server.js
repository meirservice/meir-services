/**
 * Meir Web Development Services: web server
 *
 *   GET  /                 static site (public/)
 *   GET  /api/health       health check
 *   GET  /api/services     list of bookable services
 *   POST /api/bookings     create a consultation booking
 *
 * Run locally:  npm install && npm run dev
 */
require('dotenv').config();

const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { SERVICES } = require('./lib/services');

// Public view of the catalog for the website (details, add-ons, prices).
const PUBLIC_PACKAGES = SERVICES.filter((s) => s.usd != null).map((s) => ({
  id: s.id, name: s.name, usd: s.usd, popular: !!s.popular, tagline: s.tagline, description: s.description,
  timeline: s.timeline, included: s.included, needFromYou: s.needFromYou,
  addons: s.addons.map((a) => ({ id: a.id, name: a.name, price: a.price, unit: a.unit || null, maxQty: a.maxQty || 1 })),
}));
const { getSchedule } = require('./lib/schedule');
const { validateBooking } = require('./lib/validate');
const { saveBooking, storageMode } = require('./lib/storage');
const { sendClientConfirmation, sendOwnerAlert } = require('./lib/mailer');

const app = express();
app.set('trust proxy', 1); // correct client IPs behind Render/Vercel/Netlify proxies
app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'sha256-" + crypto.createHash('sha256').update("document.documentElement.classList.add('js');").digest('base64') + "'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  })
);

app.use(express.json({ limit: '20kb' }));

// ---------- API ----------
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.BOOKING_RATE_LIMIT || 5),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, message: 'Too many booking attempts. Please wait a few minutes and try again.' },
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, storage: storageMode(), email: process.env.SMTP_HOST ? 'smtp' : 'console', time: new Date().toISOString() });
});

app.get('/api/services', (req, res) => {
  res.json({ ok: true, services: SERVICES.map((s) => ({ id: s.id, name: s.name })) });
});

app.get('/api/packages', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ ok: true, packages: PUBLIC_PACKAGES });
});

// Booking rules the front end uses to guide the date picker (the server re-checks them).
app.get('/api/config', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ ok: true, schedule: getSchedule() });
});

function makeBookingId() {
  const d = new Date();
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `MWD-${ymd}-${rand}`;
}

app.post('/api/bookings', bookingLimiter, async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  // Honeypot: real users never see this field. Pretend success so bots move on.
  if (body.company_url) {
    return res.status(201).json({ ok: true, id: makeBookingId() });
  }

  const { ok, errors, data } = validateBooking(body);
  if (!ok) {
    return res.status(422).json({ ok: false, message: 'Please fix the highlighted fields and try again.', errors });
  }

  const booking = {
    id: makeBookingId(),
    createdAt: new Date().toISOString(),
    status: 'New',
    ...data,
  };

  // 1) Persist first: if this fails, tell the user so they can retry.
  try {
    await saveBooking(booking);
  } catch (err) {
    console.error(`[booking] storage failed (${storageMode()}):`, err.message);
    return res.status(500).json({
      ok: false,
      message: "We couldn't save your request just now. Please try again in a minute, or email us directly.",
    });
  }

  // 2) Emails: the booking is already saved, so failures are logged, not fatal.
  //    We await them so serverless platforms don't freeze the function mid-send.
  const [clientMail, ownerMail] = await Promise.allSettled([sendClientConfirmation(booking), sendOwnerAlert(booking)]);
  if (clientMail.status === 'rejected') console.error(`[booking ${booking.id}] client email failed:`, clientMail.reason?.message);
  if (ownerMail.status === 'rejected') console.error(`[booking ${booking.id}] owner email failed:`, ownerMail.reason?.message);

  console.log(`[booking] ${booking.id} saved via ${storageMode()} for ${booking.serviceName}`);
  return res.status(201).json({ ok: true, id: booking.id, confirmationEmailSent: clientMail.status === 'fulfilled' });
});

app.use('/api', (req, res) => res.status(404).json({ ok: false, message: 'Not found' }));

// ---------- Static site ----------
app.use(
  express.static(path.join(__dirname, 'public'), {
    extensions: ['html'],
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
  })
);
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')));

// Generic error handler (e.g. malformed JSON)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ ok: false, message: 'Invalid JSON body.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ ok: false, message: 'Request too large.' });
  console.error(err);
  res.status(500).json({ ok: false, message: 'Unexpected server error.' });
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => {
    console.log(`Meir Web Development Services running at http://localhost:${port}`);
    console.log(`  storage: ${storageMode()} | email: ${process.env.SMTP_HOST ? 'smtp' : 'console (dev)'}`);
  });
}

module.exports = app;

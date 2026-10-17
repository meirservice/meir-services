// Sends a sample client confirmation + owner alert using your .env settings.
// Usage: npm run test:email -- you@example.com
require('dotenv').config();
const { sendClientConfirmation, sendOwnerAlert, verifyMailer } = require('../lib/mailer');

(async () => {
  const to = process.argv[2] || process.env.OWNER_EMAIL;
  if (!to) {
    console.error('Pass an address: npm run test:email -- you@example.com');
    process.exit(1);
  }
  const mode = await verifyMailer();
  console.log(`Mailer OK (${mode}). Sending test emails to ${to}…`);
  const booking = {
    id: 'MWD-TEST-000000',
    createdAt: new Date().toISOString(),
    status: 'Test',
    name: 'Test Client',
    email: to,
    contact: '0917 000 0000',
    serviceId: 'business-website',
    serviceName: 'Full Business Website',
    preferredDateTime: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString(),
    timezone: process.env.OWNER_TIMEZONE || 'Asia/Manila',
    consentAt: new Date().toISOString(),
    brief: 'This is a test booking sent from scripts/test-email.js.\nIf you can read this, email is configured correctly.',
  };
  await sendClientConfirmation(booking);
  await sendOwnerAlert(booking);
  console.log('Done. Check the inbox (and spam folder).');
})().catch((err) => {
  console.error('Email test failed:', err.message);
  process.exit(1);
});

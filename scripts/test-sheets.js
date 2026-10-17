// Appends a clearly-marked test row using your configured storage backend.
// Usage: npm run test:sheets
require('dotenv').config();
const { saveBooking, storageMode } = require('../lib/storage');

(async () => {
  const mode = storageMode();
  console.log(`Storage mode: ${mode}`);
  if (mode === 'local') console.log('(No Google settings found: writing to data/bookings.json)');
  await saveBooking({
    id: `MWD-TEST-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'Test',
    name: 'Test Row (safe to delete)',
    email: 'test@example.com',
    contact: '',
    serviceId: 'not-sure',
    serviceName: 'Not sure yet, please recommend one',
    preferredDateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    timezone: process.env.OWNER_TIMEZONE || 'Asia/Manila',
    consentAt: new Date().toISOString(),
    brief: 'Connection test from scripts/test-sheets.js',
  });
  console.log('Row written successfully.');
})().catch((err) => {
  console.error('Storage test failed:', err.message);
  process.exit(1);
});

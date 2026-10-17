/**
 * Booking storage. Picks a backend automatically based on environment variables:
 *
 *   1. "google-sheets": Google Sheets API with a service account
 *      (GOOGLE_SHEET_ID + GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY)
 *   2. "apps-script":   POST to a Google Apps Script web app that appends the row
 *      (APPS_SCRIPT_WEBHOOK_URL + APPS_SCRIPT_SECRET)
 *   3. "local":         append to data/bookings.json (development only;
 *      serverless hosts like Vercel have no persistent disk)
 */
const fs = require('fs/promises');
const path = require('path');
const { formatInZone } = require('./format');
const { addonsSummary } = require('./services');

const HEADERS = [
  'Booking ID',
  'Submitted At (UTC)',
  'Status',
  'Client Name',
  'Email',
  'Phone / Discord',
  'Package',
  'Preferred Date & Time (Client)',
  'Client Time Zone',
  'Preferred Date & Time (Business TZ)',
  'Preferred Date & Time (UTC ISO)',
  'Project Brief',
  'Privacy Consent (RA 10173)',
  'Add-ons',
  'Estimated Total (USD)',
];

function toRow(b) {
  const ownerTz = process.env.OWNER_TIMEZONE || 'Asia/Manila';
  return [
    b.id,
    b.createdAt,
    b.status,
    b.name,
    b.email,
    b.contact || '',
    b.serviceName,
    formatInZone(b.preferredDateTime, b.timezone),
    b.timezone,
    formatInZone(b.preferredDateTime, ownerTz),
    b.preferredDateTime,
    b.brief,
    b.consentAt ? `Yes, ${b.consentAt}` : 'No',
    addonsSummary(b.addons),
    b.estimate == null ? '' : b.estimate,
  ];
}

function storageMode() {
  const e = process.env;
  if (e.GOOGLE_SHEET_ID && e.GOOGLE_SERVICE_ACCOUNT_EMAIL && e.GOOGLE_PRIVATE_KEY) return 'google-sheets';
  if (e.APPS_SCRIPT_WEBHOOK_URL) return 'apps-script';
  return 'local';
}

// ---------------------------------------------------------------------------
// 1) Google Sheets API (service account)
// ---------------------------------------------------------------------------
let sheetsClient = null;
let headerChecked = false;

function getSheetsClient() {
  if (sheetsClient) return sheetsClient;
  const { sheets, auth } = require('@googleapis/sheets');
  const googleAuth = new auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // .env files and dashboards store newlines as literal "\n"; restore them.
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = sheets({ version: 'v4', auth: googleAuth });
  return sheetsClient;
}

function sheetRange(a1) {
  const tab = process.env.GOOGLE_SHEET_TAB || 'Bookings';
  return `'${tab.replace(/'/g, "''")}'!${a1}`;
}

async function ensureHeaderRow(client, spreadsheetId) {
  if (headerChecked) return;
  const res = await client.spreadsheets.values.get({ spreadsheetId, range: sheetRange('A1:O1') });
  if (!res.data.values || res.data.values.length === 0) {
    await client.spreadsheets.values.update({
      spreadsheetId,
      range: sheetRange('A1'),
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
  }
  headerChecked = true;
}

async function appendToGoogleSheet(booking) {
  const client = getSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  await ensureHeaderRow(client, spreadsheetId);
  await client.spreadsheets.values.append({
    spreadsheetId,
    range: sheetRange('A:O'),
    valueInputOption: 'RAW', // RAW = values are stored as plain text, never evaluated as formulas
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [toRow(booking)] },
  });
}

// ---------------------------------------------------------------------------
// 2) Google Apps Script web app (no Google Cloud project needed)
// ---------------------------------------------------------------------------
async function postToAppsScript(booking) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(process.env.APPS_SCRIPT_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight quirks in Apps Script
      body: JSON.stringify({ secret: process.env.APPS_SCRIPT_SECRET || '', headers: HEADERS, row: toRow(booking) }),
      redirect: 'follow',
      signal: controller.signal,
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = null; }
    if (!res.ok || !data || data.ok !== true) {
      throw new Error(`Apps Script rejected the row (HTTP ${res.status}): ${data && data.error ? data.error : text.slice(0, 200)}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 3) Local JSON file (development fallback)
// ---------------------------------------------------------------------------
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');
let writeQueue = Promise.resolve();

function appendToLocalFile(booking) {
  // Serialise writes so concurrent requests don't clobber each other.
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    let list = [];
    try {
      list = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
      if (!Array.isArray(list)) list = [];
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    list.push(booking);
    const tmp = `${DATA_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(list, null, 2));
    await fs.rename(tmp, DATA_FILE);
  });
  return writeQueue;
}

// ---------------------------------------------------------------------------
async function saveBooking(booking) {
  const mode = storageMode();
  if (mode === 'google-sheets') return appendToGoogleSheet(booking);
  if (mode === 'apps-script') return postToAppsScript(booking);
  return appendToLocalFile(booking);
}

module.exports = { saveBooking, storageMode, HEADERS, toRow };

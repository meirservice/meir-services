/**
 * Meir Web Development Services: Google Sheets booking webhook (Option B)
 *
 * Paste this into Extensions → Apps Script of the Google Sheet that should
 * receive bookings. See README.md → "Option B: Google Apps Script" for steps.
 *
 * Security: set a Script Property named SHARED_SECRET (Project Settings →
 * Script properties) to the same value as APPS_SCRIPT_SECRET in your .env.
 */
const SHEET_NAME = 'Bookings';

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // avoid two simultaneous bookings writing the same row

    const body = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
    if (!secret || body.secret !== secret) {
      return json({ ok: false, error: 'Unauthorized' });
    }
    if (!Array.isArray(body.row) || !Array.isArray(body.headers)) {
      return json({ ok: false, error: 'Bad payload' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(body.headers);
      sheet.getRange(1, 1, 1, body.headers.length).setFontWeight('bold').setBackground('#0b1020').setFontColor('#ffffff');
      sheet.setFrozenRows(1);
    }

    sheet.appendRow(body.row.map(safeCell));
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Optional: visiting the web app URL in a browser shows it's alive.
function doGet() {
  return json({ ok: true, service: 'meir-bookings-webhook' });
}

// Prevent spreadsheet formula injection (e.g. a "name" of =IMPORTXML(...)).
function safeCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

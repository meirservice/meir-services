/**
 * Email notifications via Nodemailer (any SMTP provider: Gmail, Resend,
 * SendGrid, Brevo, Mailgun, Zoho, your host's mailbox...).
 *
 * If SMTP_HOST is not set, emails are printed to the console instead of sent,
 * so the app still works out of the box in development.
 */
const nodemailer = require('nodemailer');
const { formatInZone, escapeHtml } = require('./format');

let transporter = null;
let devMode = false;

function getTransporter() {
  if (transporter) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST) {
    const port = Number(SMTP_PORT || 587);
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: SMTP_SECURE ? SMTP_SECURE === 'true' : port === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
  } else {
    devMode = true;
    transporter = nodemailer.createTransport({ jsonTransport: true });
    console.warn('[mail] SMTP_HOST not set: emails will be logged to the console, not sent.');
  }
  return transporter;
}

const brand = () => ({
  name: process.env.BUSINESS_NAME || 'Meir Web Development Services',
  from: process.env.MAIL_FROM || `"Meir Web Development Services" <${process.env.SMTP_USER || 'no-reply@example.com'}>`,
  ownerEmail: process.env.OWNER_EMAIL,
  ownerTz: process.env.OWNER_TIMEZONE || 'Asia/Manila',
  siteUrl: process.env.SITE_URL || '',
  replyTo: process.env.REPLY_TO_EMAIL || process.env.OWNER_EMAIL,
});

async function send(message) {
  const info = await getTransporter().sendMail(message);
  if (devMode) {
    const m = JSON.parse(info.message);
    console.log(`[mail:dev] To: ${m.to.map((t) => t.address).join(', ')} | Subject: ${m.subject}`);
  }
  return info;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------
function layout({ preheader, heading, bodyHtml }) {
  const b = brand();
  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#f7f6f2;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#1c2236;">
<span style="display:none!important;opacity:0;color:transparent;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f2;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2dfd5;">
    <tr><td style="background:#0b1020;padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;height:36px;background:#ff6b3d;border-radius:10px;text-align:center;font:800 20px/36px Arial,sans-serif;color:#0b1020;">M</td>
        <td style="padding-left:12px;font:700 17px Arial,sans-serif;color:#ffffff;">${escapeHtml(b.name)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px;font:800 24px/1.25 Arial,sans-serif;color:#0b1020;">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 32px;background:#f7f6f2;font-size:12px;color:#5d6478;line-height:1.6;">
      ${escapeHtml(b.name)}${b.siteUrl ? ` · <a href="${escapeHtml(b.siteUrl)}" style="color:#e8542a;">${escapeHtml(b.siteUrl.replace(/^https?:\/\//, ''))}</a>` : ''}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function detailsTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2dfd5;border-radius:12px;border-collapse:separate;margin:8px 0 24px;">
${rows
  .map(
    ([label, value], i) => `<tr>
  <td style="padding:12px 16px;width:38%;font-size:13px;font-weight:600;color:#5d6478;vertical-align:top;${i ? 'border-top:1px solid #efede6;' : ''}">${escapeHtml(label)}</td>
  <td style="padding:12px 16px;font-size:14px;color:#0b1020;vertical-align:top;${i ? 'border-top:1px solid #efede6;' : ''}">${value}</td>
</tr>`
  )
  .join('')}
</table>`;
}

function nl2br(text) {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// Calendar invite (.ics) so the client can hold the requested slot.
function buildIcs(b) {
  const fmt = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(b.preferredDateTime);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  const name = brand().name;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${esc(name)}//Consultation Booking//EN`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${b.id}@meir-webdev`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(`Consultation with ${name}`)}`,
    `DESCRIPTION:${esc(`Requested consultation: ${b.serviceName}\nReference: ${b.id}\nWe'll confirm the meeting link by email.`)}`,
    'STATUS:TENTATIVE',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

// ---------------------------------------------------------------------------
// Public senders
// ---------------------------------------------------------------------------
async function sendClientConfirmation(b) {
  const br = brand();
  const firstName = b.name.split(' ')[0];
  const when = formatInZone(b.preferredDateTime, b.timezone);
  const whenPht = b.timezone !== br.ownerTz ? formatInZone(b.preferredDateTime, br.ownerTz) : null;
  const timeCell = whenPht
    ? `${escapeHtml(when)}<br><span style="color:#5d6478;font-size:12px;">${escapeHtml(whenPht)}</span>`
    : escapeHtml(when);

  const html = layout({
    preheader: `We received your consultation request for ${when}.`,
    heading: `Salamat, ${firstName}! Your consultation request is in.`,
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">We've received your request and reserved your preferred time. We'll confirm the slot and send a meeting link within <b>one business day</b>.</p>
      ${detailsTable([
        ['Reference', `<code style="font-family:Menlo,monospace;">${escapeHtml(b.id)}</code>`],
        ['Service', escapeHtml(b.serviceName)],
        ['Preferred time', timeCell],
        ['Mobile / Viber / Discord', escapeHtml(b.contact || 'Email only')],
      ])}
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#5d6478;">Your project brief</p>
      <div style="background:#f7f6f2;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;margin-bottom:24px;">${nl2br(b.brief)}</div>
      <p style="margin:0 0 6px;font-size:15px;line-height:1.6;">Need to change something? Just reply to this email. We're available Monday to Saturday, 9 AM to 6 PM Philippine time.</p>
      <p style="margin:0;font-size:15px;line-height:1.6;">Talk soon,<br><b>${escapeHtml(br.name)}</b></p>`,
  });

  const text = [
    `Salamat, ${firstName}! Your consultation request is in.`,
    '',
    `Reference: ${b.id}`,
    `Service: ${b.serviceName}`,
    `Preferred time: ${when}${whenPht ? ` (${whenPht})` : ''}`,
    `Mobile / Viber / Discord: ${b.contact || 'Email only'}`,
    '',
    'Your project brief:',
    b.brief,
    '',
    "We'll confirm your slot and send a meeting link within one business day.",
    'Need to change something? Just reply to this email.',
    '',
    br.name,
  ].join('\n');

  return send({
    from: br.from,
    to: `"${b.name.replace(/"/g, '')}" <${b.email}>`,
    replyTo: br.replyTo,
    subject: `Consultation request received: ${when}`,
    text,
    html,
    attachments: [{ filename: 'consultation.ics', content: buildIcs(b), contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }],
  });
}

async function sendOwnerAlert(b) {
  const br = brand();
  if (!br.ownerEmail) {
    console.warn('[mail] OWNER_EMAIL not set: skipping owner alert.');
    return null;
  }
  const whenOwner = formatInZone(b.preferredDateTime, br.ownerTz);
  const whenClient = formatInZone(b.preferredDateTime, b.timezone);
  const contact = b.contact ? escapeHtml(b.contact) : '<span style="color:#9a9fae;">Not provided</span>';

  const html = layout({
    preheader: `${b.name}: ${b.serviceName} on ${whenOwner}`,
    heading: 'New consultation booked 🎉',
    bodyHtml: `
      ${detailsTable([
        ['Reference', `<code style="font-family:Menlo,monospace;">${escapeHtml(b.id)}</code>`],
        ['Client', escapeHtml(b.name)],
        ['Email', `<a href="mailto:${escapeHtml(b.email)}" style="color:#e8542a;">${escapeHtml(b.email)}</a>`],
        ['Mobile / Viber / Discord', contact],
        ['Service', escapeHtml(b.serviceName)],
        ['Your time', `<b>${escapeHtml(whenOwner)}</b>`],
        ["Client's time", `${escapeHtml(whenClient)}<br><span style="color:#5d6478;font-size:12px;">${escapeHtml(b.timezone)}</span>`],
        ['Submitted', escapeHtml(formatInZone(b.createdAt, br.ownerTz))],
        ['Privacy consent', b.consentAt ? 'Given (RA 10173)' : 'Not recorded'],
      ])}
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#5d6478;">Project brief</p>
      <div style="background:#f7f6f2;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;margin-bottom:20px;">${nl2br(b.brief)}</div>
      <p style="margin:0;font-size:13px;color:#5d6478;">Hit reply to respond directly to the client.</p>`,
  });

  const text = [
    'New consultation booked',
    '',
    `Reference: ${b.id}`,
    `Client: ${b.name}`,
    `Email: ${b.email}`,
    `Mobile / Viber / Discord: ${b.contact || 'Not provided'}`,
    `Service: ${b.serviceName}`,
    `Your time: ${whenOwner}`,
    `Client's time: ${whenClient} (${b.timezone})`,
    '',
    'Project brief:',
    b.brief,
  ].join('\n');

  return send({
    from: br.from,
    to: br.ownerEmail,
    replyTo: `"${b.name.replace(/"/g, '')}" <${b.email}>`,
    subject: `New booking: ${b.name} · ${b.serviceName}`,
    text,
    html,
  });
}

async function verifyMailer() {
  const t = getTransporter();
  if (devMode) return 'dev (console)';
  await t.verify();
  return 'smtp';
}

module.exports = { sendClientConfirmation, sendOwnerAlert, verifyMailer, buildIcs };

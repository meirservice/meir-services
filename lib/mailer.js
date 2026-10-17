/**
 * Email notifications via Nodemailer (any SMTP provider: Gmail, Resend,
 * SendGrid, Brevo, Mailgun, Zoho, your host's mailbox...).
 *
 * If SMTP_HOST is not set, emails are printed to the console instead of sent,
 * so the app still works out of the box in development.
 */
const nodemailer = require('nodemailer');
const { formatInZone, escapeHtml } = require('./format');
const { priceLabel, addonsSummary, usd } = require('./services');

const packageLabel = (b) => {
  const price = priceLabel(b.serviceId);
  return price ? `${b.serviceName} (${price})` : b.serviceName;
};

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
<body style="margin:0;padding:0;background:#f4f9fe;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#24364d;">
<span style="display:none!important;opacity:0;color:transparent;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f9fe;padding:32px 12px;">
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d3e6f8;">
    <tr><td style="background:#3a8fd9;padding:24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:36px;height:36px;background:#ffffff;border-radius:10px;text-align:center;font:800 20px/36px Arial,sans-serif;color:#2373bd;">M</td>
        <td style="padding-left:12px;font:700 17px Arial,sans-serif;color:#ffffff;">${escapeHtml(b.name)}</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:32px;">
      <h1 style="margin:0 0 16px;font:800 24px/1.25 Arial,sans-serif;color:#0f2a4a;">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 32px;background:#f4f9fe;font-size:12px;color:#5b6b80;line-height:1.6;">
      ${escapeHtml(b.name)}${b.siteUrl ? ` · <a href="${escapeHtml(b.siteUrl)}" style="color:#2373bd;">${escapeHtml(b.siteUrl.replace(/^https?:\/\//, ''))}</a>` : ''}<br>
      WhatsApp: <a href="https://wa.me/639761329770" style="color:#2373bd;">+63 976 132 9770</a> · Email: <a href="mailto:meirwebdevelopment@gmail.com" style="color:#2373bd;">meirwebdevelopment@gmail.com</a> · <a href="https://www.facebook.com/profile.php?id=61595222862408" style="color:#2373bd;">Facebook</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function detailsTable(rows) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #d3e6f8;border-radius:12px;border-collapse:separate;margin:8px 0 24px;">
${rows
  .map(
    ([label, value], i) => `<tr>
  <td style="padding:12px 16px;width:38%;font-size:13px;font-weight:600;color:#5b6b80;vertical-align:top;${i ? 'border-top:1px solid #e8f3fd;' : ''}">${escapeHtml(label)}</td>
  <td style="padding:12px 16px;font-size:14px;color:#0f2a4a;vertical-align:top;${i ? 'border-top:1px solid #e8f3fd;' : ''}">${value}</td>
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
// Client email wording.
const CLIENT_COPY = {
  en: {
    locale: 'en-US',
    subject: (when) => `Booking request received: ${when}`,
    preheader: (when) => `We received your consultation request for ${when}.`,
    heading: (name) => `Thank you, ${name}! Your consultation request is in.`,
    intro: 'Thank you for booking a free consultation with us. Here are the details we received:',
    reference: 'Reference',
    package: 'Package',
    time: 'Preferred time',
    contact: 'Phone / WhatsApp / Viber',
    emailOnly: 'Email only',
    about: 'About your business / project',
    nextTitle: 'What happens next',
    next: [
      '<b>We confirm your schedule</b> by email within one business day, with your meeting link.',
      '<b>We meet for 30 minutes</b> to plan your website, then send you a written quote.',
      '<b>Only if you decide to proceed</b>, we email you the payment details and deposit instructions. We accept <b>PayPal</b> and <b>Wise</b>, plus <b>GCash, RCBC, MariBank and BDO</b> via QR code for clients in the Philippines.',
    ],
    note: "You don't need to pay anything now. You only pay after you confirm you want to proceed, using the payment details we email you at that point.",
    change: "Need to change something? Just reply to this email, or message us on WhatsApp at +63 976 132 9770. We're available Monday to Sunday, 8 AM to 8 PM Philippine time (UTC+8).",
    signoff: 'Talk soon,',
  },
};

const stripTags = (html) => html.replace(/<[^>]+>/g, '');

async function sendClientConfirmation(b) {
  const br = brand();
  const c = CLIENT_COPY.en;
  const firstName = b.name.split(' ')[0];
  const when = formatInZone(b.preferredDateTime, b.timezone, c.locale);
  const whenPht = b.timezone !== br.ownerTz ? formatInZone(b.preferredDateTime, br.ownerTz, c.locale) : null;
  const timeCell = whenPht
    ? `${escapeHtml(when)}<br><span style="color:#5b6b80;font-size:12px;">${escapeHtml(whenPht)}</span>`
    : escapeHtml(when);

  const html = layout({
    preheader: c.preheader(when),
    heading: c.heading(firstName),
    bodyHtml: `
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">${c.intro}</p>
      ${detailsTable([
        [c.reference, `<code style="font-family:Menlo,monospace;">${escapeHtml(b.id)}</code>`],
        [c.package, escapeHtml(packageLabel(b))],
        ...(b.addons && b.addons.length ? [['Add-ons', escapeHtml(addonsSummary(b.addons))]] : []),
        ...(b.estimate != null ? [['Estimated total', `<b>${escapeHtml(usd(b.estimate))}</b> <span style="color:#5b6b80;font-size:12px;">(final price confirmed in your written quote)</span>`]] : []),
        [c.time, timeCell],
        [c.contact, escapeHtml(b.contact || c.emailOnly)],
      ])}
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#5b6b80;">${c.about}</p>
      <div style="background:#f4f9fe;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;margin-bottom:24px;">${nl2br(b.brief)}</div>
      <p style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f2a4a;">${c.nextTitle}</p>
      <ol style="margin:0 0 22px;padding-left:20px;font-size:15px;line-height:1.7;">
        ${c.next.map((li) => `<li>${li}</li>`).join('\n        ')}
      </ol>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;background:#e8f3fd;border-radius:10px;padding:12px 14px;">${c.note}</p>
      <p style="margin:0 0 6px;font-size:15px;line-height:1.6;">${c.change}</p>
      <p style="margin:0;font-size:15px;line-height:1.6;">${c.signoff}<br><b>${escapeHtml(br.name)}</b></p>`,
  });

  const text = [
    c.heading(firstName),
    '',
    `${c.reference}: ${b.id}`,
    `${c.package}: ${packageLabel(b)}`,
    ...(b.addons && b.addons.length ? [`Add-ons: ${addonsSummary(b.addons)}`] : []),
    ...(b.estimate != null ? [`Estimated total: ${usd(b.estimate)} (final price confirmed in your written quote)`] : []),
    `${c.time}: ${when}${whenPht ? ` (${whenPht})` : ''}`,
    `${c.contact}: ${b.contact || c.emailOnly}`,
    '',
    `${c.about}:`,
    b.brief,
    '',
    `${c.nextTitle}:`,
    ...c.next.map((li, i) => `${i + 1}. ${stripTags(li)}`),
    '',
    c.note,
    c.change,
    '',
    c.signoff,
    br.name,
  ].join('\n');

  return send({
    from: br.from,
    to: `"${b.name.replace(/"/g, '')}" <${b.email}>`,
    replyTo: br.replyTo,
    subject: c.subject(when),
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
        ['Email', `<a href="mailto:${escapeHtml(b.email)}" style="color:#2373bd;">${escapeHtml(b.email)}</a>`],
        ['Phone / WhatsApp / Viber', contact],
        ['Package', escapeHtml(packageLabel(b))],
        ['Add-ons', escapeHtml(addonsSummary(b.addons))],
        ['Estimated total', b.estimate != null ? `<b>${escapeHtml(usd(b.estimate))}</b>` : 'To be quoted'],
        ['Your time', `<b>${escapeHtml(whenOwner)}</b>`],
        ["Client's time", `${escapeHtml(whenClient)}<br><span style="color:#5b6b80;font-size:12px;">${escapeHtml(b.timezone)}</span>`],
        ['Submitted', escapeHtml(formatInZone(b.createdAt, br.ownerTz))],
        ['Privacy consent', b.consentAt ? 'Given (RA 10173)' : 'Not recorded'],
      ])}
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#5b6b80;">About their business / project</p>
      <div style="background:#f4f9fe;border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.6;margin-bottom:20px;">${nl2br(b.brief)}</div>
      <p style="margin:0;font-size:13px;color:#5b6b80;">Next: hit reply to confirm the schedule. Send the payment details (PayPal, Wise or QR code) and deposit instructions only after the client confirms they will proceed.</p>`,
  });

  const text = [
    'New consultation booked',
    '',
    `Reference: ${b.id}`,
    `Client: ${b.name}`,
    `Email: ${b.email}`,
    `Phone / WhatsApp / Viber: ${b.contact || 'Not provided'}`,
    `Package: ${packageLabel(b)}`,
    `Add-ons: ${addonsSummary(b.addons)}`,
    `Estimated total: ${b.estimate != null ? usd(b.estimate) : 'To be quoted'}`,
    `Your time: ${whenOwner}`,
    `Client's time: ${whenClient} (${b.timezone})`,
    '',
    'About their business / project:',
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

// Small formatting helpers shared by storage and email code.

// Intl labels Asia/Manila as "GMT+8" (en-US) or "PST" (en-PH, easily confused
// with US Pacific time), so we use the common local abbreviation "PHT" instead.
const TZ_ABBR = { 'Asia/Manila': 'PHT' };

function formatInZone(iso, timeZone) {
  const date = new Date(iso);
  try {
    const base = new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
    let abbr = TZ_ABBR[timeZone];
    if (!abbr) {
      const part = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
        .formatToParts(date)
        .find((p) => p.type === 'timeZoneName');
      abbr = part ? part.value : timeZone;
    }
    return `${base} ${abbr}`;
  } catch {
    return date.toUTCString();
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { formatInZone, escapeHtml };

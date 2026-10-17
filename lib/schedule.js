/**
 * Consultation availability. Defaults to Philippine business hours:
 * Monday to Sunday, 8:00 AM to 8:00 PM, Asia/Manila (PHT, UTC+8).
 *
 * Configure with env vars:
 *   OWNER_TIMEZONE=Asia/Manila
 *   BUSINESS_DAYS=0-6            (0=Sun … 6=Sat; ranges or lists, e.g. "1-5" or "1,3,5")
 *   BUSINESS_HOURS=08:00-20:00
 *   MEETING_MINUTES=30
 */
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDays(spec) {
  const days = new Set();
  String(spec)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [a, b] = part.split('-').map((n) => Number(n));
      if (Number.isNaN(a)) return;
      const end = Number.isNaN(b) ? a : b;
      for (let d = a; d <= end; d++) days.add(d % 7);
    });
  return days.size ? [...days].sort((x, y) => x - y) : [1, 2, 3, 4, 5, 6];
}

function parseHours(spec) {
  const m = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/.exec(String(spec).trim());
  if (!m) return [9 * 60, 18 * 60];
  const open = Number(m[1]) * 60 + Number(m[2]);
  const close = Number(m[3]) * 60 + Number(m[4]);
  return close > open ? [open, close] : [9 * 60, 18 * 60];
}

function to12h(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

function daysLabel(days) {
  if (days.length === 7) return 'Monday to Sunday';
  const contiguous = days.every((d, i) => i === 0 || d === days[i - 1] + 1);
  if (days.length > 2 && contiguous) return `${DAY_NAMES[days[0]]} to ${DAY_NAMES[days[days.length - 1]]}`;
  return days.map((d) => DAY_NAMES[d]).join(', ');
}

function getSchedule() {
  const timezone = process.env.OWNER_TIMEZONE || 'Asia/Manila';
  const days = parseDays(process.env.BUSINESS_DAYS || '0-6');
  const [openMinutes, closeMinutes] = parseHours(process.env.BUSINESS_HOURS || '08:00-20:00');
  const meetingMinutes = Math.min(Math.max(Number(process.env.MEETING_MINUTES) || 30, 15), 240);
  const tzLabel = timezone === 'Asia/Manila' ? 'Philippine time (PHT)' : timezone;
  return {
    timezone,
    days,
    openMinutes,
    closeMinutes,
    meetingMinutes,
    label: `${daysLabel(days)}, ${to12h(openMinutes)} – ${to12h(closeMinutes)} ${tzLabel}`,
  };
}

/** Weekday + minutes-since-midnight of a Date in a given IANA time zone. */
function zonedClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  return { weekday: SHORT_DAYS.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** True if a meeting starting at `date` fits fully inside business hours. */
function isWithinBusinessHours(date, schedule = getSchedule()) {
  const { weekday, minutes } = zonedClock(date, schedule.timezone);
  return (
    schedule.days.includes(weekday) &&
    minutes >= schedule.openMinutes &&
    minutes + schedule.meetingMinutes <= schedule.closeMinutes
  );
}

module.exports = { getSchedule, isWithinBusinessHours, zonedClock, parseDays, parseHours };

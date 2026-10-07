/**
 * Get the nearest Thursday from a given date
 */
export const getNearestThursday = (inputDate) => {
  let dateString = inputDate;
  if (typeof inputDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(inputDate));
    const part = type => parts.find(p => p.type === type).value;
    dateString = `${part('year')}-${part('month')}-${part('day')}`;
  }
  const d = new Date(`${dateString}T12:00:00Z`);
  let diff = (4 - d.getUTCDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
};

/**
 * Check if a date string is a Thursday
 */
export const isThursday = (dateStr) => {
  const date = new Date(`${dateStr}T12:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '') && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === dateStr && date.getUTCDay() === 4;
};

/** Civil date used by tours, independent of the visitor's browser timezone. */
export const getJerusalemDateString = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

/** Mirrors the existing server's new-booking date window, not seat availability. */
export const isSelectableTourDate = (dateStr, now = new Date()) => {
  if (!isThursday(dateStr)) return false;
  const today = getJerusalemDateString(now);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(now));
  return dateStr >= today && !(dateStr === today && hour >= 20)
    && new Date(`${dateStr}T12:00:00Z`) - now <= 84 * 86400000;
};

/**
 * Generate list of upcoming Thursdays
 * @param {number} count
 * @param {string} lang - 'he' or 'en' for month names
 */
export const getUpcomingThursdays = (count = 9, lang = 'he') => {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = type => parts.find(p => p.type === type).value;
  const d = new Date(`${part('year')}-${part('month')}-${part('day')}T12:00:00Z`);

  let diff = (4 - d.getUTCDay() + 7) % 7;
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(now));
  if (diff === 0 && hour >= 20) {
    diff = 7;
  }

  d.setUTCDate(d.getUTCDate() + diff);

  const list = [];
  for (let i = 0; i < count; i++) {
    const dateStr = d.toISOString().slice(0, 10);
    list.push({
      dateStr,
      day: d.getUTCDate(),
      month: d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short', timeZone: 'Asia/Jerusalem' })
    });
    d.setUTCDate(d.getUTCDate() + 7);
  }

  return list;
};

/**
 * Format date to Hebrew or English locale
 * @param {string} dateStr
 * @param {string} lang - 'he' or 'en'
 */
export const formatDateHebrew = (dateStr, lang = 'he') => {
  return new Date(`${dateStr}T12:00:00Z`).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long', timeZone: 'Asia/Jerusalem'
  });
};

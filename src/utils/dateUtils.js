/**
 * Get the nearest Thursday from a given date
 */
export const getNearestThursday = (inputDate) => {
  const d = new Date(inputDate);
  let diff = (4 - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
};

/**
 * Check if a date string is a Thursday
 */
export const isThursday = (dateStr) => {
  return new Date(dateStr).getDay() === 4;
};

/**
 * Generate list of upcoming Thursdays
 * @param {number} count
 * @param {string} lang - 'he' or 'en' for month names
 */
export const getUpcomingThursdays = (count = 9, lang = 'he') => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  
  let diff = (4 - d.getDay() + 7) % 7;
  if (diff === 0 && new Date().getHours() >= 20) {
    diff = 7;
  }
  
  d.setDate(d.getDate() + diff);
  
  const list = [];
  for (let i = 0; i < count; i++) {
    const dateStr = d.toLocaleDateString('en-CA');
    list.push({
      dateStr,
      day: d.getDate(),
      month: d.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { month: 'short' })
    });
    d.setDate(d.getDate() + 7);
  }
  
  return list;
};

/**
 * Format date to Hebrew or English locale
 * @param {string} dateStr
 * @param {string} lang - 'he' or 'en'
 */
export const formatDateHebrew = (dateStr, lang = 'he') => {
  return new Date(dateStr).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
};

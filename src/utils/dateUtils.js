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
 */
export const getUpcomingThursdays = (count = 9) => {
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
      month: d.toLocaleDateString('he-IL', { month: 'short' })
    });
    d.setDate(d.getDate() + 7);
  }
  
  return list;
};

/**
 * Format date to Hebrew locale
 */
export const formatDateHebrew = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'long'
  });
};

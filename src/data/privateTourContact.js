// Editable prompts only. No booking/customer values are inserted in the link.
const messages = {
  he: 'שלום חיליק, אשמח לברר על סיור פרטי לקבוצה.\nמספר משתתפים: \nמועד מועדף: \nשפת הדרכה: \nמטרת המפגש: ',
  en: 'Hi Hilik, I would like to ask about a private group tour.\nGroup size: \nPreferred date: \nTour language: \nOccasion: ',
};

export function privateTourContactHref(language = 'he') {
  const key = String(language).startsWith('en') ? 'en' : 'he';
  return `https://wa.me/972506724312?text=${encodeURIComponent(messages[key])}`;
}

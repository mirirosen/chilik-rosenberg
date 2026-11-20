export function bookingConversionCopy(language) {
  return String(language).startsWith('en') ? {
    title: 'How would you like to tour?', open: 'Join a public tour', openDetail: '₪250 per guest · usually Thursday at 20:00',
    openAction: 'Choose a date', private: 'A private tour for your group', privateDetail: '10–45 guests · date, language and price arranged with Hilik',
    privateAction: 'Private group tour details', privateContact: 'Ask about a private tour', guide: 'Food tour guide',
    dates: 'Nearby available dates', loading: 'Checking nearby dates…', fallback: 'Check dates in the booking calendar.',
    dateAction: 'Choose', availability: 'Availability is checked again before you continue. A date selection does not reserve places.',
    beforePay: 'Before continuing to payment', confirmation: 'Your booking is confirmed after payment has been verified.',
    meeting: 'The exact meeting address is sent during the week of the tour.', terms: 'Cancellation and rescheduling terms (Hebrew)',
    summary: 'Continue your booking', guests: 'guests',
  } : {
    title: 'איך תרצו לצאת לסיור?', open: 'מצטרפים לסיור פתוח', openDetail: '250 ש״ח למשתתף · בדרך כלל חמישי ב־20:00',
    openAction: 'בחירת מועד', private: 'סיור פרטי לקבוצה שלכם', privateDetail: '10–45 משתתפים · המועד, השפה והמחיר בתיאום עם חיליק',
    privateAction: 'פרטי סיור לקבוצה', privateContact: 'בירור סיור פרטי', guide: 'מדריך לסיור האוכל',
    dates: 'מועדים קרובים פנויים', loading: 'בודקים מועדים קרובים…', fallback: 'בדקו מועדים בלוח ההרשמה.',
    dateAction: 'בחירת', availability: 'הזמינות נבדקת שוב לפני ההמשך. בחירת מועד אינה שומרת מקומות.',
    beforePay: 'לפני שממשיכים לתשלום', confirmation: 'ההרשמה מאושרת לאחר אימות התשלום.',
    meeting: 'כתובת המפגש המדויקת נשלחת בשבוע הסיור.', terms: 'תנאי ביטול ודחיית מועד', summary: 'המשך ההזמנה', guests: 'משתתפים',
  };
}
export function conversionDate(date, language) {
  return new Intl.DateTimeFormat(String(language).startsWith('en') ? 'en-GB' : 'he-IL', {day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jerusalem'}).format(new Date(date+'T12:00:00Z'));
}

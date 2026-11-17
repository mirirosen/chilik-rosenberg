// Business facts confirmed by Hilik on 17 November 2026.
// Private group size does not set the capacity of a public tour or checkout.
export const TOUR_FACTS_UPDATED = '2026-11-17';
export const tourServiceFacts = {
  he: {
    privateGroup: 'סיור פרטי מתאים לקבוצה של 10–45 משתתפים.',
    privateWindow: 'אפשר לתאם מועד לסיור פרטי החל מיום רביעי בשעה 12:00 ועד יום שישי בצהריים, בכפוף לזמינות ולאישור חיליק.',
    privateQuickFacts: [['גודל קבוצה פרטית', '10–45 משתתפים'], ['חלון לתיאום סיור פרטי', 'מרביעי ב־12:00 עד שישי בצהריים, בתיאום ובכפוף לזמינות']],
    kosher: 'הטעימות בכשרות בד״ץ.',
    dietary: 'יש מענה לצמחונים, לטבעונים ולבעלי אלרגיות. ציינו את הצרכים מראש מול חיליק כדי לתאם את הטעימות המתאימות; לא כל טעימה מתאימה לכל מגבלה.',
    accessibility: 'הסיור כולל הליכה לא מרובה, במסלול ללא מדרגות ומתאים גם לצורכי נגישות. אם יש קושי בהליכה, עגלה או צורך נגישות מסוים, פנו לחיליק מראש לתיאום הפרטים.',
  },
  en: {
    privateGroup: 'Private tours accommodate groups of 10–45 participants.',
    privateWindow: 'A private tour can be arranged from Wednesday at 12:00 through Friday noon, subject to availability and confirmation by Hilik.',
    privateQuickFacts: [['Private group size', '10–45 participants'], ['Private tour scheduling window', 'Wednesday at 12:00 through Friday noon, by arrangement and subject to availability']],
    kosher: 'Tastings are Badatz kosher.',
    dietary: 'Vegetarian, vegan and allergy requirements can be accommodated. Tell Hilik about your needs in advance to arrange suitable tastings; individual tastings may not suit every restriction.',
    accessibility: 'The tour involves a modest amount of walking on a route without stairs and can accommodate accessibility needs. Contact Hilik in advance about walking difficulties, strollers or specific access requirements to coordinate the details.',
  },
};

export const serviceFaqs = Object.fromEntries(Object.entries(tourServiceFacts).map(([language, copy]) => [language, {
  q1: {
    question: language === 'he' ? 'האם ניתן לתאם סיור פרטי?' : 'Can a private tour be arranged?',
    answer: `${copy.privateGroup} ${copy.privateWindow} ${language === 'he' ? 'המועד, התוכן והמחיר נקבעים בתיאום אישי מראש.' : 'The date, content and price are agreed individually in advance.'}`,
  },
  q10: {
    question: language === 'he' ? 'מה רמת הכשרות והאם יש התאמות לצמחונים, לטבעונים או לאלרגיות?' : 'What is the kashrut standard, and are vegetarian, vegan or allergy adjustments available?',
    answer: `${copy.kosher} ${copy.dietary}`,
  },
  q11: {
    question: language === 'he' ? 'האם הסיור מתאים לילדים, לעגלות או למשתתפים עם קושי בהליכה?' : 'Is the tour suitable for children, strollers or people with walking difficulties?',
    answer: `${language === 'he' ? 'משפחות עם ילדים מוזמנות בברכה, וילדים משתתפים בליווי מבוגר.' : 'Families with children are welcome, and children take part with an adult.'} ${copy.accessibility}`,
  },
}]));

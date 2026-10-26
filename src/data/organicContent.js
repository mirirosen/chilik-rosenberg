export const siteOrigin = 'https://www.chilik-tours.com';
export const guidePaths = ['/guides/bnei-brak-food-tour.html', '/guides/private-tour-bnei-brak.html', '/guides/bnei-brak-food-tour-en.html'];

// Only facts published on the site or confirmed by the owner (2026-10-26: start 20:00,
// meeting point in Bnei Brak with the exact address sent in the tour week, Hebrew and English).
// Dietary suitability and date availability still require confirmation. No group size is published.
export const organicCopy = {
  he: {
    title: 'סיור קולינרי בבני ברק עם חיליק רוזנברג',
    description: 'סיור אוכל ותרבות בבני ברק עם חיליק רוזנברג: טעימות מהמטבח היהודי, סיפורים והיכרות עם החיים החרדיים. פרטי הסיור, מחיר ושאלות נפוצות.',
    intro: 'סיור קולינרי בבני ברק עם חיליק רוזנברג משלב טעימות מהמטבח היהודי עם סיפורים והיכרות עם החיים והתרבות החרדית. חיליק, תושב בני ברק שלמד בישיבת פוניבז׳, מדריך את המפגש מתוך היכרות אישית עם העיר.',
    heading: 'מה כדאי לדעת לפני הסיור?',
    facts: [['משך הסיור', 'כשעתיים וחצי עד שלוש שעות'], ['מחיר למשתתף', '250 ש״ח לסיור המוצג באתר'], ['מועד', 'בדרך כלל ביום חמישי בערב, תחילת הסיור בשעה 20:00; יש לבדוק זמינות למועד המבוקש'], ['נקודת המפגש', 'בבני ברק; הכתובת המדויקת נשלחת בשבוע הסיור'], ['שפות הסיור', 'עברית ואנגלית']],
    caution: 'לפני ההזמנה יש לברר לבוש מתאים, נגישות, כשרות והתאמות לצמחונים או לאלרגיות. התחנות והטעימות עשויות להשתנות; אין כאן התחייבות לזמינות של תאריך או של מאכל מסוים.',
    guides: 'מדריכים לתכנון הביקור בבני ברק',
    links: ['סיור קולינרי בבני ברק: מה טועמים ואיך מתכוננים', 'סיור פרטי בבני ברק: תכנון מפגש לקבוצה', 'Bnei Brak food tour — English guide'],
    contact: 'לבירור עם חיליק', booking: 'בחירת תאריך לסיור', faq: 'שאלות נפוצות',
  },
  en: {
    title: 'Bnei Brak culinary tour with Hilik Rozenberg',
    description: 'Explore Bnei Brak with local guide Hilik Rozenberg: Jewish food tastings, stories and Haredi culture. Tour duration, price, planning tips and frequently asked questions.',
    intro: 'A Bnei Brak culinary tour with Hilik Rozenberg combines Jewish food tastings with stories about the city and Haredi life. Hilik lives in Bnei Brak and studied at Ponevezh Yeshiva, bringing personal experience to the visit.',
    heading: 'What should you know before your tour?',
    facts: [['Duration', 'Usually 2.5–3 hours'], ['Price per guest', '₪250 for the tour shown on the website'], ['Timing', 'Usually Thursday evening, starting at 20:00; check availability for your chosen date'], ['Meeting point', 'In Bnei Brak; the exact address is sent during the tour week'], ['Languages', 'Hebrew and English']],
    caution: 'Ask before booking about suitable clothing, accessibility, kosher supervision, vegetarian options and allergies. Stops and tastings may vary; this information does not guarantee availability for a date or a particular dish.',
    guides: 'Guides to planning your Bnei Brak visit',
    links: ['Bnei Brak food tour — Hebrew guide', 'Planning a private group tour — Hebrew guide', 'Bnei Brak food tour: what to taste and how to prepare'],
    contact: 'Ask Hilik', booking: 'Choose a tour date', faq: 'Frequently asked questions',
  },
};

// Primary names confirmed by the owner: Hebrew as on the site, English "Hilik Rozenberg".
const personNames = { he: 'חיליק רוזנברג', en: 'Hilik Rozenberg' };
// Short brand, as in the guides' breadcrumbs and the media list: "Hilik Tours" / "סיורי חיליק".
export const SHORT_BRAND = { en: 'Hilik Tours', he: 'סיורי חיליק' };
const nameVariants = ['Hilik Rozenberg', 'Chilik Rosenberg', 'Hilik Rosenberg', 'Chilik Rozenberg', 'חיליק רוזנברג'];
export const TOUR_START_TIME = '20:00';
import { mediaReferences } from './mediaReferences.js';
// Owner-confirmed (2026-10-26) profiles that belong to Hilik; published as sameAs.
export const SAME_AS_IDS = ['facebook', 'youtube-channel', 'instagram', 'x', 'linkedin', 'coffee-podcast', 'funzing', 'gula-show'];
export const sameAsProfiles = SAME_AS_IDS.map(id => mediaReferences.find(item => item.id === id)?.url).filter(Boolean);
// Business address is the city only (owner decision 2026-10-26: no street address or postal code anywhere).
const footerAddress = { he: { addressLocality: 'בני ברק' }, en: { addressLocality: 'Bnei Brak' } };
export const PRICE_PER_GUEST = 250;

export function buildHomeSchema({ language, description, faqs, path = '/' }) {
  const lang = language?.startsWith('en') ? 'en' : 'he';
  const pageUrl = siteOrigin + path;
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Person', '@id': `${siteOrigin}/#chilik`, name: personNames[lang], alternateName: nameVariants.filter(name => name !== personNames[lang]), url: siteOrigin + '/', description: organicCopy[lang].intro, knowsLanguage: ['he', 'en'], sameAs: sameAsProfiles },
    { '@type': 'LocalBusiness', '@id': `${siteOrigin}/#organization`, name: lang === 'he' ? 'סיורים עם חיליק רוזנברג' : 'Hilik Rozenberg Tours', alternateName: [SHORT_BRAND.en, SHORT_BRAND.he, ...nameVariants], url: siteOrigin + '/', image: `${siteOrigin}/media/hero/bnei-brak-sequence-poster.webp`, telephone: '+972506724312', email: 'hr20192022@gmail.com', address: { '@type': 'PostalAddress', ...footerAddress[lang], addressCountry: 'IL' }, priceRange: `₪${PRICE_PER_GUEST}`, contactPoint: { '@type': 'ContactPoint', contactType: 'reservations', telephone: '+972506724312', email: 'hr20192022@gmail.com', availableLanguage: ['Hebrew', 'English'] }, founder: { '@id': `${siteOrigin}/#chilik` }, sameAs: sameAsProfiles },
    { '@type': 'WebSite', '@id': `${siteOrigin}/#website`, url: siteOrigin + '/', name: personNames[lang], inLanguage: ['he', 'en'], publisher: { '@id': `${siteOrigin}/#organization` } },
    { '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: organicCopy[lang].title, description, inLanguage: lang, isPartOf: { '@id': `${siteOrigin}/#website` }, about: { '@id': `${siteOrigin}/#tour` } },
    { '@type': 'TouristTrip', '@id': `${siteOrigin}/#tour`, name: organicCopy[lang].title, description: organicCopy[lang].intro, touristType: lang === 'he' ? 'סיור קולינרי ותרבותי' : 'Culinary and cultural walking tour', itinerary: { '@type': 'City', name: lang === 'he' ? 'בני ברק' : 'Bnei Brak' }, departureTime: `${TOUR_START_TIME}:00`,
      // The meeting point is only "in Bnei Brak"; the exact address is sent during the tour week.
      tripOrigin: { '@type': 'Place', name: lang === 'he' ? 'בני ברק (הכתובת המדויקת נשלחת בשבוע הסיור)' : 'Bnei Brak (exact address sent during the tour week)', address: { '@type': 'PostalAddress', addressLocality: lang === 'he' ? 'בני ברק' : 'Bnei Brak', addressCountry: 'IL' } }, provider: { '@id': `${siteOrigin}/#organization` },
      offers: { '@type': 'Offer', url: pageUrl, price: String(PRICE_PER_GUEST), priceCurrency: 'ILS', priceSpecification: { '@type': 'UnitPriceSpecification', price: PRICE_PER_GUEST, priceCurrency: 'ILS', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: lang === 'he' ? 'משתתף' : 'participant' } } } },
    { '@type': 'FAQPage', '@id': `${pageUrl}#faq`, inLanguage: lang, mainEntity: Object.values(faqs).map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
  ] };
}

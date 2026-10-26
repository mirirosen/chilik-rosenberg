import { mediaReferences } from './mediaReferences.js';

export const siteOrigin = 'https://www.chilik-tours.com';
export const guidePaths = ['/guides/bnei-brak-food-tour.html', '/guides/private-tour-bnei-brak.html', '/guides/bnei-brak-food-tour-en.html'];

// Only facts already published in the site or confirmed in BOOKING_ROLLOUT_STATUS.
// Meeting details, dietary suitability and date availability require confirmation.
export const organicCopy = {
  he: {
    title: 'סיור קולינרי בבני ברק עם חיליק רוזנברג',
    description: 'סיור אוכל ותרבות בבני ברק עם חיליק רוזנברג: טעימות מהמטבח היהודי, סיפורים והיכרות עם החיים החרדיים. פרטי הסיור, מחיר ושאלות נפוצות.',
    intro: 'סיור קולינרי בבני ברק עם חיליק רוזנברג משלב טעימות מהמטבח היהודי עם סיפורים והיכרות עם החיים והתרבות החרדית. חיליק, תושב בני ברק שלמד בישיבת פוניבז׳, מדריך את המפגש מתוך היכרות אישית עם העיר.',
    heading: 'מה כדאי לדעת לפני הסיור?',
    facts: [['משך הסיור', 'כשעתיים וחצי עד שלוש שעות'], ['מחיר למשתתף', '250 ש״ח לסיור המוצג באתר'], ['מועד', 'בדרך כלל ביום חמישי בערב; יש לבדוק זמינות למועד המבוקש'], ['נקודת המפגש', 'לפרטי נקודת המפגש, חניה ודרכי הגעה, פנו לחיליק לפני ההגעה']],
    caution: 'לפני ההזמנה יש לברר לבוש מתאים, נגישות, כשרות והתאמות לצמחונים או לאלרגיות. התחנות והטעימות עשויות להשתנות; אין כאן התחייבות לזמינות של תאריך או של מאכל מסוים.',
    guides: 'מדריכים לתכנון הביקור בבני ברק',
    links: ['סיור קולינרי בבני ברק: מה טועמים ואיך מתכוננים', 'סיור פרטי בבני ברק: תכנון מפגש לקבוצה', 'Bnei Brak food tour — English guide'],
    contact: 'לבירור עם חיליק', booking: 'בחירת תאריך לסיור', faq: 'שאלות נפוצות',
  },
  en: {
    title: 'Bnei Brak culinary tour with Chilik Rosenberg',
    description: 'Explore Bnei Brak with local guide Chilik Rosenberg: Jewish food tastings, stories and Haredi culture. Tour duration, price, planning tips and frequently asked questions.',
    intro: 'A Bnei Brak culinary tour with Chilik Rosenberg combines Jewish food tastings with stories about the city and Haredi life. Chilik lives in Bnei Brak and studied at Ponevezh Yeshiva, bringing personal experience to the visit.',
    heading: 'What should you know before your tour?',
    facts: [['Duration', 'Usually 2.5–3 hours'], ['Price per guest', '₪250 for the tour shown on the website'], ['Timing', 'Usually Thursday evening; check availability for your chosen date'], ['Meeting point', 'Ask Chilik about the meeting point, parking and directions before arrival']],
    caution: 'Ask before booking about suitable clothing, accessibility, kosher supervision, vegetarian options and allergies. Stops and tastings may vary; this information does not guarantee availability for a date or a particular dish.',
    guides: 'Guides to planning your Bnei Brak visit',
    links: ['Bnei Brak food tour — Hebrew guide', 'Planning a private group tour — Hebrew guide', 'Bnei Brak food tour: what to taste and how to prepare'],
    contact: 'Ask Chilik', booking: 'Choose a tour date', faq: 'Frequently asked questions',
  },
};

// Name spellings already used on the site and its linked profiles (Hilik/Chilik, Rosenberg/Rozenberg).
const personNames = { he: 'חיליק רוזנברג', en: 'Chilik Rosenberg' };
const nameVariants = ['Chilik Rosenberg', 'Hilik Rosenberg', 'Hilik Rozenberg', 'חיליק רוזנברג'];
// Only Chilik's own profiles from the site's media data (not third-party coverage).
const profileIds = ['facebook', 'youtube-channel', 'instagram', 'x', 'linkedin'];
export const sameAsProfiles = profileIds.map(id => mediaReferences.find(item => item.id === id)?.url).filter(Boolean);
// The address shown in the site footer (footer.address).
const footerAddress = { he: { streetAddress: 'רחוב לחי 11', addressLocality: 'בני ברק' }, en: { streetAddress: '11 Lehi Street', addressLocality: 'Bnei Brak' } };
export const PRICE_PER_GUEST = 250;

export function buildHomeSchema({ language, description, faqs, path = '/' }) {
  const lang = language?.startsWith('en') ? 'en' : 'he';
  const pageUrl = siteOrigin + path;
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Person', '@id': `${siteOrigin}/#chilik`, name: personNames[lang], alternateName: nameVariants.filter(name => name !== personNames[lang]), url: siteOrigin + '/', description: organicCopy[lang].intro, sameAs: sameAsProfiles },
    { '@type': 'LocalBusiness', '@id': `${siteOrigin}/#organization`, name: lang === 'he' ? 'סיורים עם חיליק רוזנברג' : 'Chilik Rosenberg Tours', alternateName: nameVariants, url: siteOrigin + '/', image: `${siteOrigin}/media/hero/bnei-brak-sequence-poster.webp`, telephone: '+972506724312', email: 'hr20192022@gmail.com', address: { '@type': 'PostalAddress', ...footerAddress[lang], addressCountry: 'IL' }, priceRange: `₪${PRICE_PER_GUEST}`, founder: { '@id': `${siteOrigin}/#chilik` }, sameAs: sameAsProfiles },
    { '@type': 'WebSite', '@id': `${siteOrigin}/#website`, url: siteOrigin + '/', name: personNames[lang], inLanguage: ['he', 'en'], publisher: { '@id': `${siteOrigin}/#organization` } },
    { '@type': 'WebPage', '@id': `${pageUrl}#webpage`, url: pageUrl, name: organicCopy[lang].title, description, inLanguage: lang, isPartOf: { '@id': `${siteOrigin}/#website` }, about: { '@id': `${siteOrigin}/#tour` } },
    { '@type': 'TouristTrip', '@id': `${siteOrigin}/#tour`, name: organicCopy[lang].title, description: organicCopy[lang].intro, touristType: lang === 'he' ? 'סיור קולינרי ותרבותי' : 'Culinary and cultural walking tour', itinerary: { '@type': 'City', name: lang === 'he' ? 'בני ברק' : 'Bnei Brak' }, provider: { '@id': `${siteOrigin}/#organization` },
      offers: { '@type': 'Offer', url: pageUrl, price: String(PRICE_PER_GUEST), priceCurrency: 'ILS', priceSpecification: { '@type': 'UnitPriceSpecification', price: PRICE_PER_GUEST, priceCurrency: 'ILS', referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitText: lang === 'he' ? 'משתתף' : 'participant' } } } },
    { '@type': 'FAQPage', '@id': `${pageUrl}#faq`, inLanguage: lang, mainEntity: Object.values(faqs).map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
  ] };
}

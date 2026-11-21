import fs from 'node:fs';
import { growthPages, renderGrowthPage } from './growth-pages.mjs';
import { growthGuideLinks } from '../src/data/growthPages.js';
import { bookingConversionCopy } from '../src/data/bookingConversion.js';
import { privateTourGuide, privateTourFaqs } from '../src/data/privateTourGuide.js';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { organicCopy, guidePaths, siteOrigin, buildHomeSchema } from '../src/data/organicContent.js';
import { escapeHtml as e, metadataHtml, faqsFor, homeAlternatesHtml, sitemapPaths, sitemapLastmod } from './organic-html.mjs';
import { guideEnrichment, guideTracking, watchPage, videoVtt } from './guide-growth.mjs';
import { bakeryVideo, GUIDE_UPDATED } from '../src/data/organicVideo.js';
import { tourServiceFacts } from '../src/data/tourServiceFacts.js';
import { privateTourContactHref } from '../src/data/privateTourContact.js';

const mode = process.argv[2];
if (!['booking', 'inquiry'].includes(mode)) throw Error('Expected booking or inquiry mode');
const out = path.resolve(mode === 'booking' ? 'dist-booking' : 'dist-inquiry');
const entry = fs.readFileSync(path.join(out, `${mode}-index.html`), 'utf8');
const analyticsScript = mode === 'booking' ? '/' + JSON.parse(fs.readFileSync(path.join(out, '.vite/manifest.json'), 'utf8'))['src/guideAnalytics.js'].file : undefined;
const css = fs.readFileSync(new URL('../src/typography.css', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/design-tokens.css', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/organic-seo.css', import.meta.url), 'utf8') + fs.readFileSync(new URL('../src/organic-guide.css', import.meta.url), 'utf8');
const heSections = [
  ['סיור קולינרי כשר בבני ברק: מה חשוב לדעת?', tourServiceFacts.he.kosher+' אם חשובה לכם תעודת הכשר של תחנה מסוימת או דרישה תזונתית נוספת, בררו את פרטי הטעימות עם חיליק לפני ההזמנה. '+tourServiceFacts.he.dietary+' מדריך זה מרכז גם את משך הסיור, המחיר וההכנה לביקור, כדי שתוכלו לתכנן מפגש שמתאים לכם.'],
  ['מה טועמים בסיור קולינרי בבני ברק?', 'בתפריט של חיליק מופיעים צ׳ולנט, קוגל ירושלמי, דגים וכבד קצוץ. אלה מאכלים המזוהים עם המטבח היהודי ועם ההכנות לשבת. השילוב בין הטעימות לסיפורים נותן הקשר למה שאוכלים: אוכל ביתי, מאפיות והמפגש בין חיי היום־יום למסורת. אין להסיק שכל מאכל מוצע בכל סיור; מומלץ לברר מראש מה מתוכנן במועד שבחרתם.'],
  ['למה מבקרים בבני ברק ביום חמישי בערב?', 'הסיורים מתקיימים בדרך כלל בחמישי בערב, לקראת שבת, ומתחילים בשעה 20:00. חיליק מספר על העיר שבה נולד וחי, ומחבר בין האוכל לבין מוסדות, מנהגים וחיי החברה החרדית. זו הזדמנות לשאול שאלות על דברים שרואים בדרך ולקבל תשובה ממדריך מקומי. המועד בפועל תלוי בתיאום ובזמינות; מידע כללי על חמישי אינו אישור להרשמה.'],
  ['איך מתכוננים לביקור?', `הגיעו בלבוש צנוע ומכבד. ${tourServiceFacts.he.accessibility} ${tourServiceFacts.he.kosher} ${tourServiceFacts.he.dietary} נקודת המפגש נמצאת בבני ברק, והכתובת המדויקת נשלחת בשבוע הסיור. לשאלות על חניה ודרכי הגעה, פנו לחיליק לפני ההגעה. הסיור מתקיים בעברית ובאנגלית.`],
  ['סיור פתוח או מפגש פרטי?', 'לפני הצטרפות לסיור פתוח, בדקו איזה מועדים זמינים וכיצד מאשרים את ההזמנה. קבוצה המעוניינת במועד ובתוכן שיתואמו מראש יכולה לברר על סיור פרטי. מחיר של 250 ש״ח למשתתף מתייחס לסיור המוצג באתר ואינו הצעת מחיר לקבוצה פרטית. את התאמת הסיור לצורכי הקבוצה ואת התנאים יש לקבל מחיליק.'],
];
const enSections = [
  ['A kosher food tour in Bnei Brak', tourServiceFacts.en.kosher+' Ask Hilik before booking if you need the certification details for a particular stop or have additional dietary requirements. '+tourServiceFacts.en.dietary+' This guide also covers the tour duration, public ticket price and preparation for your visit.'],
  ['What food can you expect?', 'Hilik’s published menu includes cholent, Jerusalem kugel, fish and chopped liver. These dishes provide an introduction to Jewish food traditions and preparations for Shabbat. Tastings are combined with stories about the city and the people who live there. Ask what is planned for your chosen date; a dish listed on the website is not a promise that it will be served on every tour.'],
  ['Why visit on a Thursday evening?', 'Tours usually take place on Thursday evenings, before Shabbat, and start at 20:00. Hilik connects the food with stories about everyday life, traditions and the Haredi community. As a guide who was born in Bnei Brak and lives there, he brings a local perspective to the visit. A general description of Thursday tours does not confirm a particular date: availability and your booking must still be checked.'],
  ['How should you prepare?', `Wear modest, respectful clothing. ${tourServiceFacts.en.accessibility} ${tourServiceFacts.en.kosher} ${tourServiceFacts.en.dietary} The meeting point is in Bnei Brak; the exact address is sent during the week of your tour. Ask Hilik about parking and transport before arrival. Tours are guided in Hebrew and English.`],
  ['An open tour or a private group?', 'Before joining an open tour, check which dates are available and how to confirm your booking. A group can ask Hilik about a private tour with timing and content agreed beforehand. The listed price of ₪250 per guest relates to the tour shown on the website and is not a quotation for a private group. Contact Hilik for the group’s requirements, language and terms.'],
];
const privateSections = privateTourGuide.sections;
const pages = [
  { path: guidePaths[0], language: 'he', title: 'סיור קולינרי בבני ברק: אוכל, מחיר והכנה | חיליק רוזנברג', h1: 'סיור קולינרי בבני ברק: מה טועמים ואיך מתכוננים?', description: 'מחפשים סיור קולינרי כשר בבני ברק? טעימות בכשרות בד״ץ עם חיליק רוזנברג, מחיר, הכנה, לבוש ונגישות. יש לתאם מראש צרכים תזונתיים ולבדוק מועדים פנויים.', sections: heSections, alternate: guidePaths[2] },
  { path: guidePaths[1], language: 'he', ...privateTourGuide, sections: privateSections },
  { path: guidePaths[2], language: 'en', title: 'Bnei Brak Food Tour: Price & Planning | Hilik Rozenberg', h1: 'Bnei Brak food tour: what to taste and how to prepare', description: 'Plan a Bnei Brak food tour with Hilik Rozenberg: Jewish dishes, Thursday evenings at 20:00, tours in Hebrew and English, clothing, dietary questions and private groups.', sections: enSections, alternate: guidePaths[0] },
];
fs.mkdirSync(path.join(out, 'guides'), { recursive: true });
function guideFaqs(page) {
  const faqs = faqsFor(page.language, mode === 'booking');
  if (page.path.includes('private-tour')) return privateTourFaqs(faqs);
  const keys = ['q3', 'q7', 'q8', 'q13', 'q4', 'q5', 'q10', 'q11', 'q12'];
  return keys.map(key => faqs[key]);
}
function planningDetails(page) {
  const english = page.language === 'en';
  const privateGroup = page.path.includes('private-tour');
  const faq = `<section id="guide-faq"><h2>${english ? 'Practical questions before you book' : 'שאלות מעשיות לפני ההזמנה'}</h2>${guideFaqs(page).map(({ question, answer }) => `<section><h3>${e(question)}</h3><p>${e(answer)}</p></section>`).join('')}</section>`;
  if (privateGroup) return `<section><h2>מה להכין לפני שפונים לגבי קבוצה?</h2><p>כדי שהבירור יהיה ממוקד, רכזו את מספר המשתתפים, המועד המבוקש וטווח מועדים חלופיים, מטרת המפגש ושפת ההדרכה הנדרשת. ציינו אם זו קבוצה של עובדים, חברים או משפחה, ואם יש ילדים או משתתפים שזקוקים להתאמות בהליכה. אלה פרטים לבירור, ולא אישור שחיליק יכול לספק כל התאמה או כל שפה.</p><p>כדאי למנות איש קשר אחד שירכז שאלות על אוכל, נגישות ותשלום. לפני שמעבירים למשתתפים הזמנה סופית, קבלו מחיליק את פרטי המועד והמפגש, המחיר לקבוצה ותנאי השינוי או הביטול. אל תסתמכו על המחיר למשתתף בסיור הפתוח כדי לחשב הצעה לקבוצה פרטית.</p><p>לאחר אישור הפרטים, העבירו לקבוצה את הנחיות ההגעה והלבוש שקיבלתם ואת פרטי איש הקשר. שאלות רפואיות או רגישויות למזון יש לברר ישירות מראש, כדי שלא להסתמך על תיאור כללי של התפריט.</p></section>${faq}`;
  const menu = JSON.parse(fs.readFileSync(path.resolve('src/locales/' + page.language + '.json'), 'utf8')).menu.items;
  const dishes = `<section><h2>${english ? 'The food shown on Hilik’s website' : 'המאכלים המוצגים באתר של חיליק'}</h2><p>${english ? 'These are published menu examples. Ask which tastings are planned for your date; do not use this list as a dietary certification or a guaranteed itinerary.' : 'אלה דוגמאות מתוך התפריט המוצג באתר. בררו אילו טעימות מתוכננות למועד שלכם; הרשימה אינה אישור כשרות או התאמה תזונתית ואינה מסלול מובטח.'}</p><dl>${Object.values(menu).map(item => `<div><dt>${e(item.title)}</dt><dd>${e(item.desc)}</dd></div>`).join('')}</dl><p><a href="/#menu">${english ? 'See the menu on the tour website' : 'לתפריט באתר הסיור'}</a> · <a href="/#videos">${english ? 'Watch clips from the tours' : 'לסרטונים מהסיורים'}</a></p></section>`;
  const coverage = `<section><h2>${english ? 'Read about previous visits' : 'לקריאה על ביקורים קודמים'}</h2><p>${english ? 'Mako’s March 2024 report describes a Thursday-night food tour with Hilik, combining tastings and local stories. Yuvi Yam’s account also describes the food and cultural encounters during a visit with him. These are reports of previous visits, rather than current booking instructions; stops, menus and arrangements can change.' : 'כתבת מאקו ממרץ 2024 מתארת סיור ליל שישי עם חיליק, המשלב טעימות וסיפורים מקומיים. גם בתיאור הביקור של יובי ים מופיעים המאכלים והמפגש עם התרבות בעיר לצד חיליק. אלה תיאורים של ביקורים קודמים, ולא הוראות הזמנה עדכניות; תחנות, תפריטים וסידורי הגעה עשויים להשתנות.'}</p><ul><li><a href="https://www.mako.co.il/food-restaurants/restaurant-news/Article-f69eb4533183e81027.htm" target="_blank" rel="noopener noreferrer">${english ? 'Mako — a Thursday-night tour with Hilik, 2024' : 'מאקו — סיור ליל שישי עם חיליק, 2024'}</a></li><li><a href="https://www.yuviyam.com/post/bnei-brak" target="_blank" rel="noopener noreferrer">${english ? 'Yuvi Yam — a culinary visit to Bnei Brak' : 'יובי ים — קולינריה בבני ברק'}</a></li></ul><p><a href="/#about">${english ? 'More about Hilik Rozenberg' : 'עוד על חיליק רוזנברג'}</a></p></section>`;
  const privateInquiry = english ? `<section><h2>Planning a private group tour?</h2><p>${e(tourServiceFacts.en.privateGroup)} ${e(tourServiceFacts.en.privateWindow)}</p><p><a href="${e(privateTourContactHref('en'))}" data-contact-context="private_tour">Ask Hilik about a private tour in English</a></p><p>The WhatsApp link opens an editable message with prompts for your group size, preferred date, tour language and occasion. Availability, language, price and content are agreed with Hilik before confirmation.</p></section>` : '';
  return dishes + faq + coverage + privateInquiry;
}
const headerCopy = language => JSON.parse(fs.readFileSync(path.resolve('src/locales/' + language + '.json'), 'utf8')).header;
// Same destination and wording as the main site header CTA; the inquiry build keeps its neutral label.
function bookingButton(page) {
  const header = headerCopy(page.language);
  const bookingHref = mode === 'booking' && page.language === 'en' ? '/en#date-selection' : '/#date-selection';
  return `<a class="guide-cta__button" href="${bookingHref}">${e(mode === 'booking' ? header.register : header.upcomingTours)}</a>`;
}
function guideHeader(page) {
  return `<header class="guide-header"><a class="guide-header__brand" href="/">${e(headerCopy(page.language).titleShort)}</a>${page.path === guidePaths[1] ? privateTourButton() : bookingButton(page)}</header>`;
}
function privateTourButton() {
  return `<a class="guide-cta__button" href="${e(privateTourContactHref('he'))}" data-contact-context="private_tour">${e(bookingConversionCopy('he').privateContact)}</a>`;
}
function openingDetails(page) {
  if (page.path === guidePaths[1]) return `<section class="guide-quick-facts"><h2>פרטי הסיור הפרטי במבט מהיר</h2><dl>${tourServiceFacts.he.privateQuickFacts.map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></section><p class="guide-intro-action">${privateTourButton()}</p><p>הקישור פותח טיוטת הודעה שאפשר לערוך לפני השליחה, עם שאלות על מספר המשתתפים, המועד, שפת ההדרכה ומטרת המפגש.</p>`;
  const copy = organicCopy[page.language];
  return `<section class="guide-quick-facts"><h2>${page.language === 'en' ? 'Tour planning at a glance' : 'פרטי הסיור במבט מהיר'}</h2><dl>${copy.facts.slice(0, 3).map(([label, value]) => `<div><dt>${e(label)}</dt><dd>${e(value)}</dd></div>`).join('')}</dl></section>`;
}
function closingCta(page) {
  if (page.path === guidePaths[1]) return `<section class="guide-cta"><h2>מתכננים סיור פרטי לקבוצה?</h2>${privateTourButton()}<a href="/#date-selection">${mode === 'booking' ? 'להצטרפות לסיור פתוח' : 'לפרטי הסיור הפתוח'}</a></section>`;
  const heading = page.language === 'en' ? 'Ready to join a tour?' : 'רוצים להצטרף לסיור?';
  return `<section class="guide-cta"><h2>${heading}</h2>${bookingButton(page)}<a href="/guides/private-tour-bnei-brak.html">${page.language === 'en' ? 'Planning a private group? (Hebrew guide)' : 'לתכנון סיור פרטי לקבוצה'}</a><a href="https://wa.me/972506724312">${e(organicCopy[page.language].contact)}</a></section>`;
}
for (const page of pages) {
  const copy = organicCopy[page.language];
  const intro = page.path === guidePaths[1]
    ? privateTourGuide.intro
    : copy.intro;
  const primaryContact = page.path.includes('private-tour')
    ? `<a href="${e(privateTourContactHref('he'))}" data-contact-context="private_tour">${e(copy.contact)}</a>`
    : `<a href="/#date-selection">${e(mode === 'booking' ? copy.booking : copy.contact)}</a> · <a href="https://wa.me/972506724312">${e(copy.contact)}</a>`;
  const url = siteOrigin + page.path;
  const enrichment = guideEnrichment(page);
  const growthNav = '<nav aria-label="' + (page.language === 'en' ? 'More reading in Hebrew' : 'עוד על בני ברק, אוכל והרצאות') + '"><h2>' + (page.language === 'en' ? 'More reading in Hebrew' : 'עוד על בני ברק, אוכל והרצאות') + '</h2><ul>' + growthGuideLinks(page.language).map(item => '<li><a href="' + e(item.href) + '">' + e(item.label) + '</a></li>').join('') + '</ul></nav>';
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.description, inLanguage: page.language, about: { '@id': siteOrigin + '/#tour' }, mainEntity: { '@id': url + '#article' }, hasPart: { '@id': url + '#guide-faq' } },
    { ...enrichment.article, headline: page.h1 },
    { '@type': 'FAQPage', '@id': url + '#guide-faq', inLanguage: page.language, isPartOf: { '@id': url + '#webpage' }, mainEntity: guideFaqs(page).map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: page.language === 'he' ? 'סיורים עם חיליק' : 'Hilik Tours', item: siteOrigin + '/' }, { '@type': 'ListItem', position: 2, name: page.h1, item: url } ] },
  ] };
  // x-default is the Hebrew guide of the pair.
  const alternates = page.alternate ? `<link rel="alternate" hreflang="${page.language}" href="${url}"><link rel="alternate" hreflang="${page.language === 'he' ? 'en' : 'he'}" href="${siteOrigin + page.alternate}"><link rel="alternate" hreflang="x-default" href="${siteOrigin + (page.language === 'he' ? page.path : page.alternate)}">` : '';
  let html = `<!doctype html><html lang="${page.language}" dir="${page.language === 'he' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${metadataHtml({ ...page, graph })}${alternates}<link rel="icon" href="/favicon.svg"><style>body{margin:0;background:var(--tour-paper,#f7f3eb);font-family:var(--eti-body-font,Arial,sans-serif)}${css}</style></head><body class="guide-page">${guideHeader(page)}<main class="organic-overview"><nav aria-label="${page.language === 'he' ? 'ניווט' : 'Navigation'}"><a href="/">${page.language === 'he' ? 'סיורים עם חיליק' : 'Hilik Tours'}</a></nav><h1>${e(page.h1)}</h1><p>${e(intro)}</p>${openingDetails(page)}${enrichment.html}${page.sections.map(([title, text]) => `<section><h2>${e(title)}</h2><p>${e(text)}</p></section>`).join('')}${planningDetails(page)}${growthNav}${closingCta(page)}<nav aria-label="${e(copy.guides)}"><h2>${e(copy.guides)}</h2><ul>${guidePaths.filter(p => p !== page.path).map(p => `<li><a href="${p}">${e(copy.links[guidePaths.indexOf(p)])}</a></li>`).join('')}</ul></nav><p>${primaryContact} · <a href="tel:0506724312">0506724312</a></p><p><a href="/terms">${page.language === 'he' ? 'תנאי שימוש ותקנון' : 'Terms and conditions'}</a></p></main>${guideTracking({mode,analyticsScript,language:page.language})}</body></html>`;
  // On the booking site the English guide sends readers to the English homepage.
  if (mode === 'booking' && page.language === 'en') html = html.replace(/href="\/(#[^"]*)?"/g, (_match, hash = '') => `href="/en${hash}"`);
  fs.writeFileSync(path.join(out, page.path.slice(1)), html);
}
for (const page of growthPages) {
  fs.mkdirSync(path.dirname(path.join(out, page.path.slice(1))), { recursive: true });
  fs.writeFileSync(path.join(out, page.path.slice(1)), renderGrowthPage({ page, mode, css, analyticsScript }));
}
fs.mkdirSync(path.join(out, 'videos'), { recursive: true });
fs.mkdirSync(path.join(out, 'media/captions'), { recursive: true });
fs.writeFileSync(path.join(out, bakeryVideo.path.slice(1)), watchPage({mode,analyticsScript,css}));
for (const language of ['he','en']) fs.writeFileSync(path.join(out, `media/captions/vizhnitz-${language}.vtt`), videoVtt(language));
// Indexable English homepage (/en): the same production shell, styles and bundle as
// the Hebrew homepage, with English prerendered markup and its own metadata.
if (mode === 'booking') {
  const enMarkupFile = path.join(out, '.prerender-en.html');
  const dom = new JSDOM(entry);
  const doc = dom.window.document;
  doc.documentElement.lang = 'en';
  doc.documentElement.dir = 'ltr';
  doc.head.querySelectorAll('title,meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"][hreflang],#organic-schema').forEach(n => n.remove());
  const copy = organicCopy.en;
  const graph = buildHomeSchema({ language: 'en', description: copy.description, faqs: faqsFor('en', true), path: '/en' });
  doc.head.insertAdjacentHTML('beforeend', metadataHtml({ ...copy, path: '/en', language: 'en', graph }) + homeAlternatesHtml());
  const root = doc.getElementById('root');
  root.innerHTML = fs.readFileSync(enMarkupFile, 'utf8');
  root.dataset.prerender = 'en';
  doc.querySelectorAll('noscript').forEach(node => node.remove());
  // Serialize first: JSDOM otherwise escapes nested noscript markup as text.
  const noScript = '<noscript><style>#faq [hidden]{display:block}#faq button{pointer-events:none}</style><p>Online booking requires JavaScript. You can call Hilik: <a href="tel:0506724312">0506724312</a>.</p></noscript>';
  fs.writeFileSync(path.join(out, 'en.html'), dom.serialize().replace('</body>', noScript + '</body>'));
  dom.window.close();
  fs.unlinkSync(enMarkupFile);
}
// Distinct initial metadata for legal and private routes. The same React bundle
// still owns their functionality. Never copy homepage schema into these shells.
const locales = JSON.parse(fs.readFileSync(new URL('../src/locales/he.json', import.meta.url), 'utf8'));
for (const route of ['terms', 'booking', 'confirmation', ...(mode === 'booking' ? ['manage-bookings'] : [])]) {
  const dom = new JSDOM(entry);
  const doc = dom.window.document;
  // Client-rendered private/legal shells need the complete design immediately.
  doc.querySelectorAll('link[data-public-deferred]').forEach(link => { link.media = 'all'; link.removeAttribute('data-public-deferred'); });
  doc.querySelector('script[src="/public-style-loader.js"]')?.remove();
  doc.querySelectorAll('style[data-public-styles]').forEach(style => {
    const link = doc.createElement('link');
    link.rel = 'stylesheet'; link.media = 'all'; link.crossOrigin = 'anonymous';
    link.href = style.getAttribute('data-css-href');
    style.replaceWith(link);
  });
  doc.querySelectorAll('[fetchpriority="low"]').forEach(node => node.removeAttribute('fetchpriority'));
  doc.querySelectorAll('link[rel="preload"][as="image"]').forEach(node => node.remove());
  doc.querySelectorAll('script[type="module"][async]').forEach(node => node.removeAttribute('async'));
  doc.getElementById('root').removeAttribute('data-prerender');
  doc.querySelectorAll('noscript').forEach(node => node.remove());
  doc.head.querySelectorAll('title,meta[name="description"],meta[name="robots"],meta[property^="og:"],meta[name^="twitter:"],link[rel="canonical"],link[rel="alternate"][hreflang],#organic-schema').forEach(n => n.remove());
  const legal = route === 'terms';
  const title = legal ? locales.seo.terms.title : route === 'manage-bookings' ? 'ניהול הזמנות | חיליק רוזנברג' : locales.seo[route].title;
  if (legal) doc.head.insertAdjacentHTML('beforeend', metadataHtml({ title, description: locales.seo.terms.description, path: '/terms' }));
  else doc.head.insertAdjacentHTML('beforeend', `<title>${e(title)}</title><meta name="robots" content="noindex, nofollow">`);
  doc.getElementById('root').innerHTML = legal ? `<main class="organic-overview"><h1>${e(title)}</h1><p>${e(locales.seo.terms.description)}</p><p>להצגת התקנון המלא יש להפעיל JavaScript. ניתן לפנות לחיליק לקבלת התנאים לפני ההזמנה.</p><a href="tel:0506724312">0506724312</a><p><a href="/">חזרה לאתר</a></p></main>` : `<main class="organic-overview"><h1>${e(title)}</h1><p>להמשך יש להפעיל JavaScript. <a href="/">חזרה לאתר</a></p></main>`;
  fs.writeFileSync(path.join(out, route + '.html'), dom.serialize());
  dom.window.close();
}
const urls = sitemapPaths(mode);
// lastmod is the date of the source commit being built (falls back to the build date).
const lastmod = sitemapLastmod();
const videoSitemap = `<video:video><video:thumbnail_loc>${siteOrigin + bakeryVideo.poster}</video:thumbnail_loc><video:title>${e(bakeryVideo.name)}</video:title><video:description>${e(bakeryVideo.description)}</video:description><video:content_loc>${siteOrigin + bakeryVideo.src}</video:content_loc></video:video>`;
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n${urls.map(p => `  <url><loc>${siteOrigin + p}</loc><lastmod>${p === bakeryVideo.path ? GUIDE_UPDATED : lastmod}</lastmod>${p === bakeryVideo.path ? videoSitemap : ''}</url>`).join('\n')}\n</urlset>\n`);
console.log(`Organic pages generated: ${pages.length} guides, ${mode === 'booking' ? 'English /en homepage, ' : ''}4 isolated route shells, ${urls.length} sitemap URLs (lastmod ${lastmod}). No dates or availability fabricated.`);

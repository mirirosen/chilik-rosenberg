import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { organicCopy, guidePaths, siteOrigin, buildHomeSchema } from '../src/data/organicContent.js';
import { escapeHtml as e, metadataHtml, faqsFor, homeAlternatesHtml, sitemapPaths, sitemapLastmod } from './organic-html.mjs';

const mode = process.argv[2];
if (!['booking', 'inquiry'].includes(mode)) throw Error('Expected booking or inquiry mode');
const out = path.resolve(mode === 'booking' ? 'dist-booking' : 'dist-inquiry');
const entry = fs.readFileSync(path.join(out, `${mode}-index.html`), 'utf8');
const css = fs.readFileSync(new URL('../src/organic-seo.css', import.meta.url), 'utf8');
const heSections = [
  ['מה טועמים בסיור קולינרי בבני ברק?', 'בתפריט של חיליק מופיעים צ׳ולנט, קוגל ירושלמי, דגים וכבד קצוץ. אלה מאכלים המזוהים עם המטבח היהודי ועם ההכנות לשבת. השילוב בין הטעימות לסיפורים נותן הקשר למה שאוכלים: אוכל ביתי, מאפיות והמפגש בין חיי היום־יום למסורת. אין להסיק שכל מאכל מוצע בכל סיור; מומלץ לברר מראש מה מתוכנן במועד שבחרתם.'],
  ['למה מבקרים בבני ברק ביום חמישי בערב?', 'הסיורים מתקיימים בדרך כלל בחמישי בערב, לקראת שבת. חיליק מספר על העיר שבה נולד וחי, ומחבר בין האוכל לבין מוסדות, מנהגים וחיי החברה החרדית. זו הזדמנות לשאול שאלות על דברים שרואים בדרך ולקבל תשובה ממדריך מקומי. המועד בפועל תלוי בתיאום ובזמינות; מידע כללי על חמישי אינו אישור להרשמה.'],
  ['איך מתכוננים לביקור?', 'הגיעו בלבוש צנוע ומכבד ובדקו מראש את מסלול ההליכה ואת תנאי הגישה אם יש קושי בהליכה, עגלה או צורך נגישות אחר. פנו לחיליק לפני ההזמנה כדי לברר כשרות, צמחונות ואלרגיות, ולא ביום הסיור בלבד. אל תניחו שכל תחנה יכולה להתאים לכל מגבלה. לפרטי נקודת המפגש, חניה ודרכי הגעה, פנו לחיליק לפני ההגעה.'],
  ['סיור פתוח או מפגש פרטי?', 'לפני הצטרפות לסיור פתוח, בדקו איזה מועדים זמינים וכיצד מאשרים את ההזמנה. קבוצה המעוניינת במועד ובתוכן שיתואמו מראש יכולה לברר על סיור פרטי. מחיר של 250 ש״ח למשתתף מתייחס לסיור המוצג באתר ואינו הצעת מחיר לקבוצה פרטית. את התאמת הסיור לצורכי הקבוצה ואת התנאים יש לקבל מחיליק.'],
];
const enSections = [
  ['What food can you expect?', 'Chilik’s published menu includes cholent, Jerusalem kugel, fish and chopped liver. These dishes provide an introduction to Jewish food traditions and preparations for Shabbat. Tastings are combined with stories about the city and the people who live there. Ask what is planned for your chosen date; a dish listed on the website is not a promise that it will be served on every tour.'],
  ['Why visit on a Thursday evening?', 'Tours usually take place on Thursday evenings, before Shabbat. Chilik connects the food with stories about everyday life, traditions and the Haredi community. As a guide who was born in Bnei Brak and lives there, he brings a local perspective to the visit. A general description of Thursday tours does not confirm a particular date: availability and your booking must still be checked.'],
  ['How should you prepare?', 'Wear modest, respectful clothing. Before booking, ask about the walking route, access to stops, kosher supervision, vegetarian options and allergies. Do not assume every stop can accommodate every requirement. Ask Chilik for the exact meeting point, parking and transport arrangements before arrival. This guide is written in English; it does not confirm that tours are delivered in English. Contact Chilik before booking if you need an English-speaking tour.'],
  ['An open tour or a private group?', 'Before joining an open tour, check which dates are available and how to confirm your booking. A group can ask Chilik about a private tour with timing and content agreed beforehand. The listed price of ₪250 per guest relates to the tour shown on the website and is not a quotation for a private group. Contact Chilik for the group’s requirements, language and terms.'],
];
const privateSections = [
  ['למי מיועד סיור פרטי בבני ברק?', 'אפשר לברר על סיור פרטי לקבוצה שרוצה מועד ותוכן שייקבעו מראש: מפגש חברים, צוות או קבוצה שמתעניינת באוכל ובחיים החרדיים. הסיור של חיליק מחבר בין טעימות, סיפורים ושיחה עם תושב העיר. התאמת הסיור לקבוצה אינה מובטחת לפני תיאום; גילי המשתתפים, מספרם וצורכי הגישה חשובים לתכנון.'],
  ['אילו פרטים כדאי להעביר לחיליק?', 'הכינו את המועד או טווח המועדים הרצוי, מספר המשתתפים, גילאים בקבוצה ושפת ההדרכה המבוקשת. ספרו מה מעניין אתכם: אוכל יהודי, היכרות עם העיר או שיחה על התרבות החרדית. אם נדרשת התאמת הליכה, כיסאות גלגלים או עגלות, ציינו זאת בתחילת הבירור. כך אפשר לברר את מסלול הסיור ואת התאמת התחנות לפני קבלת החלטה.'],
  ['איך מתאמים את האוכל ואת רמת הכשרות?', 'יש לברר עם חיליק את ההכשרים בתחנות המתוכננות ואת האפשרות להתאים את הטעימות לצמחונים או למשתתפים עם אלרגיות. אין להסיק מהתפריט הכללי שכל תחנה מתאימה לכל דרישה. ציינו את הצרכים במדויק מראש ובקשו תשובה על הסיור הפרטי שאתם מתכננים. המאכלים והתחנות נקבעים לפי התיאום; אין כאן תפריט פרטי קבוע.'],
  ['מה המחיר, משך הסיור ונקודת המפגש?', 'הסיור המוצג באתר עולה 250 ש״ח למשתתף ונמשך בדרך כלל כשעתיים וחצי עד שלוש שעות. המחיר והתנאים לסיור פרטי דורשים תיאום נפרד; אין להשתמש במחיר הסיור הפתוח כהצעת מחיר לקבוצה. יש לברר מראש את משך המפגש המתוכנן, נקודת ההתחלה, חניה, לבוש ותנאי ביטול ודחייה.'],
  ['איך מתקדמים מהבירור להזמנה?', 'פונים לחיליק עם פרטי הקבוצה ומבררים זמינות והתאמה. לפני האישור ודאו שהמועד, המחיר, התוכן ודרישות מיוחדות ברורים לשני הצדדים. פנייה ב־WhatsApp היא התחלת בירור ואינה שומרת מקום או מאשרת סיור פרטי. אם אתם מעוניינים להצטרף לסיור פתוח, חזרו לאתר לפרטי ההזמנה או פנו לחיליק לבירור.'],
];
const pages = [
  { path: guidePaths[0], language: 'he', title: 'סיור קולינרי בבני ברק: אוכל, מחיר והכנה | חיליק רוזנברג', h1: 'סיור קולינרי בבני ברק: מה טועמים ואיך מתכוננים?', description: 'מה טועמים בסיור אוכל בבני ברק, למה מבקרים בחמישי בערב ואיך מתכוננים? מדריך ללבוש, כשרות, נגישות, מחיר ותיאום עם חיליק רוזנברג.', sections: heSections, alternate: guidePaths[2] },
  { path: guidePaths[1], language: 'he', title: 'סיור פרטי בבני ברק לקבוצה | חיליק רוזנברג', h1: 'סיור פרטי בבני ברק: איך מתכננים מפגש לקבוצה?', description: 'תכנון סיור פרטי בבני ברק עם חיליק רוזנברג: מועד, מספר משתתפים, אוכל, כשרות, נגישות ותנאי ההזמנה. פונים לתיאום אישי לקבוצה.', sections: privateSections },
  { path: guidePaths[2], language: 'en', title: 'Bnei Brak Food Tour: Price & Planning | Chilik Rosenberg', h1: 'Bnei Brak food tour: what to taste and how to prepare', description: 'Plan a Bnei Brak food tour: Jewish dishes, Thursday evenings, clothing, dietary questions and private groups. Check language and availability with Chilik before booking.', sections: enSections, alternate: guidePaths[0] },
];
fs.mkdirSync(path.join(out, 'guides'), { recursive: true });
function guideFaqs(page) {
  const faqs = faqsFor(page.language, mode === 'booking');
  const keys = page.path.includes('private-tour') ? ['q1', 'q3', 'q4', 'q10', 'q11', 'q12'] : ['q3', 'q7', 'q8', 'q4', 'q5', 'q10', 'q11', 'q12'];
  return keys.map(key => faqs[key]);
}
function planningDetails(page) {
  const english = page.language === 'en';
  const privateGroup = page.path.includes('private-tour');
  const faq = `<section id="guide-faq"><h2>${english ? 'Practical questions before you book' : 'שאלות מעשיות לפני ההזמנה'}</h2>${guideFaqs(page).map(({ question, answer }) => `<section><h3>${e(question)}</h3><p>${e(answer)}</p></section>`).join('')}</section>`;
  if (privateGroup) return `<section><h2>מה להכין לפני שפונים לגבי קבוצה?</h2><p>כדי שהבירור יהיה ממוקד, רכזו את מספר המשתתפים, המועד המבוקש וטווח מועדים חלופיים, מטרת המפגש ושפת ההדרכה הנדרשת. ציינו אם זו קבוצה של עובדים, חברים או משפחה, ואם יש ילדים או משתתפים שזקוקים להתאמות בהליכה. אלה פרטים לבירור, ולא אישור שחיליק יכול לספק כל התאמה או כל שפה.</p><p>כדאי למנות איש קשר אחד שירכז שאלות על אוכל, נגישות ותשלום. לפני שמעבירים למשתתפים הזמנה סופית, קבלו מחיליק את פרטי המועד והמפגש, המחיר לקבוצה ותנאי השינוי או הביטול. אל תסתמכו על המחיר למשתתף בסיור הפתוח כדי לחשב הצעה לקבוצה פרטית.</p><p>לאחר אישור הפרטים, העבירו לקבוצה את הנחיות ההגעה והלבוש שקיבלתם ואת פרטי איש הקשר. שאלות רפואיות או רגישויות למזון יש לברר ישירות מראש, כדי שלא להסתמך על תיאור כללי של התפריט.</p></section>${faq}`;
  const menu = JSON.parse(fs.readFileSync(path.resolve('src/locales/' + page.language + '.json'), 'utf8')).menu.items;
  const dishes = `<section><h2>${english ? 'The food shown on Chilik’s website' : 'המאכלים המוצגים באתר של חיליק'}</h2><p>${english ? 'These are published menu examples. Ask which tastings are planned for your date; do not use this list as a dietary certification or a guaranteed itinerary.' : 'אלה דוגמאות מתוך התפריט המוצג באתר. בררו אילו טעימות מתוכננות למועד שלכם; הרשימה אינה אישור כשרות או התאמה תזונתית ואינה מסלול מובטח.'}</p><dl>${Object.values(menu).map(item => `<div><dt>${e(item.title)}</dt><dd>${e(item.desc)}</dd></div>`).join('')}</dl><p><a href="/#menu">${english ? 'See the menu on the tour website' : 'לתפריט באתר הסיור'}</a> · <a href="/#videos">${english ? 'Watch clips from the tours' : 'לסרטונים מהסיורים'}</a></p></section>`;
  const coverage = `<section><h2>${english ? 'Read about previous visits' : 'לקריאה על ביקורים קודמים'}</h2><p>${english ? 'Mako’s March 2024 report describes a Thursday-night food tour with Chilik, combining tastings and local stories. Yuvi Yam’s account also describes the food and cultural encounters during a visit with him. These are reports of previous visits, rather than current booking instructions; stops, menus and arrangements can change.' : 'כתבת מאקו ממרץ 2024 מתארת סיור ליל שישי עם חיליק, המשלב טעימות וסיפורים מקומיים. גם בתיאור הביקור של יובי ים מופיעים המאכלים והמפגש עם התרבות בעיר לצד חיליק. אלה תיאורים של ביקורים קודמים, ולא הוראות הזמנה עדכניות; תחנות, תפריטים וסידורי הגעה עשויים להשתנות.'}</p><ul><li><a href="https://www.mako.co.il/food-restaurants/restaurant-news/Article-f69eb4533183e81027.htm" target="_blank" rel="noopener noreferrer">${english ? 'Mako — a Thursday-night tour with Chilik, 2024' : 'מאקו — סיור ליל שישי עם חיליק, 2024'}</a></li><li><a href="https://www.yuviyam.com/post/bnei-brak" target="_blank" rel="noopener noreferrer">${english ? 'Yuvi Yam — a culinary visit to Bnei Brak' : 'יובי ים — קולינריה בבני ברק'}</a></li></ul><p><a href="/#about">${english ? 'More about Chilik Rosenberg' : 'עוד על חיליק רוזנברג'}</a></p></section>`;
  return dishes + faq + coverage;
}
for (const page of pages) {
  const copy = organicCopy[page.language];
  const primaryContact = page.path.includes('private-tour')
    ? `<a href="https://wa.me/972506724312">${e(copy.contact)}</a>`
    : `<a href="/#date-selection">${e(mode === 'booking' ? copy.booking : copy.contact)}</a> · <a href="https://wa.me/972506724312">${e(copy.contact)}</a>`;
  const url = siteOrigin + page.path;
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.description, inLanguage: page.language, about: { '@id': siteOrigin + '/#tour' }, hasPart: { '@id': url + '#guide-faq' } },
    { '@type': 'FAQPage', '@id': url + '#guide-faq', inLanguage: page.language, isPartOf: { '@id': url + '#webpage' }, mainEntity: guideFaqs(page).map(({ question, answer }) => ({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } })) },
    { '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: page.language === 'he' ? 'סיורים עם חיליק' : 'Chilik Tours', item: siteOrigin + '/' }, { '@type': 'ListItem', position: 2, name: page.h1, item: url } ] },
  ] };
  // x-default is the Hebrew guide of the pair.
  const alternates = page.alternate ? `<link rel="alternate" hreflang="${page.language}" href="${url}"><link rel="alternate" hreflang="${page.language === 'he' ? 'en' : 'he'}" href="${siteOrigin + page.alternate}"><link rel="alternate" hreflang="x-default" href="${siteOrigin + (page.language === 'he' ? page.path : page.alternate)}">` : '';
  let html = `<!doctype html><html lang="${page.language}" dir="${page.language === 'he' ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${metadataHtml({ ...page, graph })}${alternates}<link rel="icon" href="/favicon.svg"><style>body{margin:0;background:#121214;font-family:Arial,sans-serif}${css}</style></head><body><main class="organic-overview"><nav aria-label="${page.language === 'he' ? 'ניווט' : 'Navigation'}"><a href="/">${page.language === 'he' ? 'סיורים עם חיליק' : 'Chilik Tours'}</a></nav><h1>${e(page.h1)}</h1><p>${e(copy.intro)}</p>${page.sections.map(([title, text]) => `<section><h2>${e(title)}</h2><p>${e(text)}</p></section>`).join('')}${planningDetails(page)}<nav aria-label="${e(copy.guides)}"><h2>${e(copy.guides)}</h2><ul>${guidePaths.filter(p => p !== page.path).map(p => `<li><a href="${p}">${e(copy.links[guidePaths.indexOf(p)])}</a></li>`).join('')}</ul></nav><p>${primaryContact} · <a href="tel:0506724312">0506724312</a></p><p><a href="/terms">${page.language === 'he' ? 'תנאי שימוש ותקנון' : 'Terms and conditions'}</a></p></main></body></html>`;
  // On the booking site the English guide sends readers to the English homepage.
  if (mode === 'booking' && page.language === 'en') html = html.replace(/href="\/(#[^"]*)?"/g, (_match, hash = '') => `href="/en${hash}"`);
  fs.writeFileSync(path.join(out, page.path.slice(1)), html);
}
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
  const noScript = '<noscript><style>#faq [hidden]{display:block}#faq button{pointer-events:none}</style><p>Online booking requires JavaScript. You can call Chilik: <a href="tel:0506724312">0506724312</a>.</p></noscript>';
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
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(p => `  <url><loc>${siteOrigin + p}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`);
console.log(`Organic pages generated: ${pages.length} guides, ${mode === 'booking' ? 'English /en homepage, ' : ''}4 isolated route shells, ${urls.length} sitemap URLs (lastmod ${lastmod}). No dates or availability fabricated.`);

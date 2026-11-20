import { escapeHtml as e, metadataHtml } from './organic-html.mjs';
import { siteOrigin } from '../src/data/organicContent.js';
import { bakeryVideo, bakeryCaptionCues } from '../src/data/organicVideo.js';
import { TOUR_FACTS_UPDATED } from '../src/data/tourServiceFacts.js';
import { PRIVATE_GUIDE_UPDATED } from '../src/data/privateTourGuide.js';
import { privateTourContactHref } from '../src/data/privateTourContact.js';

export function guideEnrichment({ path, language }) {
  const english = language === 'en', privateGroup = path.includes('private-tour');
  const updated = privateGroup ? PRIVATE_GUIDE_UPDATED : TOUR_FACTS_UPDATED;
  const publisher = english ? 'Hilik Tours website team' : 'צוות אתר סיורי חיליק';
  const image = privateGroup ? '/media/posters/tour-conversations.webp' : bakeryVideo.poster;
  const alt = privateGroup ? 'שיחה עם משתתפים מתוך סרטון הסיור' : english ? 'Vizhnitz challahs beside the ovens, from Hilik’s video' : 'חלות ויזניץ ליד התנורים, מתוך הסרטון של חיליק';
  const caption = privateGroup ? 'המפגשים שבדרך — מתוך סרטון הסיור של חיליק.' : english ? 'A still from Hilik’s Vizhnitz challah clip.' : 'החלות המפורסמות והידועות של מאפיית ויזניץ — מתוך הסרטון של חיליק.';
  const article = { '@type': 'Article', '@id': siteOrigin + path + '#article', mainEntityOfPage: { '@id': siteOrigin + path + '#webpage' }, author: { '@type': 'Organization', '@id': siteOrigin + '/#site-editors', name: publisher, url: siteOrigin + '/' }, publisher: { '@id': siteOrigin + '/#organization' }, about: { '@id': siteOrigin + '/#tour' }, inLanguage: language, dateModified: updated, image: siteOrigin + image };
  const updatedLabel = new Intl.DateTimeFormat(english ? 'en-GB' : 'he-IL', { day: 'numeric', month: english ? 'long' : 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(updated));
  const byline = `<p class="guide-editorial">${e(publisher)} · ${english ? 'Updated' : 'עודכן'} <time datetime="${updated}">${e(updatedLabel)}</time></p>`;
  const figure = `<figure class="guide-photo"><img src="${image}" alt="${e(alt)}" width="540" height="960" loading="lazy"><figcaption>${e(caption)}</figcaption></figure>`;
  const original = privateGroup ? '' : `<section class="guide-source-story"><h2>${english ? 'A moment from Hilik’s tour: Vizhnitz challah' : 'רגע מתוך הסיור של חיליק: חלות ויזניץ'}</h2><p>${english ? 'In his short clip, Hilik talks about the challahs beside the ovens and different preferences for their baking. Watching the clip gives a first-hand example of the food stories he shares. The footage is from a previous visit; it does not promise entry into the bakery or a particular stop on a future tour.' : 'בקטע המצולם חיליק מדבר על החלות ליד התנורים ועל העדפות שונות של מידת האפייה. הסרטון נותן דוגמה ממקור ראשון לסיפורים שמלווים את האוכל. זהו תיעוד מביקור קודם, ללא הבטחת כניסה למאפייה או לתחנה מסוימת בסיור עתידי.'}</p><p><a href="${bakeryVideo.path}">${english ? 'Watch the challah clip with its on-screen text and English translation' : 'לצפייה בסרטון החלות, בכיתוב ובתרגום לאנגלית'}</a></p></section>`;
  return { article, html: byline + figure + original };
}

export function guideTracking({ mode, analyticsScript, language = 'he' }) {
  if (mode !== 'booking') return '';
  if (!/^\/assets\/[A-Za-z0-9_-]+\.js$/.test(analyticsScript || '')) throw new Error('Missing or invalid static-guide analytics entry');
  return `<footer class="guide-privacy"><a href="/privacy.html">${language === 'en' ? 'Privacy policy' : 'מדיניות פרטיות'}</a><button id="analytics-opt-out" type="button" hidden>${language === 'en' ? 'Turn off analytics (Google Analytics)' : 'כיבוי המדידה (Google Analytics)'}</button></footer><script type="module" src="${analyticsScript}"></script>`;
}

export function videoSchema() {
  return { '@type': 'VideoObject', '@id': siteOrigin + bakeryVideo.path + '#video', name: bakeryVideo.name, description: bakeryVideo.description, thumbnailUrl: [siteOrigin + bakeryVideo.poster], uploadDate: bakeryVideo.uploadDate, duration: bakeryVideo.duration, contentUrl: siteOrigin + bakeryVideo.src, inLanguage: 'he', creator: { '@id': siteOrigin + '/#chilik' }, publisher: { '@id': siteOrigin + '/#organization' }, transcript: bakeryCaptionCues.map(c => c.he).join(' ') };
}

export function videoVtt(language) {
  if (!['he', 'en'].includes(language)) throw new Error('Unsupported caption language');
  const time = seconds => new Date(Math.round(seconds * 1000)).toISOString().slice(11, 23);
  return 'WEBVTT\n\n' + bakeryCaptionCues.map(c => `${time(c.start)} --> ${time(c.end)}\n${c[language]}\n`).join('\n');
}

export function watchPage({ mode, analyticsScript, css }) {
  if (!['booking', 'inquiry'].includes(mode)) throw new Error('Unsupported public edition');
  const url = siteOrigin + bakeryVideo.path, video = videoSchema();
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: bakeryVideo.name, inLanguage: 'he', mainEntity: { '@id': video['@id'] }, about: { '@id': siteOrigin + '/#tour' } },
    video,
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'סיורי חיליק', item: siteOrigin + '/' }, { '@type': 'ListItem', position: 2, name: bakeryVideo.name, item: url }] },
  ] };
  const title = bakeryVideo.name + ' | סרטון עם חיליק רוזנברג';
  const cta = mode === 'booking' ? 'בחירת תאריך לסיור' : 'לבירור עם חיליק';
  const englishContinuation = `<p>This clip shows a previous visit and does not promise entry into the bakery on a future tour. Coordinate the tour language with Hilik for your chosen date.</p><p><a href="${mode === 'booking' ? '/en#date-selection' : '/guides/bnei-brak-food-tour-en.html'}">${mode === 'booking' ? 'Choose a tour date in English' : 'Read the English tour guide'}</a> · <a href="${e(privateTourContactHref('en'))}" data-contact-context="private_tour">Ask Hilik about a private group tour</a></p><p>The WhatsApp link opens an editable inquiry. Sending it does not reserve or confirm a tour.</p>`;
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">${metadataHtml({ title, description: bakeryVideo.description, path: bakeryVideo.path, language: 'he', graph })}<link rel="icon" href="/favicon.svg"><style>body{margin:0;background:#121214;font-family:Arial,sans-serif}${css}</style></head><body><header class="guide-header"><a class="guide-header__brand" href="/">סיורים עם חיליק</a><a class="guide-cta__button" href="/#date-selection">${cta}</a></header><main class="organic-overview watch-page"><nav aria-label="ניווט"><a href="/">סיורי חיליק</a> · <a href="/guides/bnei-brak-food-tour.html">מדריך הסיור הקולינרי</a></nav><h1>${e(bakeryVideo.name)}</h1><p>${e(bakeryVideo.description)}</p><video class="watch-video" src="${bakeryVideo.src}" poster="${bakeryVideo.poster}" controls playsinline preload="metadata" width="540" height="960" aria-label="סרטון החלות של חיליק"><track kind="captions" src="/media/captions/vizhnitz-he.vtt" srclang="he" label="עברית — כיתוב המקור"><track kind="captions" src="/media/captions/vizhnitz-en.vtt" srclang="en" label="English — translated on-screen text">לצפייה בסרטון ניתן לפתוח את <a href="${bakeryVideo.src}">קובץ הווידאו</a>.</video><p>פורסם במקור ב־<time data-video-published datetime="${bakeryVideo.uploadDate}">26.1.2026</time> · <a href="${bakeryVideo.source}">הסרטון המקורי בערוץ חיליק</a></p><section><h2>הטקסט המלווה את הסרטון</h2><p>תמלול ערוך על בסיס כתוביות המקור, המוצג גם לקריאה לצד הסרטון.</p><p data-video-text>${e(video.transcript)}</p></section><section lang="en" dir="ltr"><h2>On-screen text in English</h2><p>The Hebrew source text is translated below for readers who prefer English.</p><p>${e(bakeryCaptionCues.map(c => c.en).join(' '))}</p>${englishContinuation}</section><p>הסרטון מתעד ביקור קודם. ההשתתפות בסיור אינה כוללת הבטחה לכניסה למאפייה; תחנות וטעימות עשויות להשתנות.</p><p><a href="/guides/bnei-brak-food-tour.html">מה טועמים ואיך מתכוננים לסיור?</a> · <a href="/guides/private-tour-bnei-brak.html">תיאום סיור פרטי לקבוצה</a></p><section class="guide-cta"><h2>רוצים להכיר את בני ברק עם חיליק?</h2><a class="guide-cta__button" href="/#date-selection">${cta}</a><a href="https://wa.me/972506724312">לבירור עם חיליק</a></section></main>${guideTracking({mode,analyticsScript})}</body></html>`;
}

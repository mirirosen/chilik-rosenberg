import { escapeHtml as e, metadataHtml } from './organic-html.mjs';
import { guideTracking } from './guide-growth.mjs';
import { siteOrigin } from '../src/data/organicContent.js';
import { growthPages, growthGuideLinks, GROWTH_UPDATED } from '../src/data/growthPages.js';

const contact = 'https://wa.me/972506724312';
const anchor = item => '<a href="' + e(item.href) + '">' + e(item.label) + '</a>';
export function renderGrowthPage({ page, mode, css, analyticsScript }) {
  if (!['booking', 'inquiry'].includes(mode)) throw new Error('Unsupported public edition');
  const lecture = page.primaryAction === 'lecture';
  const action = { href: lecture ? contact : '/#date-selection', label: lecture ? 'לבירור הרצאה עם חיליק' : mode === 'booking' ? 'בחירת מועד לסיור' : 'לבירור מועדי סיורים' };
  const button = '<a class="guide-cta__button" href="' + e(action.href) + '">' + e(action.label) + '</a>';
  const url = siteOrigin + page.path;
  const groups = page.questionGroups || [];
  const questions = groups.flatMap(group => group.items);
  const graph = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'WebPage', '@id': url + '#webpage', url, name: page.title, description: page.description, inLanguage: 'he', dateModified: GROWTH_UPDATED, isPartOf: { '@id': siteOrigin + '/#website' }, mainEntity: { '@id': url + (lecture ? '#service' : '#article') } },
    lecture
      ? { '@type': 'Service', '@id': url + '#service', name: page.h1, description: page.intro, serviceType: 'הרצאה ומפגש על החברה החרדית', provider: { '@type': 'Person', '@id': siteOrigin + '/#chilik', name: 'חיליק רוזנברג', url: siteOrigin + '/' }, url }
      : { '@type': 'Article', '@id': url + '#article', headline: page.h1, description: page.intro, mainEntityOfPage: { '@id': url + '#webpage' }, author: { '@type': 'Organization', '@id': siteOrigin + '/#site-editors', name: 'צוות אתר סיורי חיליק', url: siteOrigin + '/' }, publisher: { '@id': siteOrigin + '/#organization' }, inLanguage: 'he', dateModified: GROWTH_UPDATED },
    { '@type': 'FAQPage', '@id': url + '#questions', isPartOf: { '@id': url + '#webpage' }, inLanguage: 'he', mainEntity: questions.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
    { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'סיורים עם חיליק', item: siteOrigin + '/' }, { '@type': 'ListItem', position: 2, name: page.h1, item: url }] },
  ] };
  const tableOfContents = page.sections.concat(groups).map(item => ({ href: '#' + item.id, label: item.title }));
  const sections = page.sections.map(item => '<section id="' + e(item.id) + '"><h2>' + e(item.title) + '</h2>' + item.paragraphs.map(text => '<p>' + e(text) + '</p>').join('') + (item.links.length ? '<ul>' + item.links.map(item => '<li>' + anchor(item) + '</li>').join('') + '</ul>' : '') + '</section>').join('');
  const answers = groups.map(group => '<section id="' + e(group.id) + '"><h2>' + e(group.title) + '</h2>' + group.items.map(item => '<details data-question><summary>' + e(item.question) + '</summary><div><p data-answer>' + e(item.answer) + '</p>' + (item.source ? '<p class="growth-source">' + anchor(item.source) + '</p>' : '') + '</div></details>').join('') + '</section>').join('');
  const related = growthGuideLinks('he').filter(item => item.href !== page.path).concat([
    { href: '/guides/bnei-brak-food-tour.html', label: 'מה טועמים ואיך מתכוננים לסיור בבני ברק' },
    { href: '/guides/private-tour-bnei-brak.html', label: 'סיור פרטי: יום הולדת, יום גיבוש או מפגש משפחתי' },
    { href: '/guides/bnei-brak-food-tour-en.html', label: 'Bnei Brak food tour — English guide' },
  ]);
  return '<!doctype html><html lang="he" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">' +
    metadataHtml({ title: page.title, description: page.description, path: page.path, language: 'he', graph }) +
    '<link rel="icon" href="/favicon.svg"><style>' + css + '</style></head><body class="guide-page"><a class="growth-skip" href="#main-content">דילוג לתוכן</a><header class="guide-header"><a class="guide-header__brand" href="/">סיורים עם חיליק רוזנברג</a>' + button + '</header><main id="main-content" class="organic-overview growth-page"><nav aria-label="ניווט"><a href="/">סיורים עם חיליק</a></nav><h1>' + e(page.h1) + '</h1><p>' + e(page.intro) + '</p><p class="guide-editorial">צוות אתר סיורי חיליק · עודכן <time datetime="' + GROWTH_UPDATED + '">21.11.2026</time></p><nav class="growth-contents" aria-label="תוכן העמוד"><ul>' + tableOfContents.map(item => '<li>' + anchor(item) + '</li>').join('') + '</ul></nav>' + sections + answers +
    '<section class="guide-cta"><h2>' + (lecture ? 'לתיאום המפגש עם חיליק' : 'להמשיך מהקריאה למפגש עם חיליק') + '</h2>' + button + (lecture ? '' : '<a href="' + e(contact) + '">לבירור עם חיליק</a>') + '</section><nav aria-label="מדריכים ונושאים נוספים"><h2>להמשך הקריאה והתכנון</h2><ul>' + related.map(item => '<li>' + anchor(item) + '</li>').join('') + '</ul></nav><p><a href="tel:0506724312">0506724312</a> · <a href="/terms">תנאי שימוש ותקנון</a></p></main>' + guideTracking({ mode, analyticsScript, language: 'he' }) + '</body></html>';
}

export { growthPages };

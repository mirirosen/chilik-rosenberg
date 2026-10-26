import { describe, it, expect, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import { applyRouteMetadata } from '../../src/utils/routeMetadata';
import { organicSeoPlugin, faqsFor } from '../../scripts/organic-html.mjs';

const template = '<!doctype html><html lang="he" dir="rtl"><head><title>old</title><meta name="description" content="old"><link rel="canonical" href="https://old.invalid/"></head><body><noscript><h1>old</h1></noscript><div id="root"></div></body></html>';
const translate = resources => key => key.split('.').reduce((value, part) => value[part], resources);
afterEach(() => { document.head.innerHTML = ''; });

describe('SEO-01: organic metadata and content parity', () => {
  it.each(['inquiry', 'booking'])('makes %s initial text and FAQ schema agree without JavaScript', mode => {
    const dom = new JSDOM(organicSeoPlugin(mode).transformIndexHtml(template));
    const doc = dom.window.document;
    const schema = JSON.parse(doc.querySelector('#organic-schema').textContent);
    const faq = schema['@graph'].find(item => item['@type'] === 'FAQPage');
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('#root').textContent).toContain('סיור קולינרי בבני ברק');
    expect(doc.querySelector('link[rel="canonical"]').href).toBe('https://www.chilik-tours.com/');
    expect(faq.mainEntity).toHaveLength(13);
    for (const question of faq.mainEntity) {
      expect(doc.querySelector('#root').textContent).toContain(question.name);
      expect(doc.querySelector('#root').textContent).toContain(question.acceptedAnswer.text);
    }
    expect(faq.mainEntity[6].acceptedAnswer.text).toBe(faqsFor('he', mode === 'booking').q7.answer);
    if (mode === 'booking') expect(doc.querySelector('#root').textContent).not.toContain('האתר אינו מבצע תשלום');
    dom.window.close();
  });
  it.each([['he', he], ['en', en]])('keeps %s rendered schema aligned with translated FAQ, then removes it on private routes', (language, resources) => {
    const t = translate(resources);
    applyRouteMetadata({ route: 'home', language, t });
    const schema = JSON.parse(document.querySelector('#organic-schema').textContent);
    expect(schema['@graph'].find(n => n['@type'] === 'FAQPage').mainEntity.map(n => n.acceptedAnswer.text)).toEqual(Object.values(resources.faqs).map(n => n.answer));
    for (const route of ['booking', 'confirmation', 'admin', 'not-found']) {
      applyRouteMetadata({ route, language, t });
      expect(document.querySelector('#organic-schema')).toBeNull();
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
      expect(document.querySelector('meta[property="og:url"]')).toBeNull();
      expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
    }
  });
  it('removes homepage schema on legal pages and gives terms its own canonical', () => {
    applyRouteMetadata({ route: 'home', language: 'he', t: translate(he) });
    applyRouteMetadata({ route: 'terms', language: 'he', t: translate(he) });
    expect(document.querySelector('#organic-schema')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]').href).toBe('https://www.chilik-tours.com/terms');
  });
  it('uses identical home title, description, H1 and robots in the initial and rendered Hebrew page', () => {
    const dom = new JSDOM(organicSeoPlugin('booking').transformIndexHtml(template));
    const raw = dom.window.document;
    applyRouteMetadata({ route: 'home', language: 'he', t: translate(he) });
    expect(document.title).toBe(raw.title);
    for (const selector of ['meta[name="description"]', 'meta[name="robots"]']) expect(document.querySelector(selector).content).toBe(raw.querySelector(selector).content);
    expect(raw.querySelector('h1').textContent).toBe(`${he.hero.keyword} ${he.hero.title}`);
    expect(raw.querySelector('h1').textContent).toContain('סיור קולינרי בבני ברק');
    expect(JSON.parse(document.querySelector('#organic-schema').textContent)['@graph'].find(n => n['@type'] === 'WebPage').description).toBe(JSON.parse(raw.querySelector('#organic-schema').textContent)['@graph'].find(n => n['@type'] === 'WebPage').description);
    dom.window.close();
  });
  it('preserves staging isolation in generated and rendered HTML', () => {
    expect(organicSeoPlugin('booking-demo').transformIndexHtml(template)).toBe(template);
    applyRouteMetadata({ route: 'home', language: 'he', isPreprod: true, t: translate(he) });
    expect(document.querySelector('meta[name="robots"]').content).toBe('noindex, nofollow');
    expect(document.querySelector('#organic-schema')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
  it('serializes potentially hostile FAQ text as data, without a script terminator', () => {
    const resources = structuredClone(he);
    resources.faqs.q1.answer = '</script><img src=x onerror=alert(1)>';
    applyRouteMetadata({ route: 'home', language: 'he', t: translate(resources) });
    const text = document.querySelector('#organic-schema').textContent;
    expect(text).not.toContain('</script>');
    expect(JSON.parse(text)['@graph'].find(n => n['@type'] === 'FAQPage').mainEntity[0].acceptedAnswer.text).toBe(resources.faqs.q1.answer);
    expect(document.querySelector('img')).toBeNull();
  });
});

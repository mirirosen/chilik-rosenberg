import { it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { growthPages } from '../../src/data/growthPages.js';
import { renderGrowthPage } from '../../scripts/growth-pages.mjs';
import { sitemapPaths } from '../../scripts/organic-html.mjs';
const pageOptions={mode:'booking',css:'',analyticsScript:'/assets/guideAnalytics-fixture.js'};
const parse=page=>new JSDOM(renderGrowthPage({...pageOptions,page}),{url:'https://www.chilik-tours.com'+page.path});
it('new intent pages publish readable self-canonical documents without JavaScript',()=>{
 expect(growthPages).toHaveLength(4);
 for(const page of growthPages){const dom=parse(page),doc=dom.window.document;
  expect(doc.documentElement.lang).toBe('he');expect(doc.documentElement.dir).toBe('rtl');
  expect(doc.querySelectorAll('h1')).toHaveLength(1);expect(doc.querySelector('h1').textContent).toBe(page.h1);
  expect(doc.querySelector('link[rel=canonical]').href).toBe('https://www.chilik-tours.com'+page.path);
  expect(doc.querySelector('main').textContent).toContain(page.intro);
  expect(doc.querySelector('meta[name=robots]').content).toContain('index, follow');
  expect(doc.querySelector('time').dateTime).toBe('2026-11-21');
  expect(sitemapPaths('booking')).toContain(page.path);expect(sitemapPaths('inquiry')).toContain(page.path);
  expect(doc.querySelector('link[hreflang]')).toBeNull();dom.window.close();
 }
});
it('each answer is discoverable without JS and matches its structured answer',()=>{
 for(const page of growthPages){const dom=parse(page),doc=dom.window.document;
  const graph=JSON.parse(doc.querySelector('#organic-schema').textContent)['@graph'];
  const faq=graph.find(n=>n['@type']==='FAQPage');
  const visible=[...doc.querySelectorAll('[data-question]')].map(n=>({q:n.querySelector('summary').textContent,a:n.querySelector('[data-answer]').textContent}));
  expect(visible.length).toBeGreaterThan(0);
  expect(faq.mainEntity.map(n=>({q:n.name,a:n.acceptedAnswer.text}))).toEqual(visible);
  for(const link of doc.querySelectorAll('a[href^="#"]'))expect(doc.getElementById(link.hash.slice(1))).not.toBeNull();
  dom.window.close();
 }
});
it('lecture intent uses a WhatsApp inquiry and a Service without a fabricated offer',()=>{
 const dom=parse(growthPages.find(p=>p.id==='lectures')),doc=dom.window.document;
 const actions=[...doc.querySelectorAll('a.guide-cta__button')];expect(actions.length).toBeGreaterThanOrEqual(2);
 expect(actions.every(a=>new URL(a.href).hostname==='wa.me')).toBe(true);
 expect(doc.querySelector('main').textContent).not.toMatch(/250|₪|ש״ח/);
 const service=JSON.parse(doc.querySelector('#organic-schema').textContent)['@graph'].find(n=>n['@type']==='Service');
 expect(service).toBeTruthy();expect(service.offers).toBeUndefined();dom.window.close();
});
it('public-guide actions use date selection and related private-group content stays discoverable',()=>{
 for(const page of growthPages.filter(p=>p.id!=='lectures')){const dom=parse(page),doc=dom.window.document;
  expect(doc.querySelector('header a.guide-cta__button').getAttribute('href')).toBe('/#date-selection');
  expect(doc.querySelector('a[href="/guides/private-tour-bnei-brak.html"]')).not.toBeNull();dom.window.close();
 }
});
it('question hub covers six distinct reader needs and links to named sources',()=>{
 const dom=parse(growthPages.find(p=>p.id==='questions')),doc=dom.window.document;
 for(const id of ['haredim','bnei-brak','judaism','hilik','food-tour','jewish-food'])expect(doc.getElementById(id)).not.toBeNull();
 expect(doc.querySelectorAll('[data-question]').length).toBeGreaterThanOrEqual(24);
 expect(doc.querySelector('a[href^="https://www.idi.org.il/"]')).not.toBeNull();dom.window.close();
});
it('inquiry omits analytics while booking preserves the initially hidden opt-out',()=>{
 for(const page of growthPages){
  const inquiry=new JSDOM(renderGrowthPage({...pageOptions,page,mode:'inquiry'}));expect(inquiry.window.document.querySelector('script[type=module]')).toBeNull();inquiry.window.close();
  const dom=parse(page);expect(dom.window.document.getElementById('analytics-opt-out').hidden).toBe(true);dom.window.close();
 }
 expect(()=>renderGrowthPage({...pageOptions,page:growthPages[0],mode:'booking-demo'})).toThrow();
});
it('text from a page cannot inject executable HTML or terminate JSON-LD',()=>{
 const page=structuredClone(growthPages[0]);page.h1='</script><img src=x onerror=alert(1)>';page.intro='<script>alert(1)</script>';
 const dom=parse(page),doc=dom.window.document;
 expect(doc.querySelector('h1').textContent).toBe(page.h1);expect(doc.querySelector('main>p').textContent).toBe(page.intro);
 expect(doc.querySelector('img[onerror]')).toBeNull();expect(doc.querySelector('script:not([type])')).toBeNull();
 expect(()=>JSON.parse(doc.querySelector('#organic-schema').textContent)).not.toThrow();dom.window.close();
});


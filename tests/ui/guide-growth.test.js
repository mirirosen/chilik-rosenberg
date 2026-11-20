import { it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { existsSync } from 'node:fs';
import { guideEnrichment, watchPage, videoVtt } from '../../scripts/guide-growth.mjs';

it('guide attribution and photographs describe the actual publisher and approved media', () => {
  for (const [path, language] of [['/guides/bnei-brak-food-tour.html','he'],['/guides/private-tour-bnei-brak.html','he'],['/guides/bnei-brak-food-tour-en.html','en']]) {
    const result = guideEnrichment({path,language});
    const doc = new JSDOM(result.html).window.document;
    expect(doc.querySelector('time').dateTime).toBe(path.includes('private-tour')?'2026-11-20':'2026-11-17');
    expect(result.article.author['@type']).toBe('Organization');
    expect(result.article.dateModified).toBe(doc.querySelector('time').dateTime);
    const image = doc.querySelector('img');
    expect(existsSync('public'+image.getAttribute('src'))).toBe(true);
    expect(Number(image.width)).toBeGreaterThan(0); expect(Number(image.height)).toBeGreaterThan(0);
    expect(result.article.image).toBe('https://www.chilik-tours.com'+image.getAttribute('src'));
  }
});

it('the watch page visibly exposes the same real video, date and text as its structured data', () => {
  const doc = new JSDOM(watchPage({mode:'booking',analyticsScript:'/assets/guide-analytics-test.js',css:''})).window.document;
  const graph = JSON.parse(doc.querySelector('#organic-schema').textContent)['@graph'];
  const video = graph.find(n=>n['@type']==='VideoObject');
  expect(doc.querySelectorAll('h1')).toHaveLength(1); expect(doc.querySelectorAll('video')).toHaveLength(1);
  expect(video.uploadDate).toBe('2026-01-26T08:45:40-08:00'); expect(video.creator).toMatchObject({ '@type':'Person', name:'חיליק רוזנברג', url:'https://www.chilik-tours.com/' }); expect(doc.querySelector('[data-video-published]').dateTime).toBe(video.uploadDate);
  expect(video.contentUrl).toBe('https://www.chilik-tours.com'+doc.querySelector('video').getAttribute('src'));
  expect(doc.querySelector('video').hasAttribute('autoplay')).toBe(false);
  expect(doc.querySelectorAll('track')).toHaveLength(2);
  expect(doc.querySelector('[data-video-text]').textContent).toBe(video.transcript);
  expect(doc.querySelector('script[type=module]').getAttribute('src')).toBe('/assets/guide-analytics-test.js');
  expect(doc.querySelector('#analytics-opt-out').hidden).toBe(true);
});

it('contact-only video pages have no tracking and caption cues fit the complete source duration', () => {
  const doc = new JSDOM(watchPage({mode:'inquiry',css:''})).window.document;
  expect(doc.querySelector('script[type=module]')).toBeNull();
  for (const language of ['he','en']) {
    const vtt=videoVtt(language); expect(vtt.startsWith('WEBVTT\n')).toBe(true);
    const toSeconds = time => time.split(':').reduce((acc,value)=>acc*60+Number(value),0);
    const windows=[...vtt.matchAll(/(\d\d:\d\d:\d\d\.\d{3}) --> (\d\d:\d\d:\d\d\.\d{3})/g)].map(m=>[toSeconds(m[1]),toSeconds(m[2])]);
    expect(windows.length).toBeGreaterThan(3);
    windows.forEach(([start,end],i)=>{expect(end).toBeGreaterThan(start);expect(end).toBeLessThanOrEqual(12.721);if(i)expect(start).toBeGreaterThanOrEqual(windows[i-1][1]);});
  }
});

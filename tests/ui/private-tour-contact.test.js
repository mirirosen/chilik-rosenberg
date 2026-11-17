import { it, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { privateTourContactHref } from '../../src/data/privateTourContact.js';
import { watchPage } from '../../scripts/guide-growth.mjs';

it.each(['he', 'en'])('opens an editable %s private inquiry with the four planning prompts and the existing recipient', language => {
  const url = new URL(privateTourContactHref(language));
  expect(url.origin).toBe('https://wa.me');
  expect(url.pathname).toBe('/972506724312');
  expect([...url.searchParams.keys()]).toEqual(['text']);
  const message = url.searchParams.get('text');
  for (const label of language === 'he' ? ['מספר משתתפים:', 'מועד מועדף:', 'שפת הדרכה:', 'מטרת המפגש:'] : ['Group size:', 'Preferred date:', 'Tour language:', 'Occasion:']) {
    expect(message).toContain(label);
  }
  expect(message).not.toMatch(/BK-|@|2026-11-26|2026-12-10/);
});

it.each(['booking', 'inquiry'])('offers English continuation without JavaScript on the %s watch page', mode => {
  const doc = new JSDOM(watchPage({ mode, analyticsScript: '/assets/guide-test.js', css: '' })).window.document;
  const region = doc.querySelector('section[lang="en"]');
  const links = [...region.querySelectorAll('a')];
  expect(links.some(a => a.getAttribute('href') === (mode === 'booking' ? '/en#date-selection' : '/guides/bnei-brak-food-tour-en.html'))).toBe(true);
  const contact = links.find(a => a.dataset.contactContext === 'private_tour');
  expect(contact.textContent).toMatch(/private/i);
  expect(contact.getAttribute('href')).toBe(privateTourContactHref('en'));
  expect(region.textContent).toMatch(/previous visit/);
  expect(doc.querySelector('form')).toBeNull();
  if (mode === 'inquiry') expect(links.some(a => a.getAttribute('href').startsWith('/en'))).toBe(false);
});

import { describe, expect, it } from 'vitest';
import { buildHomeSchema, organicCopy } from '../../src/data/organicContent';
import { mediaReferences } from '../../src/data/mediaReferences';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';

const node = (graph, type) => graph['@graph'].find(n => n['@type'] === type);

describe('home JSON-LD', () => {
  const heGraph = buildHomeSchema({ language: 'he', description: 'd', faqs: he.faqs });
  const enGraph = buildHomeSchema({ language: 'en', description: 'd', faqs: en.faqs, path: '/en' });
  it('describes the tour as a TouristTrip with a 250 ILS offer and the 20:00 start', () => {
    const trip = node(heGraph, 'TouristTrip');
    expect(trip.offers).toMatchObject({ '@type': 'Offer', price: '250', priceCurrency: 'ILS' });
    expect(trip.departureTime).toBe('20:00:00');
    expect(node(enGraph, 'TouristTrip').offers.url).toBe('https://www.chilik-tours.com/en');
  });
  it('meeting point is only "Bnei Brak, address sent in the tour week", never the footer address', () => {
    for (const graph of [heGraph, enGraph]) {
      const origin = node(graph, 'TouristTrip').tripOrigin;
      expect(origin.address).toEqual({ '@type': 'PostalAddress', addressLocality: graph === heGraph ? 'בני ברק' : 'Bnei Brak', addressCountry: 'IL' });
      expect(JSON.stringify(node(graph, 'TouristTrip'))).not.toMatch(/רחוב לחי|לחי 11|Lehi|Lechi/);
    }
  });
  it('LocalBusiness keeps the footer address as its business address, with no rating or review', () => {
    expect(node(heGraph, 'LocalBusiness').address).toMatchObject({ streetAddress: 'רחוב לחי 11', addressLocality: 'בני ברק', addressCountry: 'IL' });
    expect(he.footer.address).toBe('רחוב לחי 11, בני ברק');
    expect(node(enGraph, 'LocalBusiness').address).toMatchObject({ streetAddress: '11 Lehi Street', addressLocality: 'Bnei Brak' });
    expect(JSON.stringify([heGraph, enGraph])).not.toMatch(/aggregateRating|"Review"|ratingValue/i);
  });
  it('tour languages are Hebrew and English (valid properties only)', () => {
    expect(node(enGraph, 'Person').knowsLanguage).toEqual(['he', 'en']);
    expect(node(enGraph, 'LocalBusiness').contactPoint.availableLanguage).toEqual(['Hebrew', 'English']);
  });
  it('primary names: Hebrew as on the site, English "Hilik Rozenberg"; the others are alternateName', () => {
    expect(node(heGraph, 'Person').name).toBe('חיליק רוזנברג');
    expect(node(enGraph, 'Person').name).toBe('Hilik Rozenberg');
    expect(node(enGraph, 'Person').alternateName).toEqual(['Chilik Rosenberg', 'Hilik Rosenberg', 'Chilik Rozenberg', 'חיליק רוזנברג']);
    expect(node(heGraph, 'Person').alternateName).toEqual(['Hilik Rozenberg', 'Chilik Rosenberg', 'Hilik Rosenberg', 'Chilik Rozenberg']);
    expect(node(enGraph, 'LocalBusiness').name).toBe('Hilik Rozenberg Tours');
    expect(node(enGraph, 'LocalBusiness').alternateName[0]).toBe('Hilik Tours');
    expect(organicCopy.en.title).toBe('Bnei Brak culinary tour with Hilik Rozenberg');
  });
  it('publishes no sameAs (social profiles await owner confirmation)', () => {
    for (const graph of [heGraph, enGraph]) {
      expect(JSON.stringify(graph)).not.toContain('sameAs');
      const text = JSON.stringify(graph);
      for (const { url } of mediaReferences.filter(item => item.category === 'online' && item.id !== 'tour-site')) expect(text).not.toContain(url);
    }
  });
  it('the FAQ schema carries the start time, meeting point and languages in both languages', () => {
    for (const [graph, words] of [[heGraph, ['20:00', 'הכתובת המדויקת נשלחת בשבוע הסיור', 'בעברית ובאנגלית']], [enGraph, ['20:00', 'exact address is sent during the week', 'Hebrew and English']]]) {
      const answers = node(graph, 'FAQPage').mainEntity.map(q => q.acceptedAnswer.text).join(' ');
      for (const word of words) expect(answers).toContain(word);
      expect(answers).not.toMatch(/רחוב לחי|לחי 11|Lehi|Lechi/);
    }
  });
});

describe('published copy', () => {
  it('English visible text uses Hilik, never Chilik (domain and identifiers excluded)', () => {
    for (const json of [en, organicCopy.en]) expect(JSON.stringify(json)).not.toMatch(/\bChilik\b/);
  });
  it('no maximum group size is published', () => {
    const text = JSON.stringify([he, en, organicCopy]);
    expect(text).not.toMatch(/up to \d+ (guests|participants|people)|עד \d+ (משתתפים|אורחים)|group size/i);
  });
});

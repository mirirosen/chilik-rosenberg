import { describe, expect, it } from 'vitest';
import { buildHomeSchema, sameAsProfiles } from '../../src/data/organicContent';
import { mediaReferences } from '../../src/data/mediaReferences';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';

const node = (graph, type) => graph['@graph'].find(n => n['@type'] === type);

describe('home JSON-LD', () => {
  const heGraph = buildHomeSchema({ language: 'he', description: 'd', faqs: he.faqs });
  const enGraph = buildHomeSchema({ language: 'en', description: 'd', faqs: en.faqs, path: '/en' });
  it('describes the tour as a TouristTrip with a 250 ILS offer', () => {
    const trip = node(heGraph, 'TouristTrip');
    expect(trip.offers).toMatchObject({ '@type': 'Offer', price: '250', priceCurrency: 'ILS' });
    expect(node(enGraph, 'TouristTrip').offers.url).toBe('https://www.chilik-tours.com/en');
  });
  it('LocalBusiness carries the footer address and no rating or review', () => {
    expect(node(heGraph, 'LocalBusiness').address).toMatchObject({ streetAddress: 'רחוב לחי 11', addressLocality: 'בני ברק', addressCountry: 'IL' });
    expect(he.footer.address).toBe('רחוב לחי 11, בני ברק');
    expect(node(enGraph, 'LocalBusiness').address).toMatchObject({ streetAddress: '11 Lehi Street', addressLocality: 'Bnei Brak' });
    expect(en.footer.address).toBe('11 Lehi Street, Bnei Brak');
    expect(JSON.stringify([heGraph, enGraph])).not.toMatch(/aggregateRating|"Review"|ratingValue/i);
  });
  it('keeps the on-site primary name and lists the other spellings as alternateName', () => {
    expect(node(heGraph, 'Person').name).toBe('חיליק רוזנברג');
    expect(node(enGraph, 'Person').name).toBe('Chilik Rosenberg');
    expect(node(heGraph, 'Person').alternateName).toEqual(['Chilik Rosenberg', 'Hilik Rosenberg', 'Hilik Rozenberg']);
    expect(node(heGraph, 'LocalBusiness').alternateName).toEqual(expect.arrayContaining(['Hilik Rozenberg', 'חיליק רוזנברג']));
  });
  it('sameAs uses only profile links already present in the site media data', () => {
    const known = new Set(mediaReferences.map(item => item.url));
    expect(sameAsProfiles.length).toBe(5);
    for (const url of sameAsProfiles) expect(known.has(url)).toBe(true);
    expect(node(heGraph, 'Person').sameAs).toEqual(sameAsProfiles);
  });
});

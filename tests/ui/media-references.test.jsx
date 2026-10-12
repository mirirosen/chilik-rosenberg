import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
import { mediaCategories, mediaReferences } from '../../src/data/mediaReferences';
const state = vi.hoisted(() => ({ language: 'he' }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({
  i18n: { resolvedLanguage: state.language },
  t: (key, values = {}) => Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{{${name}}}`, value), key.split('.').reduce((value, part) => value?.[part], state.language === 'he' ? he : en) || key),
}) }));
import MediaSection from '../../src/components/MediaSection';
afterEach(() => { cleanup(); state.language = 'he'; });
describe('media directory', () => {
  // MEDIA-01: retain the supplied references plus verified additions.
  it('retains every supplied reference with safe, unique destinations', () => {
    const supplied = ['maariv-cholent','mako-tour','yedioth-interview','jdn-interview','bb-now-tour','kikar-quote','walla-opposites','ynet-opposites','yedioth-opposites','hayom-opposites','morning-interview','nos-profile','yuvi-yam','opposites-series','donkey-tour','provokatza-8','raz-84','hani-podcast','unity-now','coffee-podcast','hazon-ish-live','youtube-channel','instagram','x','linkedin','tiktok-magazine','tiktok-eat-drink','tour-site','gula-show','foodish-tour','facebook'];
    expect(mediaReferences).toHaveLength(38);
    expect(new Set(mediaReferences.map(item => item.id)).size).toBe(38);
    expect(new Set(mediaReferences.map(item => item.url)).size).toBe(38);
    for (const id of supplied) expect(mediaReferences.some(item => item.id === id)).toBe(true);
    for (const item of mediaReferences) {
      expect(new URL(item.url).protocol).toBe('https:');
      expect(mediaCategories).toContain(item.category);
      expect(item.title.he && item.title.en && item.outlet.he && item.outlet.en).toBeTruthy();
    }
    expect(mediaReferences.find(item => item.id === 'facebook').url).toBe('https://www.facebook.com/hylyq.rwznbrg/reels/');
  });
  // MEDIA-02: filters and expansion expose all entries, in either language.
  it.each(['he', 'en'])('expands and filters without dropping links (%s)', language => {
    state.language = language;
    const copy = language === 'he' ? he.media : en.media;
    const { container } = render(<MediaSection />);
    expect(screen.getAllByRole('link')).toHaveLength(6);
    fireEvent.click(container.querySelector('.media-show-more'));
    expect(screen.getAllByRole('link')).toHaveLength(38);
    for (const link of screen.getAllByRole('link')) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    }
    for (const category of mediaCategories) {
      const filter = screen.getByRole('button', { name: new RegExp(copy.categories[category]) });
      fireEvent.click(filter);
      expect(filter.getAttribute('aria-pressed')).toBe('true');
      expect(screen.getAllByRole('link')).toHaveLength(6);
      fireEvent.click(container.querySelector('.media-show-more'));
      expect(screen.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(mediaReferences.filter(item => item.category === category).map(item => item.url));
      expect(container.querySelector('.media-show-more').getAttribute('aria-expanded')).toBe('true');
      fireEvent.click(container.querySelector('.media-show-more'));
      expect(screen.getAllByRole('link')).toHaveLength(6);
    }
  });
});

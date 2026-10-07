import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import fs from 'node:fs';

const groups = vi.hoisted(() => [
  { id: 'hilik-bnei-brak', items: [] },
  { id: 'donkey-bnei-brak', items: [] },
]);
vi.mock('../../src/data/content', async original => ({ ...await original(), tourVideos: groups }));
import i18n from '../../src/inquiry-i18n';
import TourVideos from '../../src/components/TourVideos';
import Header from '../../src/components/Header';
import InquiryApp from '../../src/InquiryApp';
import { populatedTourVideoGroups, tourVideoPoster, tourVideoSource } from '../../src/utils/tourVideos';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';

// Metadata fixtures only: no media file is created or added to public content.
const localVideo = {
  id: 'test-only-local', src: 'public/tour-videos/hilik-bnei-brak/test-only.mp4',
  title: { he: 'סרטון בדיקה מקומי', en: 'Local test video' }, aspectRatio: '9/16',
  captions: [{ src: '/tour-videos/hilik-bnei-brak/test-only-he.vtt', srcLang: 'he', label: { he: 'עברית', en: 'Hebrew' } }],
};
const remoteVideo = {
  id: 'test-only-remote', src: 'https://media.example.invalid/test-only.mp4',
  title: { he: 'סרטון בדיקה מרוחק', en: 'Remote test video' },
};
function populate() { groups[0].items.push(localVideo); groups[1].items.push(remoteVideo); }

beforeEach(() => {
  groups.forEach(group => { group.items.length = 0; });
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('No APIs or fixture downloads in rendering tests'); }));
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: query.includes('reduce') && !query.includes('no-preference'), addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} unobserve() {} });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState({}, '', '/');
});
afterEach(() => { cleanup(); groups.forEach(group => { group.items.length = 0; }); vi.unstubAllGlobals(); });

describe('provided tour videos and empty-group behavior', () => {
  it('ships all nine provided clips with preserved Hebrew IDs, an empty donkey group and no public media fixtures', async () => {
    const actual = await vi.importActual('../../src/data/content');
    expect(actual.tourVideos.map(group => group.id)).toEqual(['hilik-bnei-brak', 'donkey-bnei-brak']);
    expect(actual.tourVideos[0].items.map(item => item.id)).toEqual(['MxVd7LEjkJyq1eXMAuuT', 'ZUh34zcXVyiUPmbWPWAR', 'XEN797qZSr8SCo5xshoP', 'חלק-49', 'חלק-50', 'חלק-51', 'חלק-58', 'חלק-59', 'חלק-60']);
    expect(actual.tourVideos[0].items.map(item => item.durationSec)).toEqual([90, 150, 120, 44, 46, 44, 46, 44, 46]);
    expect(actual.tourVideos[1].items).toEqual([]);
    for (const item of actual.tourVideos[0].items) expect(new URL(item.src).pathname).toMatch(/^\/hilik-site-tour-videos\/hilik-bnei-brak\//);
    for (const group of actual.tourVideos) expect(fs.readdirSync(`public/tour-videos/${group.id}`)).toEqual(['README.md']);
  });

  it.each([[], [{ id: 'hilik-bnei-brak', items: [] }], [{ id: 'donkey-bnei-brak' }]])('renders no section, heading or gap for empty content %j', data => {
    const { container } = render(<TourVideos groups={data} />);
    expect(container.innerHTML).toBe('');
  });

  it('hides incomplete or unsupported items rather than creating broken players', () => {
    const data = [{ id: 'hilik-bnei-brak', items: [
      { ...localVideo, src: '' }, { ...localVideo, src: 'javascript:alert(1)' },
      { ...localVideo, title: { he: 'כותרת בלבד' } },
    ] }];
    const { container } = render(<><Header showVideos={populatedTourVideoGroups(data).length > 0} /><TourVideos groups={data} /></>);
    expect(container.querySelector('#videos, video, a[href="/#videos"]')).toBeNull();
  });

  it('accepts an empty #videos hash without changing the public manual-enquiry flow', async () => {
    await i18n.changeLanguage('en'); window.history.replaceState({}, '', '/#videos');
    const { container } = render(<InquiryApp />);
    expect(container.querySelector('#videos, video:not(.target-hero__ambient), a[href="/#videos"]')).toBeNull();
    expect(screen.getByRole('heading', { name: i18n.t('inquiry.title'), exact: true })).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['he', 'en'])('provides native, named %s players and hides empty groups', async language => {
    await i18n.changeLanguage(language); populate();
    const { container } = render(<TourVideos groups={[...groups, { id: 'unused-group', items: [] }]} />);
    expect(screen.getByRole('heading', { name: i18n.t('tourVideos.title') })).toBeTruthy();
    expect(container.querySelectorAll('video')).toHaveLength(2);
    expect(screen.queryByText('tourVideos.groups.unused-group')).toBeNull();
    for (const item of [localVideo, remoteVideo]) {
      const player = screen.getByLabelText(item.title[language]);
      expect(player.tagName).toBe('VIDEO'); expect(player.controls).toBe(true); expect(player.playsInline).toBe(true);
      expect(player.getAttribute('preload')).toBe('none'); expect(player.hasAttribute('autoplay')).toBe(false);
      expect(player.hasAttribute('muted')).toBe(false); expect(player.getAttribute('poster')).toBeNull();
      expect(document.getElementById(player.getAttribute('aria-labelledby')).getAttribute('dir')).toBe('auto');
    }
    const local = screen.getByLabelText(localVideo.title[language]);
    expect(local.getAttribute('src')).toBe('/tour-videos/hilik-bnei-brak/test-only.mp4');
    expect(local.parentElement.style.aspectRatio).toBe('9/16');
    expect(local.querySelector('track').default).toBe(language === 'he');
    expect(screen.getByLabelText(remoteVideo.title[language]).getAttribute('src')).toBe(remoteVideo.src);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['he', 'en'])('adds an optional %s menu link and preserves mobile reduced-motion navigation', async language => {
    await i18n.changeLanguage(language); populate();
    const { container } = render(<><Header showVideos={populatedTourVideoGroups(groups).length > 0} /><TourVideos /></>);
    expect(container.querySelectorAll('a[href="/#videos"]')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: i18n.t('header.menuButton') }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: i18n.t('tourVideos.nav') }));
    expect(container.querySelector('#videos').scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
    expect(document.body.style.overflow).toBe('');
  });

  it.each(['he', 'en'])('places populated %s videos right after the intro and before the inquiry section, and resolves #videos', async language => {
    await i18n.changeLanguage(language); populate(); window.history.replaceState({}, '', '/#videos');
    const { container } = render(<InquiryApp />);
    const section = container.querySelector('#videos');
    expect(section.previousElementSibling.id).toBe('introduction'); expect(section.nextElementSibling.id).toBe('date-selection');
    expect(section.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
    expect(document.documentElement.dir).toBe(language === 'he' ? 'rtl' : 'ltr');
    expect(container.querySelectorAll('a[href="/#videos"]')).toHaveLength(2);
    expect(container.querySelector('form, input, select, textarea')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('normalizes public video paths and keeps external sources HTTPS without credentials', () => {
    expect(tourVideoSource('tour-videos/hilik-bnei-brak/final.mp4')).toBe('/tour-videos/hilik-bnei-brak/final.mp4');
    expect(tourVideoSource('/tour-videos/../private.mp4')).toBeNull();
    expect(tourVideoSource('https://user:password@example.invalid/final.mp4')).toBeNull();
    expect(tourVideoSource('http://example.invalid/final.mp4')).toBeNull();
    expect(tourVideoPoster('/media/posters/part-49-hilik-invite-tour.webp')).toBe('/media/posters/part-49-hilik-invite-tour.webp');
    expect(tourVideoPoster('/media/posters/../secret.webp')).toBeNull();
    expect(tourVideoPoster('/media/other/x.webp')).toBeNull();
    expect(tourVideoPoster('/media/posters/x.png')).toBeNull();
  });

  it('keeps complete HE/EN resources and opens only media sources in the public Hosting CSP', () => {
    expect(Object.keys(he.tourVideos)).toEqual(Object.keys(en.tourVideos));
    expect(Object.keys(he.tourVideos.groups)).toEqual(Object.keys(en.tourVideos.groups));
    for (const language of ['he', 'en']) expect(i18n.getFixedT(language)('tourVideos.nav')).not.toBe('tourVideos.nav');
    const config = JSON.parse(fs.readFileSync('firebase.hosting.inquiry.json', 'utf8'));
    const policies = config.hosting.headers.flatMap(rule => rule.headers).filter(header => header.key === 'Content-Security-Policy');
    expect(policies.length).toBeGreaterThan(0);
    for (const policy of policies) {
      expect(policy.value).toContain("media-src 'self' https:");
      expect(policy.value).toContain("connect-src 'none'"); expect(policy.value).toContain("form-action 'none'");
    }
  });
});

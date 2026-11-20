import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { existsSync, readFileSync, statSync } from 'node:fs';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key.split('.').reduce((v, k) => v?.[k], he) || key }) }));
import Menu from '../../src/components/Menu';
import Hero from '../../src/components/Hero';
import RatingBar from '../../src/components/RatingBar';
afterEach(cleanup);
describe('locally hosted illustrative imagery', () => {
  it('shows six responsive food images and an honest menu disclosure', () => {
    const { container } = render(<Menu />);
    const images = container.querySelectorAll('img');
    expect(images).toHaveLength(6);
    expect(screen.getByText(he.imagery.menuDisclosure)).toBeTruthy();
    for (const img of images) {
      expect(img.alt).toContain(he.imagery.generated);
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('srcset')).toContain('480w');
      for (const width of [480, 960]) {
        const path = `public${img.getAttribute('src').replace('960', width)}`;
        expect(existsSync(path)).toBe(true);
        const bytes = readFileSync(path);
        expect(bytes.toString('ascii', 8, 12)).toBe('WEBP');
        expect(statSync(path).size).toBeLessThan(160000);
      }
    }
  });
  it('identifies original hero and tour media without fabricating lecturer photography', () => {
    const { container } = render(<><Hero /><RatingBar /></>);
    // Both public scenes are original footage. The menu retains its separate illustration disclosure.
    expect(screen.queryAllByText(he.imagery.generated)).toHaveLength(0);
    expect(screen.getByText(he.imagery.previousVisit)).toBeTruthy();
    expect(container.querySelector('.target-hero .target-hero__image-note')).toBeNull();
    expect(container.querySelector('.target-tour-pick').textContent).toContain(he.imagery.previousVisit);
    expect(container.querySelector('.target-hero__food').getAttribute('src')).toBe('/media/hero/bnei-brak-sequence-poster.webp');
    expect(container.querySelector('.target-hero__food').getAttribute('fetchpriority')).toBe('high');
    expect(container.querySelector('.target-tour-pick--portrait img').getAttribute('src')).toContain('hilik-cutout-provided');
    expect(Object.keys(he.imagery)).toEqual(Object.keys(en.imagery));
  });
  it('announces the real tour card provenance as its description, not its name', () => {
    render(<RatingBar />);
    const tours = screen.getByRole('link', { name: he.intro.tours });
    const note = document.getElementById(tours.getAttribute('aria-describedby'));
    expect(note.textContent).toBe(he.imagery.previousVisit);
    for (const img of document.querySelectorAll('.target-tour-pick img')) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
  });
  it('uses the existing documentary source with its measured landscape dimensions', () => {
    const { container } = render(<RatingBar />);
    const img = container.querySelector('.target-tour-pick--documentary img');
    expect(img.getAttribute('src')).toBe('/media/posters/bneibrak-zoo-720p.webp');
    expect([img.width,img.height]).toEqual([640,360]);
    const bytes=readFileSync('public'+img.getAttribute('src'));
    expect(bytes.toString('ascii',8,12)).toBe('WEBP');
  });
  it('retains the supplied portrait and its actual dimensions', () => {
    const { container } = render(<RatingBar />);
    const img=container.querySelector('.target-tour-pick--portrait img');
    expect(img.getAttribute('src')).toContain('hilik-cutout-provided');
    expect([img.width,img.height]).toEqual([376,513]);
    expect(readFileSync('src/assets/hilik-cutout-provided.webp').toString('ascii',8,12)).toBe('WEBP');
  });
});

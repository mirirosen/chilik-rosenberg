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
  it('labels generated hero and tour images without fabricating lecturer photography', () => {
    const { container } = render(<><Hero /><RatingBar /></>);
    // The hero is now real footage (plan §18, S7): no AI disclosure there; the tour pick keeps its AI cholent label.
    expect(screen.getAllByText(he.imagery.generated)).toHaveLength(1);
    expect(container.querySelector('.target-hero .target-hero__image-note')).toBeNull();
    expect(container.querySelector('.target-tour-pick').textContent).toContain(he.imagery.generated);
    expect(container.querySelector('.target-hero__food').getAttribute('src')).toBe('/media/hero/bnei-brak-sequence-poster.webp');
    expect(container.querySelector('.target-hero__food').getAttribute('fetchpriority')).toBe('high');
    expect(container.querySelector('.target-tour-pick--portrait img').getAttribute('src')).toContain('hilik-cutout-provided');
    expect(Object.keys(he.imagery)).toEqual(Object.keys(en.imagery));
  });
  it('announces the tour card AI disclosure as its description, not its name', () => {
    render(<RatingBar />);
    const tours = screen.getByRole('link', { name: he.intro.tours });
    const note = document.getElementById(tours.getAttribute('aria-describedby'));
    expect(note.textContent).toBe(he.imagery.generated);
    for (const img of document.querySelectorAll('.target-tour-pick img')) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(Number(img.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(img.getAttribute('height'))).toBeGreaterThan(0);
    }
  });
  it('requests the tour photo at the width it is drawn in the taller card, not the card width', () => {
    const { container } = render(<RatingBar />);
    const sizes = container.querySelector('.target-tour-pick:not(.target-tour-pick--portrait) img').getAttribute('sizes');
    const [mobile, tablet, desktop] = sizes.split(',').map(part => parseFloat(part.trim().split(' ').pop()));
    // 16:9 cover in a 4/5 card: 545px tall on desktop → ≈969px wide; 6/5 mobile ≈ 1.48 × width; 2-up 4/5 tablet ≈ 1.11 × vw.
    expect(desktop).toBeGreaterThanOrEqual(969);
    expect(mobile).toBeGreaterThanOrEqual(148);
    expect(tablet).toBeGreaterThanOrEqual(111);
  });
});

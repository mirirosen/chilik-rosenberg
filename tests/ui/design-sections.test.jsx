import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import he from '../../src/locales/he.json';
import en from '../../src/locales/en.json';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key.split('.').reduce((value, part) => value?.[part], he) || key }) }));
import RatingBar from '../../src/components/RatingBar';
import TourInclusions from '../../src/components/TourInclusions';
import Lectures from '../../src/components/Lectures';
import Bio from '../../src/components/Bio';
import Menu from '../../src/components/Menu';
import Journey from '../../src/components/Journey';
afterEach(cleanup);
describe('verified design sections', () => {
  it('links both intro choices to real sections and keeps the booking CTA', () => {
    render(<><RatingBar /><div id="date-selection" /><Lectures /><Menu /></>);
    expect(screen.getByRole('link', { name: he.intro.tours }).getAttribute('href')).toBe('#date-selection');
    expect(screen.getByRole('link', { name: he.intro.lectures }).getAttribute('href')).toBe('#lectures');
    expect(screen.getByRole('link', { name: he.menu.nextTours }).getAttribute('href')).toBe('#date-selection');
    expect(screen.getByRole('link', { name: he.lectures.cta }).getAttribute('href')).toBe('https://wa.me/972506724312');
  });
  it('provides four inclusions, nine route stops and an identified real portrait', () => {
    const { container } = render(<><TourInclusions /><Journey /><Bio /></>);
    expect(container.querySelectorAll('.target-inclusions li')).toHaveLength(4);
    expect(container.querySelectorAll('.target-journey__grid li')).toHaveLength(9);
    expect(screen.getByAltText(he.header.title).getAttribute('src')).toContain('hilik-cutout-provided');
    expect(screen.getByRole('heading', { name: he.bio.title })).toBeTruthy();
  });
  it('keeps new design copy available in both languages', () => {
    for (const key of ['intro', 'inclusions', 'lectures']) {
      expect(Object.keys(he[key])).toEqual(Object.keys(en[key]));
      for (const value of Object.values(en[key])) expect(value).toBeTruthy();
    }
    expect(he.bio.paragraphs).toHaveLength(5);
    expect(en.bio.paragraphs).toHaveLength(5);
  });
});

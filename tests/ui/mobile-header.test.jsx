import React from 'react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';
import he from '../../src/locales/he.json';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key.split('.').reduce((v,k) => v?.[k], he) || key, i18n: { language: 'he', changeLanguage: vi.fn() } }) }));
import Header from '../../src/components/Header';
let breakpoint;
beforeEach(() => {
  breakpoint = null;
  vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: query.includes('reduced-motion'), addEventListener: (_, fn) => { breakpoint = fn; }, removeEventListener: vi.fn() })));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  document.body.style.overflow = '';
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('keeps a real upcoming-tours link available without opening the mobile menu', () => {
  const { container } = render(<Header />);
  const link = screen.getByRole('link', { name: he.header.upcomingTours });
  expect(link.getAttribute('href')).toBe('/#date-selection');
  expect(container.querySelector('dialog').hasAttribute('open')).toBe(false);
});
it('renders a translated short brand for phones, never the raw key (N5)', () => {
  const { container } = render(<Header />);
  const short = container.querySelector('.header-brand__short');
  expect(short.textContent).toBe(he.header.titleShort);
  expect(short.textContent).not.toBe('header.titleShort');
  expect(container.querySelector('.header-brand__full').textContent).toBe(he.header.title);
});
it('opens and cancels mobile navigation, restoring body scrolling', () => {
  render(<Header />); const trigger = screen.getByRole('button', { name: he.header.menuButton });
  fireEvent.click(trigger); expect(trigger.getAttribute('aria-expanded')).toBe('true');
  expect(document.body.style.overflow).toBe('hidden');
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
  expect(trigger.getAttribute('aria-expanded')).toBe('false'); expect(document.body.style.overflow).toBe('');
});
it('closes on section selection and respects reduced motion', () => {
  const { container } = render(<><Header /><section id="date-selection" /></>);
  const target = container.querySelector('#date-selection'); target.scrollIntoView = vi.fn();
  fireEvent.click(screen.getByRole('button', { name: he.header.menuButton }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('link', { name: he.header.dates }));
  expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto' });
  expect(document.body.style.overflow).toBe('');
});
it('closes the overlay when resizing into desktop navigation', () => {
  render(<Header />); fireEvent.click(screen.getByRole('button', { name: he.header.menuButton }));
  act(() => breakpoint({ matches: true }));
  expect(screen.getByRole('button', { name: he.header.menuButton }).getAttribute('aria-expanded')).toBe('false');
  expect(document.body.style.overflow).toBe('');
});

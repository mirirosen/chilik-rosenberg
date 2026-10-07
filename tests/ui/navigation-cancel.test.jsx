import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { gsap } from 'gsap';

// GSAP plan S3.5 (Codex implementation review, round 2): a pending arrival at the inquiry is cancelled by the
// visitor taking over, by any key except Enter/Space on the control that started it, by navigating elsewhere and by
// opening the menu. No pointer events here: keyboard paths must cancel on their own.
let pending;
vi.mock('../../src/navigation/arrival', () => ({
  waitForArrival: vi.fn((target, signal) => new Promise(resolve => {
    pending = resolve;
    signal?.addEventListener('abort', () => resolve('aborted'), { once: true });
  })),
  focusArrived: vi.fn(),
}));
const { focusArrived, waitForArrival } = await import('../../src/navigation/arrival');
const i18n = (await import('../../src/inquiry-i18n')).default;
const InquiryApp = (await import('../../src/InquiryApp')).default;

beforeEach(async () => {
  pending = null;
  vi.stubGlobal('matchMedia', query => ({ media: query, matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('requestIdleCallback', () => 0);
  vi.stubGlobal('cancelIdleCallback', () => {});
  Element.prototype.scrollIntoView = vi.fn();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  focusArrived.mockClear(); waitForArrival.mockClear();
  await i18n.changeLanguage('he');
});
afterEach(() => { cleanup(); gsap.globalTimeline.clear(); vi.unstubAllGlobals(); });

// Starts an arrival from the hero CTA with the keyboard focus on it (as Enter would).
async function start(container) {
  const cta = container.querySelector('[data-motion="hero-cta"]');
  cta.focus();
  await act(async () => { fireEvent.click(cta); });
  expect(waitForArrival).toHaveBeenCalledOnce();
  return cta;
}
// The arrival "completes" (if it was not cancelled, focus moves).
const arrive = () => act(async () => { pending?.('arrived'); await Promise.resolve(); });

describe('cancelling a pending arrival at the inquiry', () => {
  it('Enter on another control cancels; no focus is moved', async () => {
    const { container } = render(<InquiryApp />);
    await start(container);
    const other = container.querySelector('[aria-controls^="faq-answer-"]');
    fireEvent.keyDown(other, { key: 'Enter' });
    await arrive();
    expect(focusArrived).not.toHaveBeenCalled();
  });

  it.each(['Enter', ' '])('%j on the control that started it does not cancel', async key => {
    const { container } = render(<InquiryApp />);
    const cta = await start(container);
    fireEvent.keyDown(cta, { key });
    await arrive();
    expect(focusArrived).toHaveBeenCalledOnce();
  });

  it('Tab (moving on) cancels', async () => {
    const { container } = render(<InquiryApp />);
    const cta = await start(container);
    fireEvent.keyDown(cta, { key: 'Tab' });
    await arrive();
    expect(focusArrived).not.toHaveBeenCalled();
  });

  it('opening the menu cancels, even without any pointer or key event', async () => {
    const { container } = render(<InquiryApp />);
    await start(container);
    await act(async () => { fireEvent.click(container.querySelector('.mobile-menu-trigger')); });
    await arrive();
    expect(focusArrived).not.toHaveBeenCalled();
    expect(document.querySelector('dialog').hasAttribute('open')).toBe(true);
  });

  it('navigating to another section cancels, even without any pointer or key event', async () => {
    const { container } = render(<InquiryApp />);
    await start(container);
    const about = [...container.querySelectorAll('.nav-link')].find(a => a.getAttribute('href') === '/#about');
    await act(async () => { fireEvent.click(about, { button: 0 }); });
    await arrive();
    expect(focusArrived).not.toHaveBeenCalled();
  });

  it('control: an uninterrupted arrival moves focus once', async () => {
    const { container } = render(<InquiryApp />);
    await start(container);
    await arrive();
    expect(focusArrived).toHaveBeenCalledOnce();
  });
});

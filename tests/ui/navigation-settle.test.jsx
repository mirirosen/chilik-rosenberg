import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { gsap } from 'gsap';
import i18n from '../../src/inquiry-i18n';
import InquiryApp from '../../src/InquiryApp';

// GSAP plan S2: every site-controlled scroll settles its destination synchronously, so a notification that was
// already queued for a block inside it never starts an entrance after the scroll began.
let observers;
beforeEach(async () => {
  observers = [];
  vi.stubGlobal('fetch', vi.fn(() => { throw Error('no network'); }));
  vi.stubGlobal('matchMedia', query => ({
    media: query, matches: query.includes('no-preference') || query.includes('min-width: 1200px'),
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
  }));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() {} unobserve() {} disconnect() {}
  });
  vi.stubGlobal('requestIdleCallback', () => 0);
  vi.stubGlobal('cancelIdleCallback', () => {});
  Element.prototype.scrollIntoView = vi.fn();
  await i18n.changeLanguage('he');
});
afterEach(() => { cleanup(); gsap.globalTimeline.clear(); vi.unstubAllGlobals(); window.history.replaceState({}, '', '/'); });

const queuedReveal = target => observers.forEach(o => o.callback([{ target, isIntersecting: true, boundingClientRect: { top: window.innerHeight + 40 } }]));

describe('navigation settles its destination before scrolling', () => {
  it('header nav link: a queued notification inside the destination starts no entrance', () => {
    const { container } = render(<InquiryApp />);
    const block = container.querySelector('#about [data-motion="reveal"]');
    expect(block).toBeTruthy();
    const link = [...container.querySelectorAll('.nav-link')].find(a => a.getAttribute('href') === '/#about');
    fireEvent.click(link, { button: 0 });
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    queuedReveal(block);
    expect(gsap.getTweensOf(block)).toHaveLength(0);
    expect(block.getAttribute('style')).toBeNull();
  });

  it('hash navigation on load: the destination is settled before the jump', () => {
    window.history.replaceState({}, '', '/#journey');
    const { container } = render(<InquiryApp />);
    const block = container.querySelector('#journey [data-motion="reveal"]');
    expect(block).toBeTruthy();
    queuedReveal(block);
    expect(gsap.getTweensOf(block)).toHaveLength(0);
  });

  it('a block outside any navigation still gets its entrance (control)', () => {
    const { container } = render(<InquiryApp />);
    const block = container.querySelector('#menu [data-motion="reveal"]');
    queuedReveal(block);
    expect(gsap.getTweensOf(block)).toHaveLength(1);
    expect(screen.getAllByRole('heading').length).toBeGreaterThan(0);
  });
});

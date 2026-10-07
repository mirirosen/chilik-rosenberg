import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { gsap } from 'gsap';
import he from '../../src/locales/he.json';
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: key => key.split('.').reduce((v, k) => v?.[k], he) || key, i18n: { language: 'he', changeLanguage: vi.fn() } }) }));
import Header from '../../src/components/Header';

// GSAP plan S5 / gate 8.8–8.9: the mobile <dialog> menu enters from the inline-start edge in its own
// matchMedia, created right after showModal and reverted in the same effect; closing is never delayed.
let reduced, mqls;
class MQL extends EventTarget {
  constructor(media) { super(); this.media = media; }
  get matches() {
    if (this.media.includes('no-preference')) return !reduced;
    if (this.media.includes('reduce')) return reduced;
    return false; // min-width (desktop) and anything else
  }
  addListener(fn) { this.addEventListener('change', fn); }
  removeListener(fn) { this.removeEventListener('change', fn); }
}
const setReduced = value => act(() => {
  reduced = value;
  mqls.filter(m => m.media.includes('reduced-motion')).forEach(m => m.dispatchEvent(Object.assign(new Event('change'), { matches: m.matches, media: m.media })));
});

const content = () => document.querySelector('.mobile-navigation__content');
const tweens = el => gsap.getTweensOf(el);
const open = () => fireEvent.click(screen.getByRole('button', { name: he.header.menuButton }));
const close = () => fireEvent.click(document.querySelector('.mobile-navigation__close'));
const inline = () => [content(), ...content().children].map(el => el.getAttribute('style') || '').filter(Boolean);

beforeEach(() => {
  reduced = false; mqls = [];
  vi.stubGlobal('matchMedia', query => { const m = new MQL(query); mqls.push(m); return m; });
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  document.documentElement.dir = 'rtl';
});
afterEach(() => { cleanup(); gsap.globalTimeline.clear(); vi.unstubAllGlobals(); document.documentElement.dir = ''; });

describe('mobile menu motion (S5)', () => {
  it.each([['rtl', 16], ['ltr', -16]])('in %s the content enters from the inline-start edge (x %i → 0, opacity .6 → 1, .32s)', (dir, x) => {
    document.documentElement.dir = dir;
    render(<Header />);
    open();
    const [enter] = tweens(content());
    expect(enter.vars.x).toBe(x);
    expect(enter.vars.opacity).toBe(0.6);
    expect(enter.duration()).toBeCloseTo(0.32);
    // The links rise 6px with a .04s stagger; the close button is not part of the cascade.
    const items = [...content().children].filter(el => !el.classList.contains('mobile-navigation__close'));
    expect(items.length).toBeGreaterThan(3);
    const cascade = tweens(items[0])[0];
    expect(items.every(el => tweens(el)[0] === cascade)).toBe(true); // one staggered tween owns every item
    expect(cascade.vars.y).toBe(6);
    expect(cascade.vars.stagger).toBe(0.04);
    expect(tweens(document.querySelector('.mobile-navigation__close'))).toHaveLength(0);
  });

  it('runs no tween and leaves no inline style under reduced motion', () => {
    reduced = true;
    render(<Header />);
    open();
    expect(document.querySelector('dialog').hasAttribute('open')).toBe(true);
    expect(tweens(content())).toHaveLength(0);
    expect(inline()).toEqual([]);
  });

  it('closes at once, mid-entrance, and leaves nothing behind', () => {
    render(<Header />);
    open();
    expect(tweens(content())).toHaveLength(1);
    close();
    expect(document.querySelector('dialog').hasAttribute('open')).toBe(false);
    expect(tweens(content())).toHaveLength(0);
    expect(inline()).toEqual([]);
  });

  it('five fast open/close cycles: each opening reverts the previous, one live entrance at most', () => {
    render(<Header />);
    for (let i = 0; i < 5; i += 1) {
      open();
      expect(tweens(content())).toHaveLength(1);
      close();
      expect(tweens(content())).toHaveLength(0);
    }
    expect(inline()).toEqual([]);
    expect(gsap.globalTimeline.getChildren()).toHaveLength(0);
  });

  it('turning reduced motion on while the menu is open settles it at once and keeps the menu open', async () => {
    render(<Header />);
    open();
    expect(tweens(content())).toHaveLength(1);
    await setReduced(true);
    expect(tweens(content())).toHaveLength(0);
    expect(inline()).toEqual([]);
    expect(document.querySelector('dialog').hasAttribute('open')).toBe(true);
  });
});

import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { gsap } from 'gsap';
import i18n from '../../src/inquiry-i18n';
import InquiryApp from '../../src/InquiryApp';
import { installLedger } from './listener-ledger';

// GSAP plan §8.8 (cleanup): the whole site in StrictMode, with motion allowed and with reduced motion, the
// mobile menu opened and closed five times, the ambient loop started. After unmount every listener the
// application registered is removed and GSAP's global timeline is empty (checked before afterEach clears it).
let reduced, idleQueue, observers;
class MQL extends EventTarget {
  constructor(media) { super(); this.media = media; }
  get matches() {
    if (this.media.includes('prefers-reduced-motion: no-preference')) return !reduced;
    if (this.media.includes('prefers-reduced-motion: reduce')) return reduced;
    if (this.media.includes('hover: hover')) return !reduced;
    return false;
  }
  addListener(fn) { this.addEventListener('change', fn); }
  removeListener(fn) { this.removeEventListener('change', fn); }
}

let ledger;
beforeEach(async () => {
  idleQueue = []; observers = [];
  vi.stubGlobal('matchMedia', query => new MQL(query));
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb) { this.cb = cb; observers.push(this); }
    observe() {} unobserve() {} disconnect() {}
  });
  vi.stubGlobal('requestIdleCallback', cb => { idleQueue.push(cb); return idleQueue.length; });
  vi.stubGlobal('cancelIdleCallback', id => { idleQueue[id - 1] = () => {}; });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play() { this.dispatchEvent(new Event('playing')); return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause() { this.dispatchEvent(new Event('pause')); });
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  Element.prototype.scrollIntoView = function () {};
  try { sessionStorage.clear(); } catch { /* ignore */ }
  await i18n.changeLanguage('he');
});
afterEach(() => { ledger?.uninstall(); ledger = null; cleanup(); gsap.globalTimeline.clear(); vi.unstubAllGlobals(); });

describe.each([['no-preference', false], ['reduce', true]])('site cleanup under %s', (_, isReduced) => {
  it('StrictMode render, menu ×5, ambient start, unmount: no application listener and no tween survives', async () => {
    reduced = isReduced;
    ledger = installLedger();
    const view = render(<StrictMode><InquiryApp /></StrictMode>);
    await act(async () => { const queue = idleQueue; idleQueue = []; queue.forEach(cb => cb()); });
    const trigger = view.container.querySelector('.mobile-menu-trigger');
    for (let i = 0; i < 5; i += 1) {
      fireEvent.click(trigger);
      expect(view.container.ownerDocument.querySelector('dialog').hasAttribute('open')).toBe(true);
      fireEvent.click(view.container.ownerDocument.querySelector('.mobile-navigation__close'));
      expect(view.container.ownerDocument.querySelector('dialog').hasAttribute('open')).toBe(false);
    }
    // The ledger is not vacuous: it saw the application's own registrations.
    const types = new Set(ledger.tracked().map(r => r.type));
    expect(types).toContain('hashchange'); // InquiryApp
    expect(types).toContain('visibilitychange'); // the ambient loop
    expect(types).toContain('change'); // matchMedia listeners (menu breakpoint, motion contexts)
    if (!isReduced) expect(types).toContain('pointerdown'); // press feedback, only with motion allowed
    view.unmount();
    ledger.assertNoLeaks();
    expect(gsap.globalTimeline.getChildren()).toHaveLength(0);
  });
});

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { gsap } from 'gsap';
import i18n from '../../src/inquiry-i18n';
import Hero from '../../src/components/Hero';
import { BREATH, DEPTH } from '../../src/animations/figureLife';

// Chilik's figure: light inside the silhouette, breathing only while the scene plays, depth toward a fine pointer,
// nothing under reduced motion (also when it flips mid-session), no depth on touch, nothing left after unmount,
// nothing at all in the legacy shell (the same Hero rendered outside .target-site).
let reduced, fine, queries;
class MQL extends EventTarget {
  constructor(media) { super(); this.media = media; queries.push(this); }
  get matches() {
    if (this.media.includes('hover: hover')) return fine && !(reduced && this.media.includes('no-preference'));
    if (this.media.includes('prefers-reduced-motion: no-preference')) return !reduced;
    if (this.media.includes('prefers-reduced-motion: reduce')) return reduced;
    return false;
  }
  addListener(fn) { this.addEventListener('change', fn); }
  removeListener(fn) { this.removeEventListener('change', fn); }
}
beforeEach(async () => {
  reduced = false; fine = true; queries = [];
  vi.stubGlobal('matchMedia', query => new MQL(query));
  vi.stubGlobal('IntersectionObserver', class { observe() {} unobserve() {} disconnect() {} });
  vi.stubGlobal('requestIdleCallback', () => 0);
  vi.stubGlobal('cancelIdleCallback', () => {});
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play() { return Promise.resolve(); });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause() {});
  await i18n.changeLanguage('he');
});
afterEach(() => { cleanup(); gsap.globalTimeline.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

const body = c => c.querySelector('.target-hero__person-body');
const renderSite = () => render(<div className="target-site"><Hero /></div>);
const flip = () => act(() => { queries.forEach(q => q.dispatchEvent(new Event('change'))); });
const settleDepth = c => gsap.getTweensOf(body(c)).filter(t => t.vars.scaleY === undefined).forEach(t => t.progress(1));
const pointer = (target, clientX, pointerType = 'mouse') => {
  const event = new MouseEvent('pointermove', { clientX, clientY: 300, bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType }); // jsdom has no PointerEvent
  target.dispatchEvent(event);
};
const wide = hero => { hero.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 }); };
const breathOf = el => gsap.getTweensOf(el).find(t => t.vars.scaleY === BREATH.scaleY);
const playing = (c, on) => act(async () => { c.querySelector('video.target-hero__ambient').dispatchEvent(new Event(on ? 'playing' : 'pause')); });

describe("Chilik's figure", () => {
  it('lights him from inside the silhouette: a light layer masked by the cutout itself', () => {
    const { container } = renderSite();
    const img = container.querySelector('.target-hero__person');
    expect(body(container).contains(img)).toBe(true);
    expect(body(container).querySelector('.target-hero__person-light')).toBeTruthy();
    expect(body(container).style.getPropertyValue('--person-mask')).toBe(`url(${img.getAttribute('src')})`);
    expect(container.querySelector('.target-hero__person-frame').getAttribute('aria-hidden')).toBe('true');
  });

  it('breathes only while the scene is playing; the loop pausing stops it', async () => {
    const { container } = renderSite();
    const breath = breathOf(body(container));
    expect(breath).toBeTruthy();
    expect(breath.vars.repeat).toBe(-1);
    expect(breath.vars.transformOrigin).toBe('50% 100%');
    expect(breath.paused()).toBe(true); // not playing yet
    await playing(container, true);
    expect(breath.paused()).toBe(false);
    await playing(container, false);
    expect(breath.paused()).toBe(true);
  });

  it('turns toward a fine pointer, up to the set depth, and returns when it leaves', () => {
    const { container } = renderSite();
    const hero = container.querySelector('.target-hero');
    wide(hero);
    pointer(hero, 1000);
    settleDepth(container);
    expect(gsap.getProperty(body(container), 'rotationY')).toBeCloseTo(DEPTH.rotationY);
    expect(gsap.getProperty(body(container), 'x')).toBeCloseTo(DEPTH.x);
    hero.dispatchEvent(new MouseEvent('pointerleave'));
    settleDepth(container);
    expect(gsap.getProperty(body(container), 'rotationY')).toBeCloseTo(0);
    expect(gsap.getProperty(body(container), 'x')).toBeCloseTo(0);
  });

  it('no depth on touch screens (no fine pointer); breathing still follows the scene', () => {
    fine = false;
    const { container } = renderSite();
    const hero = container.querySelector('.target-hero');
    wide(hero);
    pointer(hero, 900);
    expect(gsap.getTweensOf(body(container)).filter(t => t.vars.rotationY !== undefined || t.vars.x !== undefined)).toHaveLength(0);
    expect(breathOf(body(container))).toBeTruthy();
  });

  it('nothing moves under reduced motion', async () => {
    reduced = true;
    const { container } = renderSite();
    await playing(container, true);
    container.querySelector('.target-hero').dispatchEvent(new MouseEvent('pointermove', { clientX: 900, clientY: 300, bubbles: true }));
    expect(gsap.getTweensOf(body(container))).toHaveLength(0);
    expect(body(container).style.transform).toBe('');
  });

  it('ignores touch input even when the primary pointer is fine (hybrid screens)', () => {
    const { container } = renderSite();
    const hero = container.querySelector('.target-hero');
    wide(hero);
    const depthTweens = () => gsap.getTweensOf(body(container)).filter(t => t.vars.scaleY === undefined);
    expect(depthTweens()).toHaveLength(2); // fine primary pointer: depth is armed
    pointer(hero, 1000, 'touch');
    expect(depthTweens().every(t => t.paused() && t.progress() === 0)).toBe(true); // never started by touch
    expect(gsap.getProperty(body(container), 'rotationY')).toBe(0);
    pointer(hero, 1000, 'pen');
    expect(depthTweens().some(t => !t.paused())).toBe(true);
    settleDepth(container);
    expect(gsap.getProperty(body(container), 'rotationY')).toBeCloseTo(DEPTH.rotationY);
  });

  it('reduced motion turned on mid-session restores the figure exactly, with both motions in flight', async () => {
    const { container, unmount } = renderSite();
    const el = body(container);
    const hero = container.querySelector('.target-hero');
    wide(hero);
    await playing(container, true);
    breathOf(el).progress(0.5);
    pointer(hero, 1000);
    settleDepth(container);
    expect(el.style.transform).not.toBe('');
    reduced = true; flip();
    expect(gsap.getTweensOf(el)).toHaveLength(0);
    expect(el.style.transform).toBe('');
    pointer(hero, 0);
    expect(gsap.getTweensOf(el)).toHaveLength(0);
    reduced = false; flip(); // motion allowed again: breathing comes back (still following the scene), depth too
    expect(breathOf(el)).toBeTruthy();
    pointer(hero, 1000);
    settleDepth(container);
    expect(gsap.getProperty(el, 'rotationY')).toBeCloseTo(DEPTH.rotationY);
    unmount();
    expect(gsap.getTweensOf(el)).toHaveLength(0);
    expect(el.style.transform).toBe('');
  });

  it('the legacy shell (no .target-site) gets no figure motion and no pointer listeners', async () => {
    // Spy where the method lives: spying on a subclass prototype leaves an own property behind for later files.
    const added = vi.spyOn(EventTarget.prototype, 'addEventListener');
    const { container } = render(<Hero />);
    const hero = container.querySelector('.target-hero');
    wide(hero);
    await playing(container, true);
    pointer(hero, 1000);
    expect(gsap.getTweensOf(body(container))).toHaveLength(0);
    expect(body(container).style.transform).toBe('');
    // React's own root listeners are on the container; the figure would listen on the hero itself
    const onHero = added.mock.calls.filter(([type], i) => added.mock.contexts[i] === hero && (type === 'pointermove' || type === 'pointerleave'));
    expect(onHero).toHaveLength(0);
  });

  it('leaves no tween and no inline transform after unmount', async () => {
    const view = renderSite();
    const el = body(view.container);
    await playing(view.container, true);
    view.unmount();
    expect(gsap.getTweensOf(el)).toHaveLength(0);
    expect(el.style.transform).toBe('');
  });
});

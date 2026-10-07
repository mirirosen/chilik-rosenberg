import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { gsap } from 'gsap';
import i18n from '../../src/inquiry-i18n';
import Hero from '../../src/components/Hero';
import { BREATH, DEPTH } from '../../src/animations/figureLife';

// Chilik's figure: light inside the silhouette, breathing only while the scene plays, depth toward a fine pointer,
// nothing under reduced motion, no depth on touch, nothing left after unmount.
let reduced, fine;
class MQL extends EventTarget {
  constructor(media) { super(); this.media = media; }
  get matches() {
    if (this.media.includes('hover: hover')) return !reduced && fine;
    if (this.media.includes('prefers-reduced-motion: no-preference')) return !reduced;
    if (this.media.includes('prefers-reduced-motion: reduce')) return reduced;
    return false;
  }
  addListener(fn) { this.addEventListener('change', fn); }
  removeListener(fn) { this.removeEventListener('change', fn); }
}
beforeEach(async () => {
  reduced = false; fine = true;
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
const breathOf = el => gsap.getTweensOf(el).find(t => t.vars.scaleY === BREATH.scaleY);
const playing = (c, on) => act(async () => { c.querySelector('video.target-hero__ambient').dispatchEvent(new Event(on ? 'playing' : 'pause')); });

describe("Chilik's figure", () => {
  it('lights him from inside the silhouette: a light layer masked by the cutout itself', () => {
    const { container } = render(<Hero />);
    const img = container.querySelector('.target-hero__person');
    expect(body(container).contains(img)).toBe(true);
    expect(body(container).querySelector('.target-hero__person-light')).toBeTruthy();
    expect(body(container).style.getPropertyValue('--person-mask')).toBe(`url(${img.getAttribute('src')})`);
    expect(container.querySelector('.target-hero__person-frame').getAttribute('aria-hidden')).toBe('true');
  });

  it('breathes only while the scene is playing; the loop pausing stops it', async () => {
    const { container } = render(<Hero />);
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
    const { container } = render(<Hero />);
    const hero = container.querySelector('.target-hero');
    hero.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 });
    hero.dispatchEvent(new MouseEvent('pointermove', { clientX: 1000, clientY: 300, bubbles: true }));
    const settleDepth = () => gsap.getTweensOf(body(container)).filter(t => t.vars.scaleY === undefined).forEach(t => t.progress(1));
    settleDepth();
    expect(gsap.getProperty(body(container), 'rotationY')).toBeCloseTo(DEPTH.rotationY);
    expect(gsap.getProperty(body(container), 'x')).toBeCloseTo(DEPTH.x);
    hero.dispatchEvent(new MouseEvent('pointerleave'));
    settleDepth();
    expect(gsap.getProperty(body(container), 'rotationY')).toBeCloseTo(0);
    expect(gsap.getProperty(body(container), 'x')).toBeCloseTo(0);
  });

  it('no depth on touch screens (no fine pointer); breathing still follows the scene', () => {
    fine = false;
    const { container } = render(<Hero />);
    const hero = container.querySelector('.target-hero');
    hero.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 700, right: 1000, bottom: 700 });
    hero.dispatchEvent(new MouseEvent('pointermove', { clientX: 900, clientY: 300, bubbles: true }));
    expect(gsap.getTweensOf(body(container)).filter(t => t.vars.rotationY !== undefined || t.vars.x !== undefined)).toHaveLength(0);
    expect(breathOf(body(container))).toBeTruthy();
  });

  it('nothing moves under reduced motion', async () => {
    reduced = true;
    const { container } = render(<Hero />);
    await playing(container, true);
    container.querySelector('.target-hero').dispatchEvent(new MouseEvent('pointermove', { clientX: 900, clientY: 300, bubbles: true }));
    expect(gsap.getTweensOf(body(container))).toHaveLength(0);
    expect(body(container).style.transform).toBe('');
  });

  it('leaves no tween and no inline transform after unmount', async () => {
    const view = render(<Hero />);
    const el = body(view.container);
    await playing(view.container, true);
    view.unmount();
    expect(gsap.getTweensOf(el)).toHaveLength(0);
    expect(el.style.transform).toBe('');
  });
});

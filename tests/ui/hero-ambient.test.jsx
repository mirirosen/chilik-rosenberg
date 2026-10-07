import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../src/inquiry-i18n';
import Hero from '../../src/components/Hero';

// Plan §18 / §18.1 (S7): the hero's silent Bnei Brak loop. The poster <img> remains; the video gets a source only
// when motion is allowed and data is not being saved, after load + idle; a visible command button pauses/plays it.
let reduced, saveData, reducedData, idleQueue, reduceListeners, observers, playImpl, plays;

const flushIdle = () => act(() => { const queue = idleQueue; idleQueue = []; queue.forEach(cb => cb()); });
const setReduced = value => act(() => { reduced = value; reduceListeners.forEach(fn => fn({ matches: value })); });
const intersect = ratio => act(() => { observers.forEach(cb => cb([{ intersectionRatio: ratio }])); });
const setHidden = hidden => act(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
});
const video = container => container.querySelector('video.target-hero__ambient');
const button = name => screen.getByRole('button', { name: i18n.t(name) });

beforeEach(async () => {
  reduced = false; saveData = false; reducedData = false; idleQueue = []; reduceListeners = []; observers = []; plays = 0;
  playImpl = function play() { plays += 1; this.dispatchEvent(new Event('playing')); return Promise.resolve(); };
  vi.stubGlobal('matchMedia', query => ({
    media: query,
    get matches() {
      if (query.includes('prefers-reduced-motion: no-preference')) return !reduced;
      if (query.includes('prefers-reduced-motion: reduce')) return reduced;
      if (query.includes('prefers-reduced-data')) return reducedData;
      return false;
    },
    addListener() {}, removeListener() {},
    addEventListener(type, fn) { if (query.includes('prefers-reduced-motion: reduce')) reduceListeners.push(fn); },
    removeEventListener() {},
  }));
  Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData }) });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  vi.stubGlobal('IntersectionObserver', class { constructor(cb) { observers.push(cb); } observe() {} disconnect() { observers = observers.filter(o => o !== this.cb); } unobserve() {} });
  vi.stubGlobal('requestIdleCallback', cb => { idleQueue.push(cb); return idleQueue.length; });
  vi.stubGlobal('cancelIdleCallback', id => { idleQueue[id - 1] = () => {}; });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function play() { return playImpl.call(this); });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function pause() { this.dispatchEvent(new Event('pause')); });
  vi.spyOn(HTMLMediaElement.prototype, 'canPlayType').mockReturnValue('probably');
  try { sessionStorage.clear(); } catch { /* ignore */ }
  await i18n.changeLanguage('he');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('hero ambient loop', () => {
  it('keeps the poster image, sets no source before idle, then plays the muted loop once', async () => {
    const { container } = render(<Hero />);
    const poster = container.querySelector('img.target-hero__food');
    expect(poster.getAttribute('src')).toBe('/media/hero/bnei-brak-ambient-poster.webp');
    expect(poster.getAttribute('fetchpriority')).toBe('high');
    expect(container.querySelector('.target-hero__image-note')).toBeNull();
    expect(video(container).getAttribute('src')).toBeNull();
    await flushIdle();
    expect(video(container).muted).toBe(true);
    expect(video(container).getAttribute('src')).toBe('/media/hero/bnei-brak-ambient.webm');
    expect(plays).toBe(1);
    expect(container.querySelector('.target-hero__visual').className).toContain('is-ambient-playing');
    // Command-button pattern: the name says what pressing does; no aria-pressed; the button is outside aria-hidden.
    const control = button('hero.ambientPause');
    expect(control.hasAttribute('aria-pressed')).toBe(false);
    expect(control.closest('[aria-hidden="true"]')).toBeNull();
  });

  it.each([
    ['reduced motion', () => { reduced = true; }],
    ['save-data', () => { saveData = true; }],
    ['prefers-reduced-data', () => { reducedData = true; }],
  ])('never sets a source under %s, and plays only on an explicit press', async (_, setup) => {
    setup();
    await i18n.changeLanguage('en');
    const { container } = render(<Hero />);
    await flushIdle();
    expect(video(container).getAttribute('src')).toBeNull();
    expect(plays).toBe(0);
    const control = button('hero.ambientPlay');
    control.focus();
    await act(async () => { fireEvent.click(control); });
    expect(video(container).getAttribute('src')).not.toBeNull();
    expect(plays).toBe(1);
    expect(document.activeElement).toBe(button('hero.ambientPause')); // same element keeps focus, new name
  });

  it('cancels a pending start on StrictMode replay and on unmount: one source, one play, none after disposal', async () => {
    const strict = render(<StrictMode><Hero /></StrictMode>);
    await flushIdle();
    expect(plays).toBe(1);
    strict.unmount();
    const late = render(<Hero />);
    const lateVideo = video(late.container);
    late.unmount();
    await flushIdle();
    expect(lateVideo.getAttribute('src')).toBeNull();
    expect(plays).toBe(1);
    expect(() => lateVideo.dispatchEvent(new Event('playing'))).not.toThrow(); // delayed event after disposal is ignored
  });

  it('re-checks eligibility when the idle start fires', async () => {
    const { container } = render(<Hero />);
    reduced = true; // preference changed before the idle callback ran
    await flushIdle();
    expect(video(container).getAttribute('src')).toBeNull();
    expect(plays).toBe(0);
    expect(button('hero.ambientPlay')).toBeTruthy();
  });

  it('keeps the poster and the Play control when autoplay is refused, and ignores stale results', async () => {
    let rejectFirst;
    playImpl = function play() { plays += 1; return new Promise((_, reject) => { rejectFirst = reject; }); };
    const { container } = render(<Hero />);
    await flushIdle();
    await act(async () => { rejectFirst(new DOMException('blocked', 'NotAllowedError')); });
    expect(video(container).className).not.toContain('is-playing');
    expect(button('hero.ambientPlay')).toBeTruthy();
    // A newer explicit attempt succeeds; a late rejection of the older attempt must not undo it.
    const stale = rejectFirst;
    playImpl = function play() { plays += 1; this.dispatchEvent(new Event('playing')); return Promise.resolve(); };
    await act(async () => { fireEvent.click(button('hero.ambientPlay')); });
    await act(async () => { stale(new DOMException('late', 'AbortError')); });
    expect(button('hero.ambientPause')).toBeTruthy();
  });

  it('stops for reduced motion and never restarts by itself; only Play clears the stop', async () => {
    const { container } = render(<Hero />);
    await flushIdle();
    expect(plays).toBe(1);
    await setReduced(true);
    expect(button('hero.ambientPlay')).toBeTruthy();
    await setReduced(false);
    await intersect(0); await intersect(1);
    await setHidden(true); await setHidden(false);
    expect(plays).toBe(1);
    await act(async () => { fireEvent.click(button('hero.ambientPlay')); });
    expect(plays).toBe(2);
    expect(video(container).className).toContain('is-playing');
  });

  it('suspends off screen and in a hidden tab, then resumes only if it was playing', async () => {
    render(<Hero />);
    await flushIdle();
    await intersect(0);
    expect(button('hero.ambientPlay')).toBeTruthy();
    await intersect(1);
    expect(plays).toBe(2);
    await setHidden(true);
    await setHidden(false);
    expect(plays).toBe(3);
    await act(async () => { fireEvent.click(button('hero.ambientPause')); });
    await intersect(0); await intersect(1);
    await setHidden(true); await setHidden(false);
    expect(plays).toBe(3); // user pause is never overridden
  });

  it('remembers a user pause for the session across a remount', async () => {
    const first = render(<Hero />);
    await flushIdle();
    await act(async () => { fireEvent.click(button('hero.ambientPause')); });
    first.unmount();
    plays = 0;
    const second = render(<Hero />);
    await flushIdle();
    expect(plays).toBe(0);
    expect(video(second.container).getAttribute('src')).toBeNull();
    expect(button('hero.ambientPlay')).toBeTruthy();
  });
});

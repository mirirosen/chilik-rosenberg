import React, { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../src/inquiry-i18n';
import Hero, { CHAPTERS, chapterAt } from '../../src/components/Hero';

// Plan §18 / §18.1 (S7): the hero's silent Bnei Brak loop. The poster <img> remains; the video gets a source only
// when motion is allowed and data is not being saved, after load + idle; a visible command button pauses/plays it.
let reduced, saveData, reducedData, phone, idleQueue, reduceListeners, observers, playImpl, plays;

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
  reduced = false; saveData = false; reducedData = false; phone = false; idleQueue = []; reduceListeners = []; observers = []; plays = 0;
  playImpl = function play() { plays += 1; this.dispatchEvent(new Event('playing')); return Promise.resolve(); };
  vi.stubGlobal('matchMedia', query => ({
    media: query,
    get matches() {
      if (query.includes('prefers-reduced-motion: no-preference')) return !reduced;
      if (query.includes('prefers-reduced-motion: reduce')) return reduced;
      if (query.includes('prefers-reduced-data')) return reducedData;
      if (query.includes('max-width: 767px')) return phone;
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
    expect(poster.getAttribute('src')).toBe('/media/hero/bnei-brak-sequence-poster.webp');
    expect(poster.getAttribute('fetchpriority')).toBe('high');
    expect(container.querySelector('.target-hero__image-note')).toBeNull();
    expect(video(container).getAttribute('src')).toBeNull();
    await flushIdle();
    expect(video(container).muted).toBe(true);
    expect(video(container).getAttribute('src')).toBe('/media/hero/bnei-brak-sequence.webm');
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

  it('keeps the poster and the Play control when autoplay is refused', async () => {
    let reject;
    playImpl = function play() { plays += 1; return new Promise((_, r) => { reject = r; }); };
    const { container } = render(<Hero />);
    await flushIdle();
    await act(async () => { reject(new DOMException('blocked', 'NotAllowedError')); });
    expect(video(container).className).not.toContain('is-playing');
    expect(button('hero.ambientPlay')).toBeTruthy();
  });

  it('ignores a late rejection of an older attempt after a newer attempt succeeded', async () => {
    let rejectA;
    // Attempt A (autoplay) stays pending; a pending start already counts as on.
    playImpl = function play() { plays += 1; return new Promise((_, r) => { rejectA = r; }); };
    render(<Hero />);
    await flushIdle();
    await act(async () => { fireEvent.click(button('hero.ambientPause')); });
    // Attempt B (explicit Play) succeeds while A is still pending.
    playImpl = function play() { plays += 1; this.dispatchEvent(new Event('playing')); return Promise.resolve(); };
    await act(async () => { fireEvent.click(button('hero.ambientPlay')); });
    expect(button('hero.ambientPause')).toBeTruthy();
    // Now A rejects: it is stale and must not flip the state back.
    await act(async () => { rejectA(new DOMException('late', 'AbortError')); });
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
    const { container } = render(<Hero />);
    await flushIdle();
    await intersect(0);
    // Suspended, not stopped: the frames fade out, but the control still offers Pause (the loop is on).
    expect(video(container).className).not.toContain('is-playing');
    expect(button('hero.ambientPause')).toBeTruthy();
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

  it('treats a pending or stalled start as on: the control offers Pause, and Pause really stops it', async () => {
    // A start that never renders a frame (slow network, no media pipeline): play() stays pending, no 'playing'.
    playImpl = function play() { plays += 1; return new Promise(() => {}); };
    const { container } = render(<Hero />);
    await flushIdle();
    expect(plays).toBe(1);
    expect(video(container).className).not.toContain('is-playing'); // the poster stays visible
    const control = button('hero.ambientPause');
    control.focus();
    await act(async () => { fireEvent.click(control); });
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(document.activeElement).toBe(button('hero.ambientPlay'));
    expect(sessionStorage.getItem('chilik.ambientPaused')).toBe('1');
    await intersect(0); await intersect(1);
    await setHidden(true); await setHidden(false);
    expect(plays).toBe(1); // pressing Pause on a stalled start is a real stop, never a second play()
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

  it('phones load the 4:5 phone encode and show the phone poster; desktops the 16:9 ones (board 7)', async () => {
    phone = true;
    const first = render(<Hero />);
    expect(first.container.querySelector('picture source[media="(max-width: 767px)"]').getAttribute('srcset')).toBe('/media/hero/bnei-brak-sequence-phone-poster.webp');
    await flushIdle();
    expect(video(first.container).getAttribute('src')).toBe('/media/hero/bnei-brak-sequence-phone.webm');
    first.unmount();
    phone = false;
    const second = render(<Hero />);
    await flushIdle();
    expect(video(second.container).getAttribute('src')).toBe('/media/hero/bnei-brak-sequence.webm');
    expect(video(second.container).hasAttribute('poster')).toBe(false); // the <picture> is the only poster download
  });

  it('chapter bars: hidden while the loop is off, five while on, the active one follows the video clock', async () => {
    reduced = true; // no autoplay: off
    const { container } = render(<Hero />);
    await flushIdle();
    expect(container.querySelector('.target-hero__chapters')).toBeNull();
    await act(async () => { fireEvent.click(button('hero.ambientPlay')); });
    const bars = container.querySelectorAll('.target-hero__chapters li');
    expect([...bars].map(li => li.textContent)).toEqual(CHAPTERS.map(([id]) => i18n.t(`hero.chapters.${id}`)));
    expect(container.querySelector('.target-hero__chapters').getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.target-hero__chapters li.is-active').textContent).toBe(i18n.t('hero.chapters.food'));
    const v = video(container);
    Object.defineProperty(v, 'currentTime', { configurable: true, get: () => 6.5 });
    await act(async () => { v.dispatchEvent(new Event('timeupdate')); });
    expect(container.querySelector('.target-hero__chapters li.is-active').textContent).toBe(i18n.t('hero.chapters.people'));
  });

  it('chapterAt maps the loop clock to chapters at their boundaries', () => {
    expect(CHAPTERS.map(([, start]) => chapterAt(start))).toEqual([0, 1, 2, 3, 4]);
    expect(chapterAt(CHAPTERS[1][1] - 0.01)).toBe(0);
    expect(chapterAt(99)).toBe(4);
  });
});

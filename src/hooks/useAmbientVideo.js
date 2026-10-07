import { useCallback, useEffect, useRef, useState } from 'react';

// The hero's silent Bnei Brak loop (plan §18, S7). Autoplay only when the visitor allows motion and is not
// saving data; until then no video source is set, so nothing is downloaded. The base <img> poster stays the
// page's LCP element; the video fades in over it once it is actually playing.
//
// Why the loop stops, kept apart (plan §18.1):
//   - 'user'        — the visitor pressed Pause. Remembered for the session. Only Play clears it.
//   - 'preference'  — reduced motion turned on while playing. Only Play clears it; turning motion back on,
//                     scrolling back or returning to the tab never restarts the loop by itself.
//   - suspension    — off screen or tab hidden. Not a stop: the loop resumes when visible again,
//                     but only if it was playing (or about to) and no stop applies.
//
// Two states, kept apart: `on` is the intent (started and not stopped; a pending or stalled start counts) and
// drives the control's name; `playing` is the media actually rendering frames and drives the fade over the
// poster. A stalled network therefore offers Pause, and Pause really stops the attempt.
const PAUSE_KEY = 'chilik.ambientPaused';
const readUserPaused = () => { try { return sessionStorage.getItem(PAUSE_KEY) === '1'; } catch { return false; } };
const writeUserPaused = paused => {
  try { if (paused) sessionStorage.setItem(PAUSE_KEY, '1'); else sessionStorage.removeItem(PAUSE_KEY); } catch { /* storage unavailable */ }
};

export function canAutoplayAmbient() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  const motionAllowed = window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
  const reducedData = window.matchMedia('(prefers-reduced-data: reduce)').matches;
  const saveData = Boolean(typeof navigator !== 'undefined' && navigator.connection && navigator.connection.saveData);
  return motionAllowed && !reducedData && !saveData;
}

// Phones get their own 4:5 encode (each shot cropped around its subject); the choice is made once, when loading.
export const PHONE_QUERY = '(max-width: 767px)';

// The automatic start waits until the poster has been painted as a largest-contentful-paint candidate, so the
// video (the same box) can never take its place as the LCP element (lcp.cjs found that in 1 of 22 runs). Browsers
// without the LCP entry type start as before; a 3 s fallback covers a poster that is never reported.
export const POSTER_PAINT_FALLBACK_MS = 3000;

export function useAmbientVideo({ webm, mp4, phoneWebm, phoneMp4, posterRef }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [on, setOn] = useState(false);
  const stop = useRef(readUserPaused() ? 'user' : null); // 'user' | 'preference' | null
  const wantsPlay = useRef(false); // true once the loop was started (auto or by Play) and not stopped since
  const loaded = useRef(false);
  const inView = useRef(true);
  const disposed = useRef(false);
  const attempt = useRef(0);

  const load = useCallback(() => {
    const video = ref.current;
    if (!video || loaded.current || disposed.current) return false;
    video.muted = true; // property, required for autoplay; React does not reliably reflect the attribute
    const phone = Boolean(phoneWebm && phoneMp4 && window.matchMedia?.(PHONE_QUERY).matches);
    const vp9 = video.canPlayType('video/webm; codecs="vp9"');
    video.src = phone ? (vp9 ? phoneWebm : phoneMp4) : (vp9 ? webm : mp4);
    loaded.current = true;
    return true;
  }, [webm, mp4, phoneWebm, phoneMp4]);

  const play = useCallback(() => {
    const video = ref.current;
    if (!video || disposed.current) return;
    load();
    const id = ++attempt.current;
    setOn(true);
    const refused = () => { wantsPlay.current = false; setOn(false); setPlaying(false); };
    let result;
    try { result = video.play(); } catch { refused(); return; }
    if (result && typeof result.then === 'function') {
      // Autoplay policy, unsupported media or an interrupting pause can reject: keep the poster and the Play
      // control. A result from an older attempt, or after unmount, is ignored.
      result.then(() => {}, () => { if (!disposed.current && id === attempt.current) refused(); });
    }
  }, [load]);

  const pause = useCallback(() => {
    attempt.current += 1; // any in-flight play() result is now stale
    if (loaded.current) ref.current?.pause();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return undefined;
    disposed.current = false;
    const controller = new AbortController();
    const { signal } = controller;
    const resumable = () => wantsPlay.current && stop.current === null && inView.current && !document.hidden && canAutoplayAmbient();
    video.addEventListener('playing', () => { if (!disposed.current) setPlaying(true); }, { signal });
    video.addEventListener('pause', () => { if (!disposed.current) setPlaying(false); }, { signal });

    let idleId = null, timer = null, lcpObserver = null, paintTimer = null;
    const eligible = () => !disposed.current && stop.current === null && !document.hidden && inView.current && canAutoplayAmbient();
    const afterPosterPaint = go => {
      const poster = posterRef?.current;
      const types = (typeof PerformanceObserver === 'function' && PerformanceObserver.supportedEntryTypes) || [];
      if (!poster || !types.includes('largest-contentful-paint')) { go(); return; }
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        lcpObserver?.disconnect(); lcpObserver = null;
        if (paintTimer !== null) { window.clearTimeout(paintTimer); paintTimer = null; }
        go();
      };
      lcpObserver = new PerformanceObserver(list => { if (list.getEntries().some(entry => entry.element === poster)) finish(); });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      paintTimer = window.setTimeout(finish, POSTER_PAINT_FALLBACK_MS);
    };
    const start = () => {
      idleId = null; timer = null;
      if (!eligible()) return;
      afterPosterPaint(() => {
        if (!eligible() || wantsPlay.current) return; // re-checked meanwhile; a visitor's Play already started it
        wantsPlay.current = true;
        play();
      });
    };
    const schedule = () => {
      if (disposed.current) return;
      if (typeof window.requestIdleCallback === 'function') idleId = window.requestIdleCallback(start, { timeout: 2500 });
      else timer = window.setTimeout(start, 1500);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true, signal });

    let observer = null;
    if (typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(([entry]) => {
        inView.current = entry.intersectionRatio >= 0.1;
        if (!inView.current) pause();
        else if (loaded.current && resumable()) play();
      }, { threshold: [0, 0.1] });
      observer.observe(video);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pause();
      else if (loaded.current && resumable()) play();
    }, { signal });
    const reduce = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if (reduce && typeof reduce.addEventListener === 'function') {
      reduce.addEventListener('change', event => {
        if (!event.matches) return; // motion allowed again: no automatic restart
        stop.current = stop.current ?? 'preference';
        wantsPlay.current = false;
        setOn(false);
        pause();
      }, { signal });
    }

    return () => {
      disposed.current = true;
      controller.abort();
      observer?.disconnect();
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleId);
      if (timer !== null) window.clearTimeout(timer);
      lcpObserver?.disconnect();
      if (paintTimer !== null) window.clearTimeout(paintTimer);
      attempt.current += 1;
      if (loaded.current) video.pause();
    };
  }, [play, pause, posterRef]);

  const toggle = useCallback(() => {
    if (on) {
      stop.current = 'user'; wantsPlay.current = false; writeUserPaused(true);
      setOn(false);
      pause();
    } else {
      stop.current = null; wantsPlay.current = true; writeUserPaused(false);
      play();
    }
  }, [on, play, pause]);

  return { ref, on, playing, toggle };
}

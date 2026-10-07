// Arrival at the inquiry heading (GSAP plan S3, §3.4, Codex GO in round 8).
// Focus moves only after a verified arrival. Three outcomes: 'arrived' | 'aborted' | 'failed'.

export const GAP = 16; // the heading's scroll-margin-top is var(--header-height) + 16px

// DOM measurements, injectable for tests.
export const domMeasure = {
  scrollY: () => window.scrollY,
  innerHeight: () => window.innerHeight,
  maxScroll: () => document.documentElement.scrollHeight - window.innerHeight,
  marginTop: el => parseFloat(getComputedStyle(el).scrollMarginTop) || 0,
  rect: el => el.getBoundingClientRect(),
  headerBottom: () => document.querySelector('.main-header')?.getBoundingClientRect().bottom ?? 0,
  // Text bounds of the heading's first rendered line: the union of the text fragments on that line.
  lineRects: el => { const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()]; },
};

export function desiredScrollY(target, measure = domMeasure) {
  const desired = measure.scrollY() + measure.rect(target).top - measure.marginTop(target);
  return Math.min(Math.max(desired, 0), Math.max(measure.maxScroll(), 0));
}

export function firstLine(target, measure = domMeasure) {
  const rects = measure.lineRects(target).filter(r => r.width > 0 && r.height > 0);
  if (!rects.length) return null; // empty geometry: never substitute the whole heading
  const first = rects.reduce((a, r) => (r.top < a.top ? r : a));
  const same = rects.filter(r => Math.abs(r.top - first.top) < first.height / 2);
  const top = Math.min(...same.map(r => r.top)), bottom = Math.max(...same.map(r => r.bottom));
  return { top, bottom, height: bottom - top };
}

// Arrived = at the clamped destination (±2px) AND the first line fully inside the unobscured area
// (below the fixed header, above the viewport bottom), with room for the alignment gap and the line.
export function atDestination(target, measure = domMeasure) {
  const line = firstLine(target, measure);
  if (!line) return false;
  const top = measure.headerBottom(), bottom = measure.innerHeight();
  const room = bottom - top;
  const floorOk = room >= Math.max(40, GAP + line.height);
  const visible = floorOk && line.top >= top - 1 && line.bottom <= bottom + 1;
  return Math.abs(measure.scrollY() - desiredScrollY(target, measure)) <= 2 && visible;
}

// Truly instant scroll, even with `scroll-behavior: smooth` on the root (index.css): the root's inline
// declaration (value and priority) is overridden for one call and restored exactly, also on failure.
export function forceInstant(desired, scrollTo = (top) => window.scrollTo({ top, behavior: 'instant' })) {
  const root = document.documentElement;
  const value = root.style.getPropertyValue('scroll-behavior');
  const priority = root.style.getPropertyPriority('scroll-behavior');
  try {
    root.style.setProperty('scroll-behavior', 'auto', 'important');
    scrollTo(desired);
    return 'ok';
  } catch {
    return 'failed';
  } finally {
    if (value) root.style.setProperty('scroll-behavior', value, priority);
    else root.style.removeProperty('scroll-behavior');
  }
}

// Resolves once with 'arrived' | 'aborted' | 'failed'. Signals (scrollend, rAF sampling) only trigger a
// geometry check. A stall of >= stallMs away from the destination, or the capMs cap, completes the scroll
// instantly and verifies it on the next frame (re-applied at most once). Every timer, frame and listener is released.
export function waitForArrival(target, signal, {
  measure = domMeasure, stallMs = 500, capMs = 3000,
  raf = cb => window.requestAnimationFrame(cb), caf = id => window.cancelAnimationFrame(id),
  now = () => performance.now(), scrollTo,
} = {}) {
  return new Promise(resolve => {
    if (signal?.aborted) { resolve('aborted'); return; }
    let done = false, frame = 0, lastY = measure.scrollY(), stableSince = null;
    const startedAt = now();
    const finish = result => {
      if (done) return;
      done = true;
      if (frame) caf(frame);
      window.removeEventListener('scrollend', onScrollEnd);
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => finish('aborted');
    const arrived = () => { if (atDestination(target, measure)) { finish('arrived'); return true; } return false; };
    let completing = false;
    const onScrollEnd = () => { if (!done && !completing) arrived(); };
    // The instant completion is verified on the next frame, never only synchronously: Chromium applies one more
    // frame of an interrupted smooth scroll after the instant one (observed: +47..58px, then still). If the
    // destination moved, the completion is re-applied once and verified on the following frame.
    const complete = () => {
      completing = true;
      let retried = false;
      const apply = () => forceInstant(desiredScrollY(target, measure), scrollTo) !== 'failed';
      const verify = () => {
        frame = 0;
        if (done) return;
        if (atDestination(target, measure)) { finish('arrived'); return; }
        if (retried) { finish('failed'); return; }
        retried = true;
        if (!apply()) { finish('failed'); return; }
        frame = raf(verify);
      };
      if (!apply()) { finish('failed'); return; }
      frame = raf(verify);
    };
    const tick = timestamp => {
      frame = 0;
      if (done) return;
      if (stableSince === null) stableSince = timestamp; // initialised from the first frame's timestamp
      const y = measure.scrollY();
      if (y !== lastY) { lastY = y; stableSince = timestamp; }
      if (arrived()) return;
      if (now() - startedAt >= capMs || timestamp - stableSince >= stallMs) { complete(); return; }
      frame = raf(tick);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    window.addEventListener('scrollend', onScrollEnd);
    frame = raf(tick);
  });
}

// Focus after a verified arrival. When the visitor has pinch-zoomed, a plain focus() lets the browser bring
// the heading into the visual viewport; otherwise the layout is already in place and scrolling is prevented.
export function focusArrived(heading) {
  const zoomed = (window.visualViewport?.scale ?? 1) > 1.01;
  if (zoomed) heading.focus(); else heading.focus({ preventScroll: true });
}

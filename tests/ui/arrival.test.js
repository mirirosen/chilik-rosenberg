import { afterEach, describe, expect, it, vi } from 'vitest';
import { atDestination, focusArrived, forceInstant, waitForArrival } from '../../src/navigation/arrival';

// Deterministic geometry and frames for the arrival contract (GSAP plan §3.4, §8.8).
// Document coordinates: the heading's first line starts at `docTop` and is `lineH` tall; the fixed header ends at
// 72px; the heading's scroll-margin-top is 72 + 16 = 88px, so a correct arrival puts the line at 88px.
function world({ y = 0, docTop = 2000, lineH = 24, innerHeight = 800, maxScroll = 5000, headerBottom = 72 } = {}) {
  const state = { y, docTop, lineH, innerHeight, maxScroll, headerBottom };
  const measure = {
    scrollY: () => state.y,
    innerHeight: () => state.innerHeight,
    maxScroll: () => state.maxScroll,
    marginTop: () => state.headerBottom + 16,
    rect: () => ({ top: state.docTop - state.y }),
    headerBottom: () => state.headerBottom,
    lineRects: () => [{ top: state.docTop - state.y, bottom: state.docTop - state.y + state.lineH, width: 200, height: state.lineH }],
  };
  const desired = () => Math.min(Math.max(state.docTop - (state.headerBottom + 16), 0), state.maxScroll);
  return { state, measure, desired };
}

// A manual frame clock at a given refresh rate.
function clock(hz) {
  const queue = new Map(); let id = 0, t = 0;
  const raf = cb => { id += 1; queue.set(id, cb); return id; };
  const caf = handle => { queue.delete(handle); };
  const step = () => { t += 1000 / hz; const callbacks = [...queue.values()]; queue.clear(); callbacks.forEach(cb => cb(t)); };
  return { raf, caf, now: () => t, step, pending: () => queue.size, time: () => t };
}

async function drive(promise, c, { maxMs = 6000, onFrame = () => {} } = {}) {
  let result; promise.then(r => { result = r; });
  while (result === undefined && c.time() < maxMs) { onFrame(c.time()); c.step(); await Promise.resolve(); }
  await Promise.resolve();
  return result;
}

afterEach(() => { vi.restoreAllMocks(); document.documentElement.removeAttribute('style'); });

describe.each([30, 60, 120])('waitForArrival at %iHz', hz => {
  it('(a) a scroll that starts late does not count as arrived before the destination', async () => {
    const w = world(); const c = clock(hz); const target = {};
    const scrollTo = vi.fn(top => { w.state.y = top; });
    const p = waitForArrival(target, undefined, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo });
    let arrivedAt = null;
    const result = await drive(p, c, { onFrame: t => {
      if (t >= 200 && w.state.y < w.desired()) w.state.y = Math.min(w.desired(), w.state.y + (w.desired() / 600) * (1000 / hz));
      if (arrivedAt === null && Math.abs(w.state.y - w.desired()) <= 2) arrivedAt = t; // the contract's ±2px
    } });
    expect(result).toBe('arrived');
    expect(scrollTo).not.toHaveBeenCalled();
    expect(c.time()).toBeGreaterThanOrEqual(arrivedAt);
    expect(c.pending()).toBe(0);
  });

  it('(b) a 300ms pause mid-scroll neither completes the scroll nor arrives', async () => {
    const w = world(); const c = clock(hz); const target = {};
    const scrollTo = vi.fn(top => { w.state.y = top; });
    const p = waitForArrival(target, undefined, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo });
    const result = await drive(p, c, { onFrame: t => {
      const moving = t < 300 || t >= 600;
      if (moving && w.state.y < w.desired()) w.state.y = Math.min(w.desired(), w.state.y + 40);
    } });
    expect(result).toBe('arrived');
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('(c) a stall of 500ms or more away from the destination completes instantly, then arrives', async () => {
    const w = world(); const c = clock(hz); const target = {};
    const scrollTo = vi.fn(top => { w.state.y = top; });
    const p = waitForArrival(target, undefined, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo });
    const result = await drive(p, c, { onFrame: t => { if (t < 100) w.state.y += 50; } });
    expect(result).toBe('arrived');
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo.mock.calls[0][0]).toBe(w.desired());
    expect(c.time()).toBeGreaterThanOrEqual(100 + 500);
    expect(c.time()).toBeLessThan(100 + 500 + 2 * (1000 / hz) + 1);
  });

  it('(d) a scroll still moving after 3000ms is completed at the cap', async () => {
    const w = world({ docTop: 200000, maxScroll: 400000 }); const c = clock(hz); const target = {};
    const scrollTo = vi.fn(top => { w.state.y = top; });
    const p = waitForArrival(target, undefined, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo });
    const result = await drive(p, c, { onFrame: () => { w.state.y += 5; } });
    expect(result).toBe('arrived');
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(c.time()).toBeGreaterThanOrEqual(3000);
  });

  it("(e) 'failed' when the instant completion cannot reach a stable destination", async () => {
    const w = world(); const c = clock(hz); const target = {};
    const scrollTo = vi.fn(top => { w.state.y = top; w.state.docTop += 300; }); // a layout shift moves the heading
    const p = waitForArrival(target, undefined, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo });
    const result = await drive(p, c);
    expect(result).toBe('failed');
    expect(c.pending()).toBe(0);
  });

  it("(f) a visitor's wheel aborts: no completion and 'aborted'", async () => {
    const w = world(); const c = clock(hz); const target = {};
    const controller = new AbortController();
    const scrollTo = vi.fn();
    const p = waitForArrival(target, controller.signal, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo });
    const result = await drive(p, c, { onFrame: t => { if (t >= 200) controller.abort(); } });
    expect(result).toBe('aborted');
    expect(scrollTo).not.toHaveBeenCalled();
    expect(c.pending()).toBe(0);
  });
});

describe('atDestination geometry', () => {
  it('(g) a target near the bottom arrives when the scroll is clamped at the end', () => {
    const w = world({ docTop: 5300, maxScroll: 5000, y: 5000 });
    expect(atDestination({}, w.measure)).toBe(true); // line at 300px: below the header, inside the viewport
  });
  it('(h) a target above the viewport is not arrived until the scroll is completed', () => {
    const w = world({ docTop: 2000, y: 3000 }); // line at -1000px
    expect(atDestination({}, w.measure)).toBe(false);
    w.state.y = w.desired();
    expect(atDestination({}, w.measure)).toBe(true);
  });
  it('enforces the floor: room for the 16px gap plus the first line (24px line: 39px fails, 40px passes)', () => {
    const tight = world({ innerHeight: 72 + 39 }); tight.state.y = tight.desired();
    expect(atDestination({}, tight.measure)).toBe(false);
    const enough = world({ innerHeight: 72 + 40 }); enough.state.y = enough.desired();
    expect(atDestination({}, enough.measure)).toBe(true);
  });
  it('floor with a 30px line: 45px of room fails, 46px passes (line 88–118 ≤ 118)', () => {
    const tight = world({ lineH: 30, innerHeight: 72 + 45 }); tight.state.y = tight.desired();
    expect(atDestination({}, tight.measure)).toBe(false);
    const enough = world({ lineH: 30, innerHeight: 72 + 46 }); enough.state.y = enough.desired();
    expect(atDestination({}, enough.measure)).toBe(true);
  });
  it('(i) a heading taller than the viewport (900px in 600px) arrives by its first line', () => {
    const w = world({ innerHeight: 600 });
    // 30 lines of 30px; only the first one has to be in the unobscured area.
    w.measure.lineRects = () => Array.from({ length: 30 }, (_, i) => ({ top: w.state.docTop - w.state.y + i * 30, bottom: w.state.docTop - w.state.y + i * 30 + 24, width: 300, height: 24 }));
    w.state.y = w.desired();
    expect(atDestination({}, w.measure)).toBe(true);
  });
  it('(j) a low viewport (390×200, 72px header) arrives: 128px of room ≥ 40', () => {
    const w = world({ innerHeight: 200 }); w.state.y = w.desired();
    expect(atDestination({}, w.measure)).toBe(true);
  });
  it('(k) a first line at 40px overlapping the 72px header is not arrived', () => {
    const w = world(); w.state.y = w.state.docTop - 40;
    expect(atDestination({}, w.measure)).toBe(false);
  });
  it('(l) pinch zoom (scale 2, offsetTop 300): arrival is judged on the layout viewport, focus lets the browser bring the heading in', () => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { scale: 2, offsetTop: 300, height: 400 } });
    const w = world(); w.state.y = w.desired();
    expect(atDestination({}, w.measure)).toBe(true);
    const heading = { focus: vi.fn() };
    focusArrived(heading);
    expect(heading.focus).toHaveBeenCalledWith();
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { scale: 1, offsetTop: 0, height: 800 } });
    focusArrived(heading);
    expect(heading.focus).toHaveBeenLastCalledWith({ preventScroll: true });
  });
  it('rejects a first line hidden under the fixed header and empty geometry', () => {
    const w = world(); w.state.y = w.desired() + 60; // line at 28px, under the 72px header
    expect(atDestination({}, w.measure)).toBe(false);
    const empty = world(); empty.measure.lineRects = () => [];
    expect(atDestination({}, empty.measure)).toBe(false);
  });
});

// The geometry examples through the whole waitForArrival loop, at every refresh rate: already at the
// destination → 'arrived' on the first frame, without an instant completion; above the viewport → completed
// instantly, then 'arrived'. Every frame is released.
describe.each([30, 60, 120])('geometry examples through waitForArrival at %iHz', hz => {
  const tall = w => { w.measure.lineRects = () => Array.from({ length: 30 }, (_, i) => ({ top: w.state.docTop - w.state.y + i * 30, bottom: w.state.docTop - w.state.y + i * 30 + 24, width: 300, height: 24 })); return w; };
  it.each([
    ['(g) clamped at the bottom', () => world({ docTop: 5300, maxScroll: 5000, y: 5000 }), false],
    ['(h) above the viewport', () => world({ docTop: 2000, y: 3000 }), true],
    ['(i) taller than the viewport', () => { const w = tall(world({ innerHeight: 600 })); w.state.y = w.desired(); return w; }, false],
    ['(j) low viewport', () => { const w = world({ innerHeight: 200 }); w.state.y = w.desired(); return w; }, false],
  ])('%s', async (_, make, completes) => {
    const w = make(); const c = clock(hz);
    const scrollTo = vi.fn(top => { w.state.y = top; });
    const result = await drive(waitForArrival({}, undefined, { measure: w.measure, raf: c.raf, caf: c.caf, now: c.now, scrollTo }), c);
    expect(result).toBe('arrived');
    expect(scrollTo).toHaveBeenCalledTimes(completes ? 1 : 0);
    expect(c.pending()).toBe(0);
  });
});

describe('focus and instant scroll', () => {
  it.each([[1, true], [1.01, true], [1.02, false]])('at visual scale %s preventScroll is %s', (scale, prevent) => {
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: { scale } });
    const heading = { focus: vi.fn() };
    focusArrived(heading);
    if (prevent) expect(heading.focus).toHaveBeenCalledWith({ preventScroll: true });
    else expect(heading.focus).toHaveBeenCalledWith();
  });
  it('restores an existing !important root declaration exactly, also when the scroll call throws', () => {
    const root = document.documentElement;
    root.style.setProperty('scroll-behavior', 'smooth', 'important');
    expect(forceInstant(100, () => {})).toBe('ok');
    expect(root.style.getPropertyValue('scroll-behavior')).toBe('smooth');
    expect(root.style.getPropertyPriority('scroll-behavior')).toBe('important');
    expect(forceInstant(100, () => { throw new Error('nope'); })).toBe('failed');
    expect(root.style.getPropertyValue('scroll-behavior')).toBe('smooth');
    root.style.removeProperty('scroll-behavior');
    forceInstant(100, () => {});
    expect(root.style.getPropertyValue('scroll-behavior')).toBe('');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';

// GSAP lag smoothing is set explicitly to its default (500 ms, 33 ms) when the motion module loads. Turning it off
// (7788d94) made entrances created after the ticker had slept jump to their end; the browser gate g8 "idle" measures
// that an entrance after idle animates, and g8 "stall" that a stall delays it by at most the stall.
afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('lag smoothing', () => {
  it('is GSAP\'s default (500, 33), never off', async () => {
    vi.resetModules();
    const { gsap } = await import('gsap');
    const spy = vi.spyOn(gsap.ticker, 'lagSmoothing');
    const motion = await import('../../src/animations/homeMotion');
    expect(motion.LAG_SMOOTHING).toEqual([500, 33]);
    expect(spy).toHaveBeenCalledWith(500, 33);
    expect(spy).not.toHaveBeenCalledWith(0);
  });
});

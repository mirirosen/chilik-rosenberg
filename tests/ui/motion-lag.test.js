import { afterEach, describe, expect, it, vi } from 'vitest';

// Entrances end on time after frame stalls: the motion module turns GSAP's lag smoothing off when it loads
// (Codex implementation review, round 2). GSAP captures Date.now at load, so the effect itself is measured in the
// browser (g8 "stall": a real 1.2s main-thread stall in the middle of the hero entrance).
afterEach(() => { vi.restoreAllMocks(); vi.resetModules(); });

describe('lag smoothing', () => {
  it('is switched off when the motion module loads', async () => {
    vi.resetModules();
    const { gsap } = await import('gsap');
    const spy = vi.spyOn(gsap.ticker, 'lagSmoothing');
    const motion = await import('../../src/animations/homeMotion');
    expect(motion.LAG_SMOOTHING).toBe(0);
    expect(spy).toHaveBeenCalledWith(0);
  });
});

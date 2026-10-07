import { afterEach, describe, expect, it } from 'vitest';
import { defaultIsAppFrame, installLedger, isEnvironmentFrame } from './listener-ledger';
import { cleanOnce, leak, throwingOnce, twice, withSignal } from './fixtures/src/leaky';

// Controls for the ledger itself (GSAP plan §8.8). The fixture stands in for application code.
const fixtureFrame = frame => frame.includes('/fixtures/src/');
let ledger;
afterEach(() => { ledger?.uninstall(); ledger = null; });

describe('listener ledger controls', () => {
  it('must fail: a listener registered without cleanup is reported as exactly one leak', () => {
    ledger = installLedger({ isAppFrame: fixtureFrame });
    leak(new EventTarget());
    expect(ledger.leaks()).toHaveLength(1);
    expect(() => ledger.assertNoLeaks()).toThrow(/^1 leak:/);
  });

  it('a once callback that re-registers itself: the old generation is gone, the new one is live and then removed', () => {
    ledger = installLedger({ isAppFrame: fixtureFrame });
    const target = new EventTarget();
    let calls = 0;
    const cleanup = cleanOnce(target, () => { calls += 1; });
    target.dispatchEvent(new Event('ping'));
    expect(calls).toBe(1);
    expect(ledger.records.filter(r => r.type === 'ping').map(r => r.active)).toEqual([false, true]);
    cleanup();
    expect(ledger.leaks()).toHaveLength(0);
    target.dispatchEvent(new Event('ping'));
    expect(calls).toBe(1); // really removed from the DOM, not only in the ledger
  });

  it('a once callback that throws is already removed when it throws', () => {
    ledger = installLedger({ isAppFrame: fixtureFrame });
    const target = new EventTarget();
    throwingOnce(target);
    const swallow = event => { event.preventDefault?.(); };
    globalThis.addEventListener?.('error', swallow);
    try { target.dispatchEvent(new Event('boom')); } catch { /* jsdom may rethrow */ }
    globalThis.removeEventListener?.('error', swallow);
    expect(ledger.leaks()).toHaveLength(0);
  });

  it('an already-aborted signal registers nothing; aborting later removes the registration', () => {
    ledger = installLedger({ isAppFrame: fixtureFrame });
    const target = new EventTarget();
    withSignal(target, AbortSignal.abort());
    expect(ledger.records.filter(r => r.type === 'resize')).toHaveLength(0);
    const controller = new AbortController();
    withSignal(target, controller.signal);
    expect(ledger.leaks()).toHaveLength(1);
    controller.abort();
    expect(ledger.leaks()).toHaveLength(0);
  });

  it('adding the same key twice is one registration, removed by one removal (DOM semantics)', () => {
    ledger = installLedger({ isAppFrame: fixtureFrame });
    const cleanup = twice(new EventTarget(), () => {});
    expect(ledger.records.filter(r => r.type === 'focus')).toHaveLength(1);
    cleanup();
    expect(ledger.leaks()).toHaveLength(0);
  });

  it('a late removal of an old generation does not remove a newer registration with the same key', () => {
    ledger = installLedger({ isAppFrame: () => true });
    const target = new EventTarget();
    const handler = () => {};
    target.addEventListener('x', handler, { once: true });
    target.dispatchEvent(new Event('x')); // generation 1 consumed
    target.addEventListener('x', handler); // generation 2
    target.removeEventListener('x', handler); // removes generation 2 only (generation 1 is already inactive)
    expect(ledger.leaks()).toHaveLength(0);
    target.addEventListener('x', handler); // generation 3 stays
    expect(ledger.leaks().map(r => r.generation)).toEqual([3]);
  });

  it('default scope: src frames count; node_modules and tests do not', () => {
    expect(defaultIsAppFrame('at x (C:/site/src/hooks/useAmbientVideo.js:72:11)')).toBe(true);
    expect(defaultIsAppFrame('at y (C:/site/node_modules/gsap/src/gsap-core.js:1:1)')).toBe(false);
    expect(defaultIsAppFrame('at z (C:/site/tests/ui/fixtures/src/leaky.js:2:1)')).toBe(false);
    expect(isEnvironmentFrame('at C:/site/node_modules/nwsapi/src/nwsapi.js:2198:11')).toBe(true);
    expect(isEnvironmentFrame('at f (C:/site/node_modules/gsap/gsap-core.js:3933:21)')).toBe(false);
  });
});

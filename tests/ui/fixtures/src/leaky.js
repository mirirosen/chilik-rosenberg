// Ledger control fixture (GSAP plan §8.8): stands in for application code under a src/ path.
export function leak(target) { target.addEventListener('scroll', () => {}); }
export function cleanOnce(target, onCall) {
  const handler = () => { onCall(); target.addEventListener('ping', handler, { once: true }); };
  target.addEventListener('ping', handler, { once: true });
  return () => target.removeEventListener('ping', handler);
}
export function throwingOnce(target) { target.addEventListener('boom', () => { throw new Error('boom'); }, { once: true }); }
export function withSignal(target, signal) { target.addEventListener('resize', () => {}, { signal }); }
export function twice(target, handler) { target.addEventListener('focus', handler); target.addEventListener('focus', handler); return () => target.removeEventListener('focus', handler); }

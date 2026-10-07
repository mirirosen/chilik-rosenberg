import { gsap } from 'gsap';

// A gsap.context that exists only while a media query matches: created when it starts matching, reverted
// (including the setup's returned cleanup) when it stops matching or when this object is reverted.
// Same semantics as gsap.matchMedia().add(), which we do not use: its add() registers a 'change' listener on a
// new MediaQueryList every time and kill()/revert() never remove it (gsap-core MatchMedia.add / kill), so every
// menu opening would leave one listener behind (found by the listener ledger, GSAP plan §8.8).
export function mediaContext(query, setup, scope) {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return { revert() {} };
  const mql = window.matchMedia(query);
  let context = null;
  const sync = () => {
    if (mql.matches && !context) context = gsap.context(self => setup(self), scope);
    else if (!mql.matches && context) { context.revert(); context = null; }
  };
  const subscribe = typeof mql.addEventListener === 'function';
  if (subscribe) mql.addEventListener('change', sync); else mql.addListener?.(sync);
  sync();
  return {
    revert() {
      if (subscribe) mql.removeEventListener('change', sync); else mql.removeListener?.(sync);
      context?.revert();
      context = null;
    },
  };
}

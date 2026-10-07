import { gsap } from 'gsap';
import { mediaContext } from './mediaContext';

// Chilik's figure in the hero (follow-up to board 7, Miri's request: "more depth and life, but realistic").
// Two quiet motions on the figure's body wrapper (the frame keeps its own entrance; one owner per property):
// - breathing: an almost imperceptible rise (scaleY 1.008 from the visible base) that runs only while the scene's
//   video is actually playing, so the loop's Pause, an off-screen hero or a hidden tab stop it too (WCAG 2.2.2);
// - depth: with a fine pointer, the figure turns up to 2.5° and shifts 6 px toward the pointer; touch input is ignored
//   even on hybrids whose primary pointer is fine.
// Contact-only shell only (the legacy shell renders the same Hero without .target-site). Nothing at all under reduced
// motion; no depth on touch screens.
// Both motions live in ONE context: they share the element's transform, and two contexts would each snapshot the
// other's in-flight values and restore them in the wrong order (a stale scale left behind after a runtime flip).
const motionQuery = '(prefers-reduced-motion: no-preference)';
const fineQuery = '(hover: hover) and (pointer: fine)';

export const BREATH = { scaleY: 1.008, scaleX: 1.003, duration: 2.6 };
export const DEPTH = { x: 6, rotationY: 2.5 }; // the 3D perspective (900px) is on the frame, in CSS

const noop = { setPlaying() {}, revert() {} };

export function setupFigureLife(body, hero) {
  if (!body || !hero || !hero.closest('.target-site')) return noop;
  let breath = null;
  let playing = false;
  const motion = mediaContext(motionQuery, context => {
    breath = gsap.to(body, { scaleY: BREATH.scaleY, scaleX: BREATH.scaleX, transformOrigin: '50% 100%', duration: BREATH.duration, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: !playing });
    let depth = null; // { toX, toTurn }, created on the first fine-pointer match, inside this context
    const move = event => {
      if (event.pointerType === 'touch') return;
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !Number.isFinite(event.clientX)) return;
      const across = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      depth.toX(across * DEPTH.x);
      depth.toTurn(across * DEPTH.rotationY);
    };
    const leave = () => { depth.toX(0); depth.toTurn(0); };
    const fine = window.matchMedia(fineQuery);
    let listening = false;
    const sync = () => {
      if (fine.matches && !listening) {
        if (!depth) context.add(() => {
          depth = {
            toX: gsap.quickTo(body, 'x', { duration: 0.7, ease: 'power3.out' }),
            toTurn: gsap.quickTo(body, 'rotationY', { duration: 0.7, ease: 'power3.out' }),
          };
        });
        hero.addEventListener('pointermove', move);
        hero.addEventListener('pointerleave', leave);
        listening = true;
      } else if (!fine.matches && listening) {
        hero.removeEventListener('pointermove', move);
        hero.removeEventListener('pointerleave', leave);
        listening = false;
        leave();
      }
    };
    const subscribe = typeof fine.addEventListener === 'function';
    if (subscribe) fine.addEventListener('change', sync); else fine.addListener?.(sync);
    sync();
    return () => {
      if (subscribe) fine.removeEventListener('change', sync); else fine.removeListener?.(sync);
      hero.removeEventListener('pointermove', move);
      hero.removeEventListener('pointerleave', leave);
      breath = null;
    };
  });
  return {
    setPlaying(on) {
      playing = on;
      if (!breath) return;
      if (on) breath.play(); else breath.pause();
    },
    revert() { motion.revert(); },
  };
}

import { gsap } from 'gsap';
import { mediaContext } from './mediaContext';

// Chilik's figure in the hero (follow-up to board 7, Miri's request: "more depth and life, but realistic").
// Two quiet motions on the figure's body wrapper (the frame keeps its own entrance; one owner per property):
// - breathing: an almost imperceptible rise (scaleY 1.008 from the feet) that runs only while the scene's video is
//   actually playing, so the loop's Pause, an off-screen hero or a hidden tab stop it too (WCAG 2.2.2);
// - depth: with a fine pointer, the figure turns up to 2.5° and shifts 6 px toward the pointer.
// Nothing at all under reduced motion; no depth on touch screens.
const motionQuery = '(prefers-reduced-motion: no-preference)';
const fineQuery = `${motionQuery} and (hover: hover) and (pointer: fine)`;

export const BREATH = { scaleY: 1.008, scaleX: 1.003, duration: 2.6 };
export const DEPTH = { x: 6, rotationY: 2.5 }; // the 3D perspective (900px) is on the frame, in CSS

export function setupFigureLife(body, hero) {
  if (!body || !hero) return { setPlaying() {}, revert() {} };
  let breath = null;
  let playing = false;
  const motion = mediaContext(motionQuery, () => {
    breath = gsap.to(body, { scaleY: BREATH.scaleY, scaleX: BREATH.scaleX, transformOrigin: '50% 100%', duration: BREATH.duration, ease: 'sine.inOut', yoyo: true, repeat: -1, paused: !playing });
    return () => { breath = null; };
  });
  const depth = mediaContext(fineQuery, () => {
    const toX = gsap.quickTo(body, 'x', { duration: 0.7, ease: 'power3.out' });
    const toTurn = gsap.quickTo(body, 'rotationY', { duration: 0.7, ease: 'power3.out' });
    const move = event => {
      const rect = hero.getBoundingClientRect();
      if (!rect.width || !Number.isFinite(event.clientX)) return;
      const across = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
      toX(across * DEPTH.x);
      toTurn(across * DEPTH.rotationY);
    };
    const leave = () => { toX(0); toTurn(0); };
    hero.addEventListener('pointermove', move);
    hero.addEventListener('pointerleave', leave);
    return () => { hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave); };
  });
  return {
    setPlaying(on) {
      playing = on;
      if (!breath) return;
      if (on) breath.play(); else breath.pause();
    },
    revert() { depth.revert(); motion.revert(); },
  };
}

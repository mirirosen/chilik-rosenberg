import { gsap } from 'gsap';
import { DIST, DUR, EASE, STAGGER } from './tokens';
import { isSettled, registerEntrance, resetRegistry, setMotionActive, settle, settleAll } from './registry';
import { mediaContext } from './mediaContext';

const motionQuery = '(prefers-reduced-motion: no-preference)';
// The observer starts a reveal up to this far below the viewport (S2); a bfcache restore settles the same zone.
const REVEAL_AHEAD = 160;

// Entrances end on time even when frames stall. GSAP's default lag smoothing (500ms, 33ms) treats a long gap
// between frames as 33ms, so a busy main thread stretches every running entrance by the length of each stall
// (observed: WebKit at 5–19 fps left the hero mid-entrance for over 6s). With it off, a tween after a stall
// renders where wall-clock time says it is, so content is natural by its nominal end (Codex review, round 2).
export const LAG_SMOOTHING = 0;
gsap.ticker.lagSmoothing(LAG_SMOOTHING);
const hoverQuery = `${motionQuery} and (hover: hover) and (pointer: fine)`;
const actionSelector = '.target-hero .target-button, .target-menu__cta, .target-lectures .target-button';

function setupPressMotion(root) {
  const cleanups = [], releases = [];
  root.querySelectorAll(actionSelector).forEach(button => {
    // Reuse one press tween on mouse, touch and keyboard. Native activation,
    // focus outlines and scrolling are untouched; no event is prevented.
    const tween = gsap.to(button, { scale: 0.985, duration: 0.12, ease: 'power2.out', paused: true });
    const release = () => tween.reverse();
    const isActivationKey = event => event.key === 'Enter' || (event.key === ' ' && button.tagName === 'BUTTON');
    const handlers = {
      pointerdown: event => { if (event.button === 0 && event.isPrimary !== false) tween.play(); },
      keydown: event => { if (!event.repeat && isActivationKey(event)) tween.play(); },
      keyup: event => { if (isActivationKey(event)) release(); },
      blur: release,
    };
    Object.entries(handlers).forEach(([event, handler]) => button.addEventListener(event, handler));
    releases.push(release);
    cleanups.push(() => Object.entries(handlers).forEach(([event, handler]) => button.removeEventListener(event, handler)));
  });
  const releaseAll = () => releases.forEach(release => release());
  // Releasing outside the original button or canceling a touch gesture must
  // restore the button too. One shared listener set, independent of CTA count.
  document.addEventListener('pointerup', releaseAll, { passive: true });
  document.addEventListener('pointercancel', releaseAll, { passive: true });
  window.addEventListener('blur', releaseAll);
  return () => {
    cleanups.forEach(cleanup => cleanup());
    document.removeEventListener('pointerup', releaseAll);
    document.removeEventListener('pointercancel', releaseAll);
    window.removeEventListener('blur', releaseAll);
  };
}

// S1 (hero). Content settles within 1.0s; the ambient layer (photo settle, CTA sheen) ends by 1.7s.
// Text lines and the figure move with transform only, so whichever element is the LCP is never hidden;
// the CTA fades in with opacity only, so its transform stays owned by press/hover (one owner per property).
function heroScene(root) {
  const lines = [...root.querySelectorAll('[data-motion="hero-line"]')];
  const cta = root.querySelector('[data-motion="hero-cta"]');
  const figure = root.querySelector('[data-motion="hero-figure"]');
  const food = root.querySelector('[data-motion="hero-food"]');
  if (!lines.length && !cta && !figure && !food) return () => {};
  const phone = window.matchMedia('(max-width: 767px)').matches;
  // One tween per element with an absolute delay (not a shared timeline), so settling one element never
  // kills or strands the others (Codex implementation review, round 1).
  const enter = (element, vars, props) => registerEntrance(element, gsap.from(element, { ease: EASE.soft, ...vars }), props);
  if (food && window.matchMedia('(min-width: 1200px)').matches) {
    enter(food, { scale: 1.04, duration: 1.6, delay: 0, ease: EASE.settle, clearProps: 'transform' }, 'transform');
  }
  lines.forEach(line => {
    const title = line.tagName === 'H1', eyebrow = line.classList.contains('target-eyebrow');
    const y = title ? DIST.l : eyebrow ? DIST.s : DIST.m;
    const delay = title ? 0.12 : eyebrow ? 0.05 : 0.22;
    enter(line, { y, duration: title ? DUR.l : 0.6, delay, clearProps: 'transform' }, 'transform');
  });
  if (figure) enter(figure, { y: phone ? DIST.m : DIST.l, duration: 0.9, delay: 0.1, clearProps: 'transform' }, 'transform');
  if (cta) {
    enter(cta, { opacity: 0.6, duration: DUR.m, delay: 0.35, clearProps: 'opacity' }, 'opacity');
    // One slow sheen across the CTA (index.css: ::after driven by --sheen-x; resting outside the button).
    registerEntrance(cta, gsap.fromTo(cta, { '--sheen-x': '-120%' }, { '--sheen-x': '120%', duration: 0.9, delay: 0.75, ease: 'power1.inOut', clearProps: '--sheen-x' }), '--sheen-x');
  }
  return () => {};
}

// S2/S4 (reveals). Nothing is hidden in advance. The observer fires up to 160px before a block enters the
// viewport; on a target's first notification, a block that is already in view (initial render, restored
// scroll, history navigation) is recorded without animation; blocks a navigation settled are skipped even
// if their notification was already queued.
function revealScene(root, context) {
  if (typeof IntersectionObserver !== 'function') return () => {};
  let active = true;
  const notified = new WeakSet();
  const observer = new IntersectionObserver((entries) => {
    if (!active) return; // Ignore queued notifications after route/preference cleanup.
    const reveal = [];
    for (const entry of entries) {
      const target = entry.target;
      if (isSettled(target)) { observer.unobserve(target); continue; }
      const first = !notified.has(target);
      notified.add(target);
      if (!entry.isIntersecting) continue; // keep observing
      observer.unobserve(target);
      const top = entry.boundingClientRect ? entry.boundingClientRect.top : Infinity;
      if (first && top < window.innerHeight) { settle(target); continue; } // already visible: recorded, no entrance
      reveal.push(target);
    }
    if (!reveal.length) return;
    // Observer callbacks run later: explicitly capture their tweens for revert().
    context.add(() => {
      const groups = new Map();
      reveal.forEach(target => groups.set(target.parentElement, [...(groups.get(target.parentElement) ?? []), target]));
      groups.forEach((group, parent) => {
        // S2/S4: a visible but quiet rise. Section headings settle slower; cards stagger per grid (cap .24s).
        // One tween per element (delay instead of a shared stagger), so settling one card never strands another.
        // Document order, whatever order the observer reported; a group can ask for the base step (S3 channels).
        group.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
        const step = parent?.dataset?.motionStagger === 'base' ? STAGGER.base : STAGGER.tight;
        group.forEach((target, index) => {
          const heading = target.classList.contains('target-section-heading');
          registerEntrance(target, gsap.from(target, {
            y: DIST.m, opacity: 0.85, duration: heading ? DUR.l : DUR.m,
            delay: Math.min(0.24, index * step),
            ease: heading ? EASE.settle : EASE.out, clearProps: 'transform,opacity',
          }), 'transform,opacity');
        });
      });
    });
  }, { threshold: 0.12, rootMargin: `0px 0px ${REVEAL_AHEAD}px 0px` });
  root.querySelectorAll('[data-motion="reveal"]').forEach(target => observer.observe(target));
  return () => { active = false; observer.disconnect(); };
}

// S3: one soft ring around the inquiry WhatsApp button after a deliberate arrival. Only exists while the
// no-preference context is active; otherwise requestArrival() does nothing (focus still moves).
let arrivalRing = null;
export function requestArrival(element) { if (element && arrivalRing) arrivalRing(element); }

// Progressive enhancement: nothing is hidden in CSS, entrances only use explicit data-motion targets,
// and no scroll interception or booking UI selectors.
export function setupHomeMotion(root) {
  if (!root || typeof window.matchMedia !== 'function') return () => {};
  const motion = mediaContext(motionQuery, (context) => {
    const controller = new AbortController();
    setMotionActive(true);
    const cleanups = [setupPressMotion(root), heroScene(root), revealScene(root, context)];
    // Back/forward cache: restore entrances to their natural state; press/hover tweens stay alive. Blocks in view at
    // restore (or within the observer's look-ahead below it) are recorded as settled too, so an observer notification queued before the page was frozen (delivered
    // after pageshow) cannot start a new entrance on them (found by gate 8.12: the intro lead re-entered).
    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      settleAll();
      root.querySelectorAll('[data-motion="reveal"]').forEach(block => {
        const rect = block.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight + REVEAL_AHEAD) settle(block);
      });
    }, { signal: controller.signal });
    arrivalRing = element => context.add(() => {
      const ring = gsap.timeline()
        .fromTo(element, { '--arrive': 0 }, { '--arrive': 1, duration: 0.3, ease: EASE.out })
        .to(element, { '--arrive': 0, duration: 0.6, ease: EASE.out })
        .set(element, { clearProps: '--arrive' });
      registerEntrance(element, ring, '--arrive');
    });
    return () => {
      arrivalRing = null;
      controller.abort();
      cleanups.forEach(cleanup => cleanup());
      setMotionActive(false);
      resetRegistry();
    };
  }, root);

  const hover = mediaContext(hoverQuery, () => {
    const cleanups = [];
    root.querySelectorAll(actionSelector).forEach(button => {
      // One reusable tween per button, including keyboard focus. Never accumulate
      // event-created tweens or change the clickable area/layout dimensions.
      const tween = gsap.to(button, { y: -2, duration: 0.2, ease: 'power2.out', paused: true });
      let hovered = false;
      let focused = false;
      const update = () => hovered || focused ? tween.play() : tween.reverse();
      const enter = () => { hovered = true; update(); };
      const leave = () => { hovered = false; update(); };
      const focus = () => { focused = true; update(); };
      const blur = () => { focused = false; update(); };
      const handlers = { pointerenter: enter, pointerleave: leave, focus, blur };
      Object.entries(handlers).forEach(([event, handler]) => button.addEventListener(event, handler));
      cleanups.push(() => Object.entries(handlers).forEach(([event, handler]) => button.removeEventListener(event, handler)));
    });
    return () => cleanups.forEach(cleanup => cleanup());
  }, root);

  // The two media contexts own everything, including observer-created animations.
  return () => { motion.revert(); hover.revert(); }; // creation order, as gsap.matchMedia did
}

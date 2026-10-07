import { gsap } from 'gsap';
import { DIST, DUR, EASE, STAGGER } from './tokens';
import { isSettled, registerEntrance, resetRegistry, setMotionActive, settleAll } from './registry';

const motionQuery = '(prefers-reduced-motion: no-preference)';
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
  const timeline = gsap.timeline({ defaults: { ease: EASE.soft } });
  if (food && window.matchMedia('(min-width: 1200px)').matches) {
    registerEntrance(food, timeline.from(food, { scale: 1.04, duration: 1.6, ease: EASE.settle, clearProps: 'transform' }, 0), 'transform');
  }
  lines.forEach(line => {
    const title = line.tagName === 'H1', eyebrow = line.classList.contains('target-eyebrow');
    const y = title ? DIST.l : eyebrow ? DIST.s : DIST.m;
    const at = title ? 0.12 : eyebrow ? 0.05 : 0.22;
    registerEntrance(line, timeline.from(line, { y, duration: title ? DUR.l : 0.6, clearProps: 'transform' }, at), 'transform');
  });
  if (figure) {
    registerEntrance(figure, timeline.from(figure, { y: phone ? DIST.m : DIST.l, duration: 0.9, clearProps: 'transform' }, 0.1), 'transform');
  }
  if (cta) {
    registerEntrance(cta, timeline.from(cta, { opacity: 0.6, duration: DUR.m, clearProps: 'opacity' }, 0.35), 'opacity');
    // One slow sheen across the CTA (index.css: ::after driven by --sheen-x; resting outside the button).
    registerEntrance(cta, timeline.fromTo(cta, { '--sheen-x': '-120%' }, { '--sheen-x': '120%', duration: 0.9, ease: 'power1.inOut', clearProps: '--sheen-x' }, 0.75), '--sheen-x');
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
      if (first && top < window.innerHeight) continue; // already visible: no entrance
      reveal.push(target);
    }
    if (!reveal.length) return;
    // Observer callbacks run later: explicitly capture their tweens for revert().
    context.add(() => {
      const groups = new Map();
      reveal.forEach(target => groups.set(target.parentElement, [...(groups.get(target.parentElement) ?? []), target]));
      groups.forEach(group => {
        // S2/S4: a visible but quiet rise. Section headings settle slower; cards stagger per grid (cap .24s).
        const heading = group.every(target => target.classList.contains('target-section-heading'));
        const tween = gsap.from(group, {
          y: DIST.m, opacity: 0.85, duration: heading ? DUR.l : DUR.m,
          stagger: { each: STAGGER.tight, amount: Math.min(0.24, (group.length - 1) * STAGGER.tight) },
          ease: heading ? EASE.settle : EASE.out, clearProps: 'transform,opacity',
        });
        group.forEach(target => registerEntrance(target, tween, 'transform,opacity'));
      });
    });
  }, { threshold: 0.12, rootMargin: '0px 0px 160px 0px' });
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
  const media = gsap.matchMedia();
  media.add(motionQuery, (context) => {
    const controller = new AbortController();
    setMotionActive(true);
    const cleanups = [setupPressMotion(root), heroScene(root), revealScene(root, context)];
    // Back/forward cache: restore entrances to their natural state; press/hover tweens stay alive.
    window.addEventListener('pageshow', event => { if (event.persisted) settleAll(); }, { signal: controller.signal });
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

  media.add(hoverQuery, () => {
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

  // matchMedia owns both contexts, including observer-created animations.
  return () => media.revert();
}

import { gsap } from 'gsap';

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

// Progressive enhancement: nothing is hidden in CSS, and scroll targets are only
// animated once they are visible. No scroll interception or booking UI selectors.
export function setupHomeMotion(root) {
  if (!root || typeof window.matchMedia !== 'function') return () => {};
  const media = gsap.matchMedia();
  media.add(motionQuery, (context) => {
    const cleanups = [setupPressMotion(root)];
    gsap.from(root.querySelectorAll('.target-hero__copy > :not(button)'), {
      y: 8, opacity: 0.92, duration: 0.48, stagger: 0.06,
      ease: 'power2.out', clearProps: 'transform,opacity',
    });

    if (typeof IntersectionObserver !== 'function') return () => cleanups.forEach(cleanup => cleanup());
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!active) return; // Ignore queued notifications after route/preference cleanup.
      const visible = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
      if (!visible.length) return;
      visible.forEach(target => observer.unobserve(target));
      // Observer callbacks run later: explicitly capture their tweens for revert().
      context.add(() => {
        gsap.from(visible, {
          y: 8, opacity: 0.94, duration: 0.42,
          stagger: { each: 0.04, amount: Math.min(0.16, (visible.length - 1) * 0.04) },
          ease: 'power2.out', clearProps: 'transform,opacity',
        });
      });
    }, { threshold: 0.12 });
    root.querySelectorAll([
      '.target-section-heading', '.target-intro__lead', '.target-tour-pick',
      '.target-inclusions h2', '.target-inclusions li', '.target-journey__grid li',
      '.target-menu__dish', '.target-lectures__content',
      '.target-bio__introduction', '.target-bio__invitation', '#media .media-card',
    ].join(',')).forEach(target => observer.observe(target));
    cleanups.push(() => { active = false; observer.disconnect(); });
    return () => cleanups.forEach(cleanup => cleanup());
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

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef } from 'react';
import { settle } from '../animations/registry';
import { requestArrival } from '../animations/homeMotion';
import { focusArrived, waitForArrival } from './arrival';

// Without a provider (tests, or anything rendered outside the site shell) goToInquiry is null and components
// keep their original behaviour.
const NavigationContext = createContext({ goToInquiry: null, cancelNavigation: () => {} });

export function useNavigation() { return useContext(NavigationContext); }

// One controller per navigation, parented to a controller that lives as long as the site shell. It does not
// depend on the motion preference, so focus management works under reduced motion too (plan S3.5).
export function NavigationProvider({ children }) {
  const lifetime = useRef(null);
  const current = useRef(null);

  useLayoutEffect(() => {
    lifetime.current = new AbortController();
    return () => { current.current?.abort(); lifetime.current.abort(); lifetime.current = null; };
  }, []);

  const goToInquiry = useCallback(async () => {
    const heading = document.getElementById('inquiry-title');
    const section = document.getElementById('date-selection');
    if (!heading || !section || !lifetime.current) { window.location.href = '/#date-selection'; return 'failed'; }
    current.current?.abort(); // a newer navigation replaces the older one
    const controller = new AbortController();
    current.current = controller;
    const { signal } = controller;
    lifetime.current.signal.addEventListener('abort', () => controller.abort(), { once: true, signal });
    // The visitor taking over (wheel, touch, pointer, any key) cancels the pending focus. The one exception is
    // Enter or Space on the control that started this navigation (S3.5): its own activation keys, not every
    // element's (Codex implementation review, round 2).
    const initiator = document.activeElement;
    const cancel = () => controller.abort();
    for (const type of ['wheel', 'touchstart', 'pointerdown']) window.addEventListener(type, cancel, { passive: true, signal });
    window.addEventListener('keydown', event => {
      const ownActivation = (event.key === 'Enter' || event.key === ' ') && initiator && initiator !== document.body && event.target === initiator;
      if (!ownActivation) cancel();
    }, { signal });

    settle(section);
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    heading.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    const result = await waitForArrival(heading, signal);
    if (result === 'arrived' && !signal.aborted) {
      focusArrived(heading);
      requestArrival(section.querySelector('[data-motion-arrive]'));
    } else if (result === 'failed' && import.meta.env?.DEV) {
      console.warn('[navigation] inquiry heading not reachable; focus not moved');
    }
    if (current.current === controller) current.current = null;
    controller.abort(); // release this navigation's listeners
    return result;
  }, []);

  // Any other site-controlled navigation (another section, opening the menu) replaces a pending arrival.
  const cancelNavigation = useCallback(() => { current.current?.abort(); current.current = null; }, []);

  const value = useMemo(() => ({ goToInquiry, cancelNavigation }), [goToInquiry, cancelNavigation]);
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

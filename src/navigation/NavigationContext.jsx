import { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useBrowserLayoutEffect } from '../hooks/useBrowserLayoutEffect';
import { settle } from '../animations/registry';
import { requestArrival } from '../animations/homeMotion';
import { focusArrived, waitForArrival } from './arrival';
import { waitForInquiryHeading } from './bookingIntent';

// Without a provider (tests, or anything rendered outside the site shell) goToInquiry is null and components
// keep their original behaviour.
const NavigationContext = createContext({ goToInquiry: null, cancelNavigation: () => {} });

export function useNavigation() { return useContext(NavigationContext); }

// One controller per navigation, parented to a controller that lives as long as the site shell. It does not
// depend on the motion preference, so focus management works under reduced motion too (plan S3.5).
export function NavigationProvider({ children }) {
  const lifetime = useRef(null);
  const current = useRef(null);

  useBrowserLayoutEffect(() => {
    lifetime.current = new AbortController();
    return () => { current.current?.abort(); lifetime.current.abort(); lifetime.current = null; };
  }, []);

  const goToInquiry = useCallback(async () => {
    if (!document.getElementById('date-selection') || !lifetime.current) { window.location.href = '/#date-selection'; return 'failed'; }
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

    // Show the loading destination immediately on an intentional early click.
    // This also brings the lazy picker into view if its intent listener has not
    // mounted yet. Visitor cancellation still prevents a later forced focus.
    if (!document.getElementById('inquiry-title')) {
      const pendingSection = document.getElementById('date-selection');
      settle(pendingSection);
      pendingSection.scrollIntoView({ behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
    const heading = await waitForInquiryHeading(signal);
    if (signal.aborted) return 'aborted';
    const section = document.getElementById('date-selection');
    if (!heading || !section) {
      if (current.current === controller) current.current = null;
      controller.abort(); window.location.href = '/#date-selection'; return 'failed';
    }
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

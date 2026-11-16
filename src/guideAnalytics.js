// A small entry for static public guides. Reuse exactly the same measurement and
// opt-out policy as the booking site; do not load React, Firebase or payment code.
import { initAnalytics, analyticsConfigured, consentState, withdrawConsent } from '../apps/protected-booking/src/utils/analytics';

if (import.meta.env.MODE === 'booking') {
  initAnalytics();
  const button = document.getElementById('analytics-opt-out');
  if (button && analyticsConfigured() && consentState() === 'granted') {
    button.hidden = false;
    button.addEventListener('click', () => { if (withdrawConsent()) button.hidden = true; });
  }
}

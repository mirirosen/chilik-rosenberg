import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { consentState, setConsent } from '../../apps/protected-booking/src/utils/analytics';

const copy = {
  he: { text: 'נשמח להשתמש ב-Google Analytics כדי להבין איך משתמשים באתר ולשפר אותו. הכלי ייטען רק אם תאשרו.', accept: 'אישור', decline: 'לא, תודה', privacy: 'מדיניות הפרטיות', label: 'הסכמה לשימוש בכלי מדידה' },
  en: { text: 'We would like to use Google Analytics to understand how the site is used and improve it. It loads only if you agree.', accept: 'Accept', decline: 'No thanks', privacy: 'Privacy policy', label: 'Consent to analytics' },
};

// Shown only when a GA4 measurement ID is configured and no choice was made yet.
// Rendered after mount, so the prerendered homepage never contains it.
export default function ConsentBanner() {
  const { i18n } = useTranslation();
  const [visible, setVisible] = useState(false);
  useEffect(() => { setVisible(consentState() === 'unset'); }, []);
  if (!visible) return null;
  const text = copy[i18n.language?.startsWith('en') ? 'en' : 'he'];
  const choose = granted => { setConsent(granted); setVisible(false); };
  return <div className="consent-banner" role="dialog" aria-live="polite" aria-label={text.label} dir={i18n.dir?.() || 'rtl'} data-testid="consent-banner">
    <p>{text.text} <a href="/privacy">{text.privacy}</a></p>
    <div className="consent-banner__actions">
      <button type="button" className="target-button" onClick={() => choose(true)}>{text.accept}</button>
      <button type="button" className="target-button booking-secondary" onClick={() => choose(false)}>{text.decline}</button>
    </div>
  </div>;
}

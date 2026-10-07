import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IS_PREPROD } from '../utils/preview';
import { DEMO_CUSTOMER, getDemoBooking, resetDemoBookings, resolveDemoBooking } from '../utils/demoBookingService';

export function DemoBookingNotice({ onFill }) {
  const { t } = useTranslation();
  if (!IS_PREPROD) return null;
  return <aside className="demo-booking-panel" role="note">
    <strong>{t('demo.title')}</strong><p>{t('demo.notice')}</p>
    {onFill && <button type="button" className="target-button" onClick={() => onFill(DEMO_CUSTOMER)}>{t('demo.fill')}</button>}
  </aside>;
}
export function DemoBookingControls({ bookingId, onChange }) {
  const { t } = useTranslation();
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  if (!IS_PREPROD) return null;
  async function outcome(value) {
    if (busy) return;
    setBusy(true); setError('');
    try { await resolveDemoBooking(bookingId, value); onChange?.(); }
    catch { setError(t('demo.unavailable')); }
    finally { setBusy(false); }
  }
  return <aside className="demo-booking-panel" role="note">
    <strong>{t('demo.title')}</strong><p>{t('demo.chooseOutcome')}</p>
    <div className="demo-booking-actions">{['success', 'decline', 'pending', 'cancel'].map(value => <button type="button" className="target-button" data-testid={`demo-outcome-${value}`} key={value} disabled={busy} onClick={() => outcome(value)}>{t(`demo.${value}`)}</button>)}</div>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="target-terms" onClick={() => { resetDemoBookings(); window.location.assign('/#date-selection'); }}>{t('demo.reset')}</button>
  </aside>;
}
export function DemoCheckout({ bookingId }) {
  const { t, i18n } = useTranslation();
  if (!IS_PREPROD) return null;
  let booking;
  try { booking = getDemoBooking(bookingId); } catch { /* missing/corrupt demo record never becomes a success */ }
  return <section className="bg-brand-dark-lighter p-6 md:p-12 rounded-5xl border border-white/10 text-center" dir={i18n.dir()}>
    <h1 className="text-3xl text-brand-gold mb-6">{t('demo.checkout')}</h1>
    <DemoBookingNotice />
    {booking ? <><p className="font-mono break-all mb-4" dir="ltr">{booking.bookingId}</p><p className="mb-2">{booking.tourDate} · {booking.participants} {t('confirmation.participantsPlural')}</p><p className="text-3xl text-brand-gold mb-6">₪{booking.totalPrice}</p><p>{t('demo.noCard')}</p><DemoBookingControls bookingId={bookingId} onChange={() => window.location.assign(`/booking?payment=demo&id=${encodeURIComponent(bookingId)}`)} /></> : <p role="alert">{t('demo.unavailable')}</p>}
    <a href="/" className="target-button inline-flex">{t('booking.payment.backHome')}</a>
  </section>;
}

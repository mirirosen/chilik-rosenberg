import { bookingConversionCopy } from '../data/bookingConversion';
export default function BookingReassurance({language='he'}) {
  const copy=bookingConversionCopy(language);
  return <section className="booking-reassurance" aria-label={copy.beforePay}>
    <h2>{copy.beforePay}</h2><ul><li>{copy.confirmation}</li><li>{copy.meeting}</li></ul>
    <a href="/terms#terms-section-3" target="_blank" rel="noopener noreferrer">{copy.terms}</a>
  </section>;
}

export const validBookingReference = value => /^BK-[a-f0-9]{20,24}$/.test(value || '');
export function paymentReturnView(state) {
  if (!state || typeof state !== 'object') return 'unavailable';
  if (state.status === 'cancelled' && (state.paymentStatus === 'paid' || state.paymentStatus === 'pending_review' || state.refundStatus === 'manual_review_required')) return 'refundReview';
  if (state.paymentStatus === 'pending_review' || state.status === 'payment_review' || state.additionalPaymentReview === true) return 'review';
  if (state.paymentStatus === 'paid' && state.status === 'confirmed') return 'paid';
  if (state.status === 'confirmed' && state.paymentStatus === 'pending') return 'confirmed';
  if (state.status === 'cancelled' && state.paymentStatus === 'cancelled') return 'cancelled';
  if (state.status === 'cancelled' || ['failed', 'cancelled', 'expired'].includes(state.paymentStatus)) return 'failed';
  if (['creating', 'awaiting_payment', 'pending'].includes(state.paymentStatus)) return 'pending';
  return 'unavailable';
}
export function bookingErrorKey(error) {
  if (['booking-session-unavailable', 'authentication-unavailable'].includes(error.message)) return 'booking.payment.sessionRecovery';
  if (['booking-api-not-configured', 'payment-not-configured'].includes(error.message)) return 'booking.payment.bookingUnavailable';
  if (error.message === 'payment-verification-not-configured') return 'booking.payment.notConfigured';
  if (['capacity-exceeded', 'tour-unavailable'].includes(error.message)) return 'booking.validation.dateUnavailable';
  if (['booking-closed', 'idempotency-conflict'].includes(error.message)) return 'booking.payment.closedRequest';
  return 'booking.payment.createFailed';
}

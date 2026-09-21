import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../utils/firebase';
import BookingConfirmation from './BookingConfirmation';

// How long to wait for Grow's server-to-server webhook before telling the
// customer the payment is under manual review.
const VERIFY_TIMEOUT_MS = 3 * 60 * 1000;

// Public contact number (unchanged from the rest of the site).
const WHATSAPP_NUMBER = '972506724312';

/**
 * /payment/success?bookingId=…
 *
 * Grow redirects here after the customer pays. The redirect PROVES NOTHING —
 * this view subscribes to bookings/{bookingId} and only shows the confirmation
 * once the growWebhook function marks paymentStatus === 'completed'.
 */
const PaymentSuccess = ({ onBackToHome }) => {
  const { t } = useTranslation();
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');

  const [status, setStatus] = useState('verifying'); // verifying | completed | failed | timeout | missing
  const [bookingData, setBookingData] = useState(null);

  useEffect(() => {
    if (!bookingId) {
      setStatus('missing');
      return;
    }
    const ref = doc(db, 'bookings', bookingId);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setStatus('missing');
          return;
        }
        const data = snap.data();
        setBookingData({ ...data, firestoreId: snap.id });
        const ps = data.paymentStatus;
        if (ps === 'completed') setStatus('completed');
        else if (ps === 'failed') setStatus('failed');
        else if (ps === 'pending_review') setStatus('timeout');
      },
      () => setStatus('timeout')
    );
    const timer = setTimeout(() => {
      setStatus((s) => (s === 'verifying' ? 'timeout' : s));
    }, VERIFY_TIMEOUT_MS);
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [bookingId]);

  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    t('booking.payment.whatsappMessage', { bookingId: bookingId || '' })
  )}`;

  // Paid — show the standard confirmation (same component as manual flows).
  if (status === 'completed' && bookingData) {
    return <BookingConfirmation bookingData={bookingData} onBackToHome={onBackToHome} />;
  }

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <div className="pt-32 pb-20 px-6 max-w-3xl mx-auto">
        <div className="bg-brand-dark-lighter p-8 md:p-12 rounded-5xl border border-white/10 shadow-2xl text-center" dir="rtl">
          {status === 'verifying' && (
            <>
              <div className="animate-spin w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full mx-auto mb-6"></div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('booking.payment.verifying')}</h2>
              <p className="text-gray-400">{t('booking.payment.verifyingSub')}</p>
            </>
          )}

          {(status === 'timeout') && (
            <>
              <div className="text-6xl mb-6">⏳</div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('booking.payment.timeout')}</h2>
              <p className="text-gray-400 mb-8">{t('booking.payment.timeoutSub')}</p>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-brand-gold text-brand-dark font-bold py-3 px-8 rounded-full hover:opacity-90 transition-all"
              >
                {t('booking.payment.contactWhatsapp')}
              </a>
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="text-6xl mb-6">❌</div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('booking.payment.failed')}</h2>
              <p className="text-gray-400 mb-8">{t('booking.payment.failedSub')}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  type="button"
                  onClick={() => { window.location.href = '/booking'; }}
                  className="bg-brand-gold text-brand-dark font-bold py-3 px-8 rounded-full hover:opacity-90 transition-all"
                >
                  {t('booking.payment.backToBooking')}
                </button>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border border-white/20 text-white py-3 px-8 rounded-full hover:border-white/40 transition-all"
                >
                  {t('booking.payment.contactWhatsapp')}
                </a>
              </div>
            </>
          )}

          {status === 'missing' && (
            <>
              <div className="text-6xl mb-6">❓</div>
              <h2 className="text-2xl font-bold text-white mb-4">{t('booking.payment.missingBooking')}</h2>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="bg-brand-gold text-brand-dark font-bold py-3 px-8 rounded-full hover:opacity-90 transition-all"
              >
                {t('booking.payment.backToHome')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;

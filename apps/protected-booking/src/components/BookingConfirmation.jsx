import { CheckCircle, Calendar, Users, Mail, Phone, MessageCircle } from '../utils/icons';
import { formatDateHebrew } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { IS_PREPROD } from '../utils/preview';
import { demoBookingApi, DEMO_CHANGED, getDemoBooking } from '../utils/demoBookingService';
import { getPaymentStatus } from '../utils/paymentService';
import { paymentReturnView } from '../utils/paymentState';
import { DemoBookingNotice, DemoBookingControls } from './DemoBookingControls';

const BookingConfirmation = ({ bookingData, onBackToHome }) => {
  const { t, i18n } = useTranslation();
  const [verified, setVerified] = useState(bookingData), [statusError, setStatusError] = useState(''), [checking, setChecking] = useState(false);
  useEffect(() => {
    setVerified(bookingData);
    if (!IS_PREPROD || !bookingData?.bookingId) return;
    const refresh = () => { try { setVerified(getDemoBooking(bookingData.bookingId)); } catch { setStatusError(t('demo.unavailable')); } };
    window.addEventListener(DEMO_CHANGED, refresh);
    return () => window.removeEventListener(DEMO_CHANGED, refresh);
  }, [bookingData, t]);
  async function refreshStatus() {
    if (checking || !bookingData?.bookingId) return;
    setChecking(true); setStatusError('');
    try { const status = await (IS_PREPROD ? demoBookingApi.getPaymentStatus : getPaymentStatus)(bookingData.bookingId); setVerified(previous => ({ ...previous, ...status })); }
    catch { setStatusError(t('booking.payment.statusUnavailable')); }
    finally { setChecking(false); }
  }

  if (!bookingData) return null;
  const view = paymentReturnView(verified);
  const titleKey = { paid: 'booking.payment.paidTitle', confirmed: 'booking.payment.confirmedTitle', cancelled: 'booking.payment.cancelledTitle', failed: 'booking.payment.failedTitle', review: 'booking.payment.reviewTitle', refundReview: 'booking.payment.refundReviewTitle' }[view] || 'confirmation.title';
  const detailKey = { paid: 'booking.payment.paidDetail', confirmed: 'booking.payment.confirmedDetail', cancelled: 'booking.payment.cancelledDetail', failed: 'booking.payment.failedDetail', review: 'booking.payment.reviewDetail', refundReview: 'booking.payment.refundReviewDetail' }[view] || 'confirmation.pendingDetail';
  const confirmed = ['paid', 'confirmed'].includes(view);

  return (
    <div className="target-site target-booking-flow min-h-screen bg-brand-dark flex items-center justify-center px-4 md:px-6 py-12" dir={i18n.dir()}>
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8 animate-in zoom-in duration-500">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full border-4 mb-6 ${confirmed ? 'bg-green-500/20 border-green-500' : 'bg-brand-gold/10 border-brand-gold'}`}>
            {confirmed ? <CheckCircle size={48} className="text-green-500" /> : <span className="text-5xl text-brand-gold">{view === 'pending' ? '…' : '!'}</span>}
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-brand-gold font-bold mb-3">
            {t(titleKey)}
          </h1>
          <p className="text-xl text-gray-300">
            {t('confirmation.thankYou')}, {bookingData.name}!
          </p>
        </div>
        <DemoBookingNotice />
        <p className="text-center mb-6" role="status">{t(detailKey, { bookingId: bookingData.bookingId })}</p>
        {statusError && <p className="text-center mb-6" role="alert">{statusError}</p>}
        <button type="button" className="target-button w-full mb-6" onClick={refreshStatus} disabled={checking}>{t('booking.payment.refreshStatus')}</button>
        <DemoBookingControls bookingId={bookingData.bookingId} />

        {/* Booking Details Card */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-5xl p-8 md:p-12 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Booking Reference */}
          <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-3xl p-6 text-center mb-8">
            <div className="text-sm text-gray-400 mb-2">{t('confirmation.bookingReference')}</div>
            <div className="text-xl md:text-3xl font-black text-brand-gold font-mono tracking-wider break-all" dir="ltr">
              {bookingData.bookingId}
            </div>
            <div className="text-xs text-gray-500 mt-2">{t('confirmation.saveForReference')}</div>
          </div>

          {/* Booking Information */}
          <div className="space-y-6">
            <h2 className="text-2xl font-serif text-white font-bold text-right mb-6">
              {t('confirmation.bookingDetails')}
            </h2>

            {/* Tour Date */}
            <div className="booking-detail-row flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar size={20} />
                <span className="text-sm">{t('confirmation.tourDate')}</span>
              </div>
              <div className="text-xl font-bold text-white">
                {i18n.language?.startsWith('en') ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeZone: 'Asia/Jerusalem' }).format(new Date(`${bookingData.tourDate}T12:00:00Z`)) : formatDateHebrew(bookingData.tourDate)}
              </div>
            </div>

            {/* Participants */}
            <div className="booking-detail-row flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Users size={20} />
                <span className="text-sm">{t('confirmation.participants')}</span>
              </div>
              <div className="text-xl font-bold text-white">
                {bookingData.participants} {bookingData.participants === 1 ? t('confirmation.participant') : t('confirmation.participantsPlural')}
              </div>
            </div>

            {/* Email */}
            <div className="booking-detail-row flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Mail size={20} />
                <span className="text-sm">{t('confirmation.email')}</span>
              </div>
              <div className="text-lg text-white" dir="ltr">
                {bookingData.email}
              </div>
            </div>

            {/* Phone */}
            <div className="booking-detail-row flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Phone size={20} />
                <span className="text-sm">{t('confirmation.phone')}</span>
              </div>
              <div className="text-lg text-white" dir="ltr">
                {bookingData.phone}
              </div>
            </div>

            {/* Total Price */}
            <div className="flex flex-row-reverse items-center justify-between bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-6 mt-6">
              <div className="text-sm text-gray-400">{t('confirmation.totalPayment')}</div>
              <div className="text-right">
                <div className="text-3xl font-black text-brand-gold">
                  ₪{bookingData.totalPrice}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {bookingData.participants} × ₪{bookingData.pricePerPerson}
                </div>
              </div>
            </div>

            {/* Notes */}
            {bookingData.notes && (
              <div className="bg-brand-dark border border-white/10 rounded-2xl p-4 mt-4">
                <div className="flex items-center gap-2 text-gray-400 mb-2">
                  <MessageCircle size={16} />
                  <span className="text-sm font-bold">{t('confirmation.notes')}</span>
                </div>
                <p className="text-white text-right">{bookingData.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 mb-6 animate-in fade-in duration-1000">
          <h3 className="text-xl font-bold text-blue-400 text-right mb-4">{t('confirmation.nextSteps.title')}</h3>
          {IS_PREPROD ? <p>{t('demo.noMessages')}</p> : <ul className="space-y-3 text-right text-gray-300">
            <li className="flex items-start gap-3 justify-end">
              <span>{t('confirmation.nextSteps.emailPending')}</span>
              <div className="text-blue-400 mt-1">✓</div>
            </li>
            <li className="flex items-start gap-3 justify-end">
              <span>{t('confirmation.nextSteps.contactSoon')}</span>
              <div className="text-blue-400 mt-1">✓</div>
            </li>
            <li className="flex items-start gap-3 justify-end">
              <span>{t('confirmation.nextSteps.bookingNumber')}: <strong className="text-brand-gold">{bookingData.bookingId}</strong></span>
              <div className="text-blue-400 mt-1">✓</div>
            </li>
          </ul>}
        </div>

        {/* Contact Info */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-6 mb-6 text-center">
          <h3 className="text-lg font-bold text-brand-gold mb-3">{t('confirmation.contact.title')}</h3>
          <div className="space-y-2 text-gray-300">
            <p className="flex items-center justify-center gap-2">
              <a href="tel:0506724312" className="text-brand-gold hover:underline" dir="ltr">
                0506724312
              </a>
              <Phone size={16} />
            </p>
            <p className="flex items-center justify-center gap-2">
              <a href="https://wa.me/972506724312" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
                {t('confirmation.contact.whatsapp')}
              </a>
              <MessageCircle size={16} className="text-green-400" />
            </p>
          </div>
        </div>

        {/* Back to Home Button */}
        <button
          onClick={onBackToHome}
          className="w-full bg-brand-gold text-brand-dark py-4 rounded-full font-black text-lg hover:scale-105 transition-all"
        >
          {t('confirmation.backToHome')}
        </button>
      </div>
    </div>
  );
};

export default BookingConfirmation;

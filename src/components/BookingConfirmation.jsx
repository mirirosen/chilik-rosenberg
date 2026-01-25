import { CheckCircle, Calendar, Users, Mail, Phone, MessageCircle } from '../utils/icons';
import { formatDateHebrew } from '../utils/dateUtils';
import { useTranslation } from 'react-i18next';

const BookingConfirmation = ({ bookingData, onBackToHome }) => {
  const { t } = useTranslation();

  if (!bookingData) return null;

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center px-6 py-12">
      <div className="max-w-2xl w-full">
        {/* Success Icon */}
        <div className="text-center mb-8 animate-in zoom-in duration-500">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 rounded-full border-4 border-green-500 mb-6">
            <CheckCircle size={48} className="text-green-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif text-brand-gold font-bold mb-3">
            {t('confirmation.title')}
          </h1>
          <p className="text-xl text-gray-300">
            {t('confirmation.thankYou')}, {bookingData.name}!
          </p>
        </div>

        {/* Booking Details Card */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-5xl p-8 md:p-12 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Booking Reference */}
          <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-3xl p-6 text-center mb-8">
            <div className="text-sm text-gray-400 mb-2">{t('confirmation.bookingReference')}</div>
            <div className="text-3xl font-black text-brand-gold font-mono tracking-wider">
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
            <div className="flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar size={20} />
                <span className="text-sm">{t('confirmation.tourDate')}</span>
              </div>
              <div className="text-xl font-bold text-white">
                {formatDateHebrew(bookingData.tourDate)}
              </div>
            </div>

            {/* Participants */}
            <div className="flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Users size={20} />
                <span className="text-sm">{t('confirmation.participants')}</span>
              </div>
              <div className="text-xl font-bold text-white">
                {bookingData.participants} {bookingData.participants === 1 ? t('confirmation.participant') : t('confirmation.participantsPlural')}
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <Mail size={20} />
                <span className="text-sm">{t('confirmation.email')}</span>
              </div>
              <div className="text-lg text-white" dir="ltr">
                {bookingData.email}
              </div>
            </div>

            {/* Phone */}
            <div className="flex flex-row-reverse items-center justify-between border-b border-white/10 pb-4">
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
          <ul className="space-y-3 text-right text-gray-300">
            <li className="flex items-start gap-3 justify-end">
              <span>{t('confirmation.nextSteps.emailSent')}</span>
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
          </ul>
        </div>

        {/* Contact Info */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-6 mb-6 text-center">
          <h3 className="text-lg font-bold text-brand-gold mb-3">{t('confirmation.contact.title')}</h3>
          <div className="space-y-2 text-gray-300">
            <p className="flex items-center justify-center gap-2">
              <a href="tel:0505804367" className="text-brand-gold hover:underline" dir="ltr">
                050-580-4367
              </a>
              <Phone size={16} />
            </p>
            <p className="flex items-center justify-center gap-2">
              <a href="https://wa.me/972505804367" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">
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

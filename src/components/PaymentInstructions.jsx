import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { formatDateHebrew } from '../utils/dateUtils';
import { sendBookingEmails } from '../utils/emailService';
import { Phone, MessageSquare, Copy, Check, ArrowLeft, CreditCard, Building, Smartphone, Mail } from '../utils/icons';
import { FALLBACK_PAYMENT_INFO } from '../services/morningPayment';

const PaymentInstructions = () => {
  const { t, i18n } = useTranslation();
  const isHebrew = i18n.language === 'he';

  // Get URL parameters manually (no react-router-dom)
  const urlParams = new URLSearchParams(window.location.search);
  const bookingId = urlParams.get('bookingId');
  const paymentMethod = urlParams.get('method') || 'bit';
  const amount = urlParams.get('amount');
  const tourDate = urlParams.get('date');
  const participants = urlParams.get('participants');

  // Navigation helper
  const navigate = (path) => {
    window.location.href = path;
  };

  const [booking, setBooking] = useState(null);
  const [copied, setCopied] = useState({});
  const [loading, setLoading] = useState(true);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [emailsSent, setEmailsSent] = useState(false);

  // Fetch booking details if bookingId provided
  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setLoading(false);
        return;
      }

      try {
        const bookingRef = doc(db, 'bookings', bookingId);
        const bookingDoc = await getDoc(bookingRef);

        if (bookingDoc.exists()) {
          setBooking({ id: bookingDoc.id, ...bookingDoc.data() });
        }
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [field]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [field]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Open Bit app with pre-filled payment details
  const handleOpenBit = () => {
    console.log('=== OPENING BIT APP ===');
    const bitAmount = displayAmount;
    const description = `הזמנה ${shortBookingId}`;

    // Try multiple Bit URL formats
    const bitPhone = FALLBACK_PAYMENT_INFO.bit.phone;

    // Format 1: Bit web link (most compatible)
    const bitWebUrl = `https://www.bit.co.il/pay?phone=${bitPhone}`;

    // Format 2: WhatsApp with payment request (fallback)
    const whatsappUrl = `https://wa.me/972${bitPhone.substring(1)}?text=${encodeURIComponent(
      `שלום, אני רוצה לשלם ${bitAmount} ₪ עבור ${description}`
    )}`;

    console.log('Bit web URL:', bitWebUrl);
    console.log('Amount:', bitAmount);
    console.log('Description:', description);

    // Open Bit web page
    window.open(bitWebUrl, '_blank');

    // Show instructions
    alert(
      `לתשלום בביט:\n\n` +
      `1. פתח את אפליקציית ביט\n` +
      `2. לחץ "שלח כסף"\n` +
      `3. הזן מספר: ${bitPhone}\n` +
      `4. סכום: ${bitAmount} ₪\n` +
      `5. הערה: ${description}\n\n` +
      `לאחר התשלום, חזור לדף זה ולחץ "שילמתי"`
    );
  };

  // Handle "I Paid" button - confirm payment and send emails
  const handlePaymentConfirmed = async () => {
    console.log('=== USER CONFIRMED PAYMENT ===');
    setConfirmingPayment(true);

    try {
      // Update booking status in Firebase
      if (bookingId) {
        console.log('Updating booking status...');
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
          paymentStatus: 'awaiting_confirmation',
          userConfirmedPayment: true,
          userConfirmedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Booking status updated');
      }

      // Send confirmation emails
      console.log('Sending confirmation emails...');
      const bookingDataForEmail = booking || {
        id: bookingId,
        bookingId: shortBookingId,
        name: 'לקוח',
        email: '',
        phone: '',
        tourDate: displayDate,
        participants: displayParticipants,
        totalPrice: displayAmount,
        paymentMethod: paymentMethod,
      };

      const emailResults = await sendBookingEmails(bookingDataForEmail);
      console.log('Email results:', emailResults);

      setPaymentConfirmed(true);

      if (emailResults.admin?.success || emailResults.customer?.success) {
        setEmailsSent(true);
        console.log('✅ At least one email sent successfully');
      }

      // Show success message
      alert(
        '✅ תודה!\n\n' +
        'קיבלנו את האישור שביצעת תשלום.\n' +
        'נאשר את התשלום בהקדם ונשלח לך אישור במייל.\n\n' +
        'לשאלות: 0505804367'
      );

    } catch (error) {
      console.error('❌ Error confirming payment:', error);
      alert('שגיאה באישור התשלום. אנא צור קשר טלפוני: 0505804367');
    } finally {
      setConfirmingPayment(false);
    }
  };

  const displayAmount = amount || booking?.totalPrice || 0;
  const displayDate = tourDate || booking?.tourDate;
  const displayParticipants = participants || booking?.participants;
  const shortBookingId = bookingId?.substring(0, 8) || 'N/A';

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-brand-gold border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-brand-dark py-12 md:py-20 px-4"
      dir={isHebrew ? 'rtl' : 'ltr'}
    >
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-6">✅</div>
          <h1 className="text-3xl md:text-4xl font-black text-white mb-3">
            {isHebrew ? 'ההזמנה נשמרה בהצלחה!' : 'Booking Saved Successfully!'}
          </h1>
          <p className="text-gray-400 text-lg">
            {isHebrew ? `מספר הזמנה: ${shortBookingId}` : `Booking ID: ${shortBookingId}`}
          </p>
        </div>

        {/* Booking Summary */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-6 mb-8">
          <h2 className="text-xl font-bold text-brand-gold mb-4 text-center">
            {isHebrew ? 'פרטי ההזמנה' : 'Booking Details'}
          </h2>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-brand-dark rounded-2xl p-4">
              <p className="text-gray-400 text-sm mb-1">
                {isHebrew ? 'תאריך הסיור' : 'Tour Date'}
              </p>
              <p className="text-white font-bold">
                {displayDate ? formatDateHebrew(displayDate) : 'N/A'}
              </p>
            </div>

            <div className="bg-brand-dark rounded-2xl p-4">
              <p className="text-gray-400 text-sm mb-1">
                {isHebrew ? 'מספר משתתפים' : 'Participants'}
              </p>
              <p className="text-white font-bold text-2xl">
                {displayParticipants || 'N/A'}
              </p>
            </div>
          </div>

          {/* Total Price */}
          <div className="mt-4 bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 text-center">
            <p className="text-gray-300 text-sm mb-1">
              {isHebrew ? 'סכום לתשלום' : 'Amount to Pay'}
            </p>
            <p className="text-4xl font-black text-brand-gold">
              ₪{displayAmount.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Payment Instructions Card */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-6 md:p-8 mb-8">
          <h2 className="text-2xl font-bold text-brand-gold mb-6 text-center">
            {isHebrew ? 'השלמת התשלום' : 'Complete Payment'}
          </h2>

          {/* Bit Payment */}
          {paymentMethod === 'bit' && (
            <div className="bg-brand-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-500 p-3 rounded-full">
                  <Smartphone size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {isHebrew ? 'תשלום בביט' : 'Bit Payment'}
                </h3>
              </div>

              <div className="space-y-4">
                {/* Phone Number */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">
                    {isHebrew ? 'שלח לטלפון:' : 'Send to phone:'}
                  </p>
                  <div className="flex items-center justify-between bg-brand-dark-lighter rounded-xl p-4">
                    <span
                      className="text-brand-gold font-bold text-2xl font-mono"
                      dir="ltr"
                    >
                      {FALLBACK_PAYMENT_INFO.bit.phone}
                    </span>
                    <button
                      onClick={() => copyToClipboard(FALLBACK_PAYMENT_INFO.bit.phone, 'phone')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        copied.phone
                          ? 'bg-green-500 text-white'
                          : 'bg-brand-gold text-brand-dark hover:scale-105'
                      }`}
                    >
                      {copied.phone ? <Check size={16} /> : <Copy size={16} />}
                      {copied.phone ? (isHebrew ? 'הועתק!' : 'Copied!') : (isHebrew ? 'העתק' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* Recipient Name */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">
                    {isHebrew ? 'שם המוטב:' : 'Recipient:'}
                  </p>
                  <p className="text-white font-bold text-lg">
                    {FALLBACK_PAYMENT_INFO.bit.name}
                  </p>
                </div>

                {/* Note to add */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">
                    {isHebrew ? 'הוסף הערה:' : 'Add note:'}
                  </p>
                  <div className="flex items-center justify-between bg-brand-dark-lighter rounded-xl p-4">
                    <span className="text-white font-mono">
                      {isHebrew ? `הזמנה ${shortBookingId}` : `Booking ${shortBookingId}`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`הזמנה ${shortBookingId}`, 'note')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        copied.note
                          ? 'bg-green-500 text-white'
                          : 'bg-brand-gold text-brand-dark hover:scale-105'
                      }`}
                    >
                      {copied.note ? <Check size={16} /> : <Copy size={16} />}
                      {copied.note ? (isHebrew ? 'הועתק!' : 'Copied!') : (isHebrew ? 'העתק' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* Payment Action Buttons */}
                {!paymentConfirmed ? (
                  <div className="space-y-3 mt-6">
                    {/* Open Bit App Button */}
                    <button
                      onClick={handleOpenBit}
                      className="flex items-center justify-center gap-3 w-full bg-blue-500 text-white py-4 rounded-full font-bold text-lg hover:bg-blue-600 hover:scale-105 transition-all"
                    >
                      <span className="text-2xl">💳</span>
                      {isHebrew ? 'פתח את אפליקציית ביט' : 'Open Bit App'}
                    </button>

                    {/* I Paid Button */}
                    <button
                      onClick={handlePaymentConfirmed}
                      disabled={confirmingPayment}
                      className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirmingPayment ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          {isHebrew ? 'שולח אישור...' : 'Sending confirmation...'}
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          {isHebrew ? '✅ שילמתי - אשר הזמנה' : '✅ I Paid - Confirm Booking'}
                        </>
                      )}
                    </button>

                    <p className="text-gray-400 text-xs text-center">
                      {isHebrew
                        ? 'לחץ "שילמתי" רק לאחר שביצעת את התשלום בביט'
                        : 'Click "I Paid" only after completing the Bit payment'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
                    <div className="text-4xl mb-2">📧</div>
                    <p className="text-green-400 font-bold mb-1">
                      {isHebrew ? 'תודה! קיבלנו את האישור' : 'Thank you! Confirmation received'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {isHebrew
                        ? 'נאשר את התשלום ונעדכן אותך בהקדם'
                        : 'We will confirm payment and update you soon'
                      }
                    </p>
                  </div>
                )}

                {/* WhatsApp Backup */}
                <a
                  href={`https://wa.me/972505804367?text=${encodeURIComponent(
                    `שלום, שילמתי בביט עבור הזמנה ${shortBookingId}\nסכום: ${displayAmount} ₪\nתאריך: ${displayDate ? formatDateHebrew(displayDate) : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-transparent border border-green-500/50 text-green-400 py-3 rounded-full font-bold text-sm hover:bg-green-500/10 transition-all mt-4"
                >
                  <MessageSquare size={18} />
                  {isHebrew ? 'או שלח אישור ב-WhatsApp' : 'Or confirm via WhatsApp'}
                </a>
              </div>
            </div>
          )}

          {/* Bank Transfer */}
          {paymentMethod === 'bank_transfer' && (
            <div className="bg-brand-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-500 p-3 rounded-full">
                  <Building size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {isHebrew ? 'העברה בנקאית' : 'Bank Transfer'}
                </h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Bank */}
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{isHebrew ? 'בנק:' : 'Bank:'}</p>
                    <p className="text-white font-bold">{FALLBACK_PAYMENT_INFO.bankTransfer.bank}</p>
                  </div>

                  {/* Branch */}
                  <div>
                    <p className="text-gray-400 text-sm mb-1">{isHebrew ? 'סניף:' : 'Branch:'}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">{FALLBACK_PAYMENT_INFO.bankTransfer.branch}</span>
                      <button
                        onClick={() => copyToClipboard(FALLBACK_PAYMENT_INFO.bankTransfer.branch, 'branch')}
                        className={`p-1 rounded ${copied.branch ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
                      >
                        {copied.branch ? <Check size={14} /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Account Number */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">{isHebrew ? 'מספר חשבון:' : 'Account:'}</p>
                  <div className="flex items-center justify-between bg-brand-dark-lighter rounded-xl p-4">
                    <span className="text-brand-gold font-bold text-2xl font-mono">
                      {FALLBACK_PAYMENT_INFO.bankTransfer.account}
                    </span>
                    <button
                      onClick={() => copyToClipboard(FALLBACK_PAYMENT_INFO.bankTransfer.account, 'account')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        copied.account
                          ? 'bg-green-500 text-white'
                          : 'bg-brand-gold text-brand-dark hover:scale-105'
                      }`}
                    >
                      {copied.account ? <Check size={16} /> : <Copy size={16} />}
                      {copied.account ? (isHebrew ? 'הועתק!' : 'Copied!') : (isHebrew ? 'העתק' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* Account Holder */}
                <div>
                  <p className="text-gray-400 text-sm mb-1">{isHebrew ? 'שם בעל החשבון:' : 'Account holder:'}</p>
                  <p className="text-white font-bold">{FALLBACK_PAYMENT_INFO.bankTransfer.name}</p>
                </div>

                {/* Reference */}
                <div>
                  <p className="text-gray-400 text-sm mb-2">{isHebrew ? 'ציין בהעברה:' : 'Reference:'}</p>
                  <div className="flex items-center justify-between bg-brand-dark-lighter rounded-xl p-4">
                    <span className="text-white font-mono">
                      {isHebrew ? `הזמנה ${shortBookingId}` : `Booking ${shortBookingId}`}
                    </span>
                    <button
                      onClick={() => copyToClipboard(`הזמנה ${shortBookingId}`, 'reference')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                        copied.reference
                          ? 'bg-green-500 text-white'
                          : 'bg-brand-gold text-brand-dark hover:scale-105'
                      }`}
                    >
                      {copied.reference ? <Check size={16} /> : <Copy size={16} />}
                      {copied.reference ? (isHebrew ? 'הועתק!' : 'Copied!') : (isHebrew ? 'העתק' : 'Copy')}
                    </button>
                  </div>
                </div>

                {/* Payment Action Buttons */}
                {!paymentConfirmed ? (
                  <div className="space-y-3 mt-6">
                    {/* I Paid Button */}
                    <button
                      onClick={handlePaymentConfirmed}
                      disabled={confirmingPayment}
                      className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirmingPayment ? (
                        <>
                          <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                          {isHebrew ? 'שולח אישור...' : 'Sending confirmation...'}
                        </>
                      ) : (
                        <>
                          <Check size={20} />
                          {isHebrew ? '✅ ביצעתי העברה - אשר הזמנה' : '✅ I Transferred - Confirm Booking'}
                        </>
                      )}
                    </button>

                    <p className="text-gray-400 text-xs text-center">
                      {isHebrew
                        ? 'לחץ רק לאחר שביצעת את ההעברה הבנקאית'
                        : 'Click only after completing the bank transfer'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
                    <div className="text-4xl mb-2">📧</div>
                    <p className="text-green-400 font-bold mb-1">
                      {isHebrew ? 'תודה! קיבלנו את האישור' : 'Thank you! Confirmation received'}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {isHebrew
                        ? 'נאשר את התשלום ונעדכן אותך בהקדם'
                        : 'We will confirm payment and update you soon'
                      }
                    </p>
                  </div>
                )}

                {/* WhatsApp Backup */}
                <a
                  href={`https://wa.me/972505804367?text=${encodeURIComponent(
                    `שלום, ביצעתי העברה בנקאית עבור הזמנה ${shortBookingId}\nסכום: ${displayAmount} ₪\nתאריך: ${displayDate ? formatDateHebrew(displayDate) : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-transparent border border-green-500/50 text-green-400 py-3 rounded-full font-bold text-sm hover:bg-green-500/10 transition-all mt-4"
                >
                  <MessageSquare size={18} />
                  {isHebrew ? 'או שלח אישור ב-WhatsApp' : 'Or confirm via WhatsApp'}
                </a>
              </div>
            </div>
          )}

          {/* Credit Card */}
          {paymentMethod === 'credit' && (
            <div className="bg-brand-dark rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-orange-500 p-3 rounded-full">
                  <CreditCard size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">
                  {isHebrew ? 'תשלום בכרטיס אשראי' : 'Credit Card Payment'}
                </h3>
              </div>

              <p className="text-gray-400 mb-6 text-center">
                {isHebrew
                  ? 'לתשלום בכרטיס אשראי, אנא צור קשר טלפוני או ב-WhatsApp'
                  : 'For credit card payment, please contact us by phone or WhatsApp'
                }
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href="tel:0505804367"
                  className="flex items-center justify-center gap-2 w-full bg-blue-500 text-white py-4 rounded-full font-bold text-lg hover:bg-blue-600 transition-all"
                >
                  <Phone size={20} />
                  {isHebrew ? 'התקשר: 050-580-4367' : 'Call: 050-580-4367'}
                </a>

                <a
                  href={`https://wa.me/972505804367?text=${encodeURIComponent(
                    `שלום, אני רוצה לשלם בכרטיס אשראי עבור הזמנה ${shortBookingId}\nסכום: ${displayAmount} ₪`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 text-white py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-all"
                >
                  <MessageSquare size={20} />
                  {isHebrew ? 'שלח הודעה ב-WhatsApp' : 'Message on WhatsApp'}
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Info Note */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 mb-8 text-center">
          <p className="text-blue-300 text-sm">
            💡 {isHebrew
              ? 'לאחר ביצוע התשלום, ההזמנה תאושר ותקבל אישור במייל'
              : 'After payment is completed, your booking will be confirmed and you will receive an email confirmation'
            }
          </p>
        </div>

        {/* Contact & Navigation */}
        <div className="flex flex-col gap-4">
          <div className="flex gap-4 justify-center">
            <a
              href="https://wa.me/972505804367"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-full font-bold hover:bg-green-600 transition-all"
            >
              <MessageSquare size={18} />
              WhatsApp
            </a>
            <a
              href="tel:0505804367"
              className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-600 transition-all"
            >
              <Phone size={18} />
              {isHebrew ? 'התקשר' : 'Call'}
            </a>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 w-full bg-brand-dark border border-white/20 text-white py-4 rounded-full font-bold hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} className={isHebrew ? 'rotate-180' : ''} />
            {isHebrew ? 'חזרה לדף הבית' : 'Back to Home'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentInstructions;

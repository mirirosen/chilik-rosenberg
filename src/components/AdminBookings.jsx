import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations } from '../hooks/useFirebaseData';
import { formatDateHebrew } from '../utils/dateUtils';
import { sendBookingEmails } from '../utils/emailService';
import { checkMorningPaymentStatus } from '../services/morningPayment';
import { Calendar, Users, Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock, CreditCard, Building } from '../utils/icons';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [updating, setUpdating] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(null);

  const cloudData = useFirebaseData();

  useEffect(() => {
    // Real-time listener for bookings
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = [];
      snapshot.forEach((doc) => {
        bookingsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setBookings(bookingsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bookings:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update tour date registrations count
  const updateTourRegistrations = async (dateStr, delta) => {
    if (!db || !dateStr) return;

    try {
      const tourDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', dateStr);
      const tourDoc = await getDoc(tourDocRef);

      if (tourDoc.exists()) {
        await setDoc(tourDocRef, {
          currentRegistrations: increment(delta)
        }, { merge: true });
      } else {
        // Create document if it doesn't exist (shouldn't happen normally)
        const newCount = Math.max(0, delta);
        await setDoc(tourDocRef, {
          date: dateStr,
          useGlobalMax: true,
          customMax: null,
          currentRegistrations: newCount
        });
      }

      // Check and update sold-out status
      await checkAndUpdateSoldOut(dateStr, delta);
    } catch (error) {
      console.error('Error updating tour registrations:', error);
    }
  };

  // Check and auto-update sold-out status based on capacity
  const checkAndUpdateSoldOut = async (dateStr, delta) => {
    if (!db || !cloudData) return;

    try {
      const tourDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', dateStr);
      const tourDoc = await getDoc(tourDocRef);
      const tourData = tourDoc.exists() ? tourDoc.data() : { useGlobalMax: true, currentRegistrations: 0 };

      const globalMax = cloudData.globalMaxParticipants || 30;
      const effectiveMax = tourData.useGlobalMax ? globalMax : (tourData.customMax || globalMax);
      const newRegistrations = (tourData.currentRegistrations || 0) + delta;

      const globalDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
      const currentSoldOut = cloudData.soldOut || [];
      const isSoldOut = currentSoldOut.includes(dateStr);

      if (newRegistrations >= effectiveMax && !isSoldOut) {
        // Auto mark as sold out
        await setDoc(globalDocRef, {
          soldOut: [...currentSoldOut, dateStr]
        }, { merge: true });
      } else if (newRegistrations < effectiveMax && isSoldOut) {
        // Remove from sold out (spots freed up)
        await setDoc(globalDocRef, {
          soldOut: currentSoldOut.filter(d => d !== dateStr)
        }, { merge: true });
      }
    } catch (error) {
      console.error('Error checking/updating sold-out status:', error);
    }
  };

  const updateBookingStatus = async (bookingId, newStatus, booking) => {
    setUpdating(bookingId);
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const oldStatus = booking.status;

      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update registration count based on status change
      const participants = booking.participants || 0;

      // Calculate delta based on status transitions
      // Only confirmed bookings count towards registrations
      if (oldStatus === 'confirmed' && newStatus !== 'confirmed') {
        // Was confirmed, now not confirmed - subtract
        await updateTourRegistrations(booking.tourDate, -participants);
      } else if (oldStatus !== 'confirmed' && newStatus === 'confirmed') {
        // Was not confirmed, now confirmed - add
        await updateTourRegistrations(booking.tourDate, participants);
      }
      // If both old and new are not 'confirmed', no change needed
      // If both old and new are 'confirmed', no change needed (shouldn't happen)

    } catch (error) {
      console.error('Error updating booking:', error);
      alert('שגיאה בעדכון ההזמנה');
    } finally {
      setUpdating(null);
    }
  };

  // Confirm payment and send confirmation emails
  const confirmPaymentAndSendEmail = async (bookingId, booking) => {
    console.log('=== CONFIRMING PAYMENT & SENDING EMAILS ===');
    console.log('Booking ID:', bookingId);

    setSendingEmail(bookingId);

    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const oldStatus = booking.status;

      // 1. Update booking status to confirmed and payment to paid
      await updateDoc(bookingRef, {
        status: 'confirmed',
        paymentStatus: 'paid',
        paidAt: serverTimestamp(),
        confirmedBy: 'admin',
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Booking status updated to confirmed + paid');

      // 2. Update registration count if status changed
      const participants = booking.participants || 0;
      if (oldStatus !== 'confirmed') {
        await updateTourRegistrations(booking.tourDate, participants);
      }

      // 3. Send confirmation emails
      console.log('Sending confirmation emails...');
      const emailResults = await sendBookingEmails({
        ...booking,
        id: bookingId,
        tourDate: formatDateHebrew(booking.tourDate),
        paymentStatus: 'paid',
      });

      console.log('Email results:', emailResults);

      if (emailResults.admin?.success && emailResults.customer?.success) {
        console.log('✅ All emails sent successfully');
        alert('✅ ההזמנה אושרה ונשלחו מיילים ללקוח ולאדמין');
      } else if (emailResults.customer?.success) {
        console.log('⚠️ Customer email sent, admin email failed');
        alert('ההזמנה אושרה. המייל ללקוח נשלח, אך המייל לאדמין נכשל.');
      } else if (emailResults.admin?.success) {
        console.log('⚠️ Admin email sent, customer email failed');
        alert('ההזמנה אושרה. המייל לאדמין נשלח, אך המייל ללקוח נכשל.');
      } else {
        console.error('❌ All emails failed');
        alert('ההזמנה אושרה, אך שליחת המיילים נכשלה. בדוק את הקונסול.');
      }

    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('שגיאה באישור התשלום: ' + error.message);
    } finally {
      setSendingEmail(null);
    }
  };

  // Check Morning payment status
  const checkPaymentStatus = async (bookingId, booking) => {
    if (!booking.morningDocumentId) {
      alert('אין מסמך Morning מקושר להזמנה זו');
      return;
    }

    setCheckingPayment(bookingId);

    try {
      const result = await checkMorningPaymentStatus(booking.morningDocumentId);

      if (result.success) {
        // Update booking with latest status
        const bookingRef = doc(db, 'bookings', bookingId);
        await updateDoc(bookingRef, {
          morningPaymentStatus: result.status,
          morningStatusText: result.statusText,
          lastPaymentCheck: serverTimestamp(),
        });

        if (result.isPaid) {
          // Automatically confirm and send email
          const shouldConfirm = window.confirm(
            `התשלום אושר במורנינג (${result.statusText})!\n\n` +
            `האם לאשר את ההזמנה ולשלוח מייל אישור ללקוח?`
          );

          if (shouldConfirm) {
            await confirmPaymentAndSendEmail(bookingId, booking);
          }
        } else {
          alert(`סטטוס תשלום: ${result.statusText}`);
        }
      } else {
        alert('שגיאה בבדיקת סטטוס התשלום: ' + result.error);
      }
    } catch (error) {
      console.error('Error checking payment:', error);
      alert('שגיאה בבדיקת התשלום: ' + error.message);
    } finally {
      setCheckingPayment(null);
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'paid':
        return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'שולם' };
      case 'awaiting_payment':
        return { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'ממתין לתשלום' };
      case 'manual_required':
        return { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'דרוש אישור ידני' };
      case 'failed':
        return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'נכשל' };
      default:
        return { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'ממתין' };
    }
  };

  const getFilteredBookings = () => {
    const today = new Date().toISOString().split('T')[0];

    switch (filter) {
      case 'upcoming':
        return bookings.filter(b => b.tourDate >= today);
      case 'past':
        return bookings.filter(b => b.tourDate < today);
      default:
        return bookings;
    }
  };

  const filteredBookings = getFilteredBookings();

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return {
          bg: 'bg-green-500/20',
          text: 'text-green-400',
          border: 'border-green-500/50',
          label: 'אושר',
          icon: <CheckCircle size={16} />
        };
      case 'cancelled':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/50',
          label: 'בוטל',
          icon: <XCircle size={16} />
        };
      default:
        return {
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          border: 'border-yellow-500/50',
          label: 'ממתין',
          icon: <Clock size={16} />
        };
    }
  };

  // Calculate stats including confirmed participants per tour
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    totalParticipants: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.participants || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-brand-gold text-xl animate-pulse">טוען הזמנות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 text-center">
          <div className="text-4xl font-black text-blue-400 mb-2">{stats.total}</div>
          <div className="text-sm text-gray-400">סה"כ הזמנות</div>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-6 text-center">
          <div className="text-4xl font-black text-yellow-400 mb-2">{stats.pending}</div>
          <div className="text-sm text-gray-400">ממתינות</div>
        </div>

        <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-6 text-center">
          <div className="text-4xl font-black text-green-400 mb-2">{stats.confirmed}</div>
          <div className="text-sm text-gray-400">מאושרות</div>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/30 rounded-3xl p-6 text-center">
          <div className="text-4xl font-black text-purple-400 mb-2">{stats.totalParticipants}</div>
          <div className="text-sm text-gray-400">משתתפים מאושרים</div>
        </div>

        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-3xl p-6 text-center">
          <div className="text-4xl font-black text-brand-gold mb-2">₪{stats.totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-gray-400">סה"כ הכנסות</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            filter === 'all'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-brand-dark-lighter text-gray-400 hover:text-white'
          }`}
        >
          הכל ({bookings.length})
        </button>
        <button
          onClick={() => setFilter('upcoming')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            filter === 'upcoming'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-brand-dark-lighter text-gray-400 hover:text-white'
          }`}
        >
          סיורים קרובים
        </button>
        <button
          onClick={() => setFilter('past')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            filter === 'past'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-brand-dark-lighter text-gray-400 hover:text-white'
          }`}
        >
          סיורים עבר
        </button>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-12 text-center">
            <p className="text-gray-400 text-lg">אין הזמנות להצגה</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const statusBadge = getStatusBadge(booking.status);

            // Get tour capacity info
            const tourCapacity = cloudData ? {
              max: getEffectiveMax(cloudData, booking.tourDate),
              current: getCurrentRegistrations(cloudData, booking.tourDate)
            } : null;

            return (
              <div
                key={booking.id}
                className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-6 hover:border-brand-gold/30 transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Left Side - Main Info */}
                  <div className="flex-1 space-y-4">
                    {/* Header */}
                    <div className="flex flex-row-reverse items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 font-mono">
                          {booking.bookingId}
                        </span>
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${statusBadge.bg} ${statusBadge.text} border ${statusBadge.border}`}>
                          {statusBadge.icon}
                          {statusBadge.label}
                        </span>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-white">{booking.name}</div>
                        <div className="text-sm text-gray-400">
                          {new Date(booking.createdAt?.seconds * 1000 || Date.now()).toLocaleDateString('he-IL')}
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tour Date */}
                      <div className="flex items-center gap-3 justify-end">
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {formatDateHebrew(booking.tourDate)}
                          </div>
                          <div className="text-xs text-gray-400">{booking.tourDate}</div>
                          {/* Tour capacity info */}
                          {tourCapacity && (
                            <div className="text-xs text-gray-500 mt-1">
                              קיבולת: {tourCapacity.current}/{tourCapacity.max}
                            </div>
                          )}
                        </div>
                        <Calendar size={20} className="text-brand-gold" />
                      </div>

                      {/* Participants */}
                      <div className="flex items-center gap-3 justify-end">
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">
                            {booking.participants} {booking.participants === 1 ? 'משתתף' : 'משתתפים'}
                          </div>
                          <div className="text-xs text-gray-400">₪{booking.pricePerPerson} לאדם</div>
                        </div>
                        <Users size={20} className="text-brand-gold" />
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-3 justify-end">
                        <a href={`tel:${booking.phone}`} className="text-lg text-blue-400 hover:underline" dir="ltr">
                          {booking.phone}
                        </a>
                        <Phone size={20} className="text-brand-gold" />
                      </div>

                      {/* Email */}
                      <div className="flex items-center gap-3 justify-end">
                        <a href={`mailto:${booking.email}`} className="text-lg text-blue-400 hover:underline truncate max-w-[200px]" dir="ltr">
                          {booking.email}
                        </a>
                        <Mail size={20} className="text-brand-gold" />
                      </div>
                    </div>

                    {/* Notes */}
                    {booking.notes && (
                      <div className="bg-brand-dark border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-gray-400 mb-2">
                          <MessageSquare size={16} />
                          <span className="text-sm font-bold">הערות</span>
                        </div>
                        <p className="text-white text-right text-sm">{booking.notes}</p>
                      </div>
                    )}

                    {/* Morning Payment Details */}
                    {(booking.morningDocumentId || booking.paymentStatus) && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-blue-400 mb-3">
                          <CreditCard size={16} />
                          <span className="text-sm font-bold">פרטי תשלום</span>
                        </div>

                        <div className="space-y-2 text-sm">
                          {/* Payment Status */}
                          {booking.paymentStatus && (
                            <div className="flex items-center justify-between">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${getPaymentStatusBadge(booking.paymentStatus).bg} ${getPaymentStatusBadge(booking.paymentStatus).text}`}>
                                {getPaymentStatusBadge(booking.paymentStatus).label}
                              </span>
                              <span className="text-gray-400">סטטוס תשלום:</span>
                            </div>
                          )}

                          {/* Payment Method */}
                          {booking.paymentMethod && (
                            <div className="flex items-center justify-between">
                              <span className="text-white">
                                {booking.paymentMethod === 'bit' ? 'ביט' :
                                 booking.paymentMethod === 'credit' ? 'אשראי' :
                                 booking.paymentMethod === 'bank_transfer' ? 'העברה בנקאית' :
                                 booking.paymentMethod}
                              </span>
                              <span className="text-gray-400">אמצעי תשלום:</span>
                            </div>
                          )}

                          {/* Morning Document ID */}
                          {booking.morningDocumentId && (
                            <div className="flex items-center justify-between">
                              <span className="text-white font-mono text-xs">{booking.morningDocumentId}</span>
                              <span className="text-gray-400">מסמך Morning:</span>
                            </div>
                          )}

                          {/* Morning Document Number */}
                          {booking.morningDocumentNumber && (
                            <div className="flex items-center justify-between">
                              <span className="text-white font-bold">{booking.morningDocumentNumber}</span>
                              <span className="text-gray-400">מס' חשבונית:</span>
                            </div>
                          )}

                          {/* Morning Error */}
                          {booking.morningError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 mt-2">
                              <span className="text-red-400 text-xs">שגיאה: {booking.morningError}</span>
                            </div>
                          )}

                          {/* Morning Links */}
                          {booking.morningDocumentId && (
                            <div className="flex gap-2 mt-3">
                              <a
                                href={`https://app.greeninvoice.co.il/documents/${booking.morningDocumentId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:underline text-xs"
                              >
                                צפה במורנינג →
                              </a>
                              <button
                                onClick={() => checkPaymentStatus(booking.id, booking)}
                                disabled={checkingPayment === booking.id}
                                className="text-purple-400 hover:underline text-xs disabled:opacity-50"
                              >
                                {checkingPayment === booking.id ? 'בודק...' : 'בדוק סטטוס'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Side - Actions */}
                  <div className="lg:w-64 flex flex-col gap-4">
                    {/* Total Price */}
                    <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 text-center">
                      <div className="text-sm text-gray-400 mb-1">סה"כ</div>
                      <div className="text-3xl font-black text-brand-gold">
                        ₪{booking.totalPrice}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {/* Confirm Payment & Send Email - Main CTA */}
                      {booking.status !== 'confirmed' && booking.paymentStatus !== 'paid' && (
                        <button
                          onClick={() => confirmPaymentAndSendEmail(booking.id, booking)}
                          disabled={sendingEmail === booking.id}
                          className="flex items-center justify-center gap-2 bg-brand-gold text-brand-dark px-4 py-3 rounded-full text-sm font-bold hover:scale-105 transition-all disabled:opacity-50"
                        >
                          {sendingEmail === booking.id ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-brand-dark border-t-transparent rounded-full"></div>
                              שולח...
                            </>
                          ) : (
                            <>
                              <Mail size={16} />
                              אשר תשלום + שלח מייל
                            </>
                          )}
                        </button>
                      )}

                      {/* Simple status update (without email) */}
                      {booking.status !== 'confirmed' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed', booking)}
                          disabled={updating === booking.id}
                          className="flex items-center justify-center gap-2 bg-green-500/20 text-green-400 border border-green-500/30 px-4 py-3 rounded-full text-sm font-bold hover:bg-green-500/30 transition-all disabled:opacity-50"
                        >
                          <CheckCircle size={16} />
                          אשר (ללא מייל)
                        </button>
                      )}

                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled', booking)}
                          disabled={updating === booking.id}
                          className="flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-3 rounded-full text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                          <XCircle size={16} />
                          בטל הזמנה
                        </button>
                      )}

                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'pending', booking)}
                          disabled={updating === booking.id}
                          className="flex items-center justify-center gap-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-4 py-3 rounded-full text-sm font-bold hover:bg-yellow-500/30 transition-all disabled:opacity-50"
                        >
                          <Clock size={16} />
                          החזר לממתין
                        </button>
                      )}

                      <a
                        href={`https://wa.me/972${booking.phone.replace(/^0/, '').replace(/-/g, '')}?text=שלום ${booking.name}, לגבי ההזמנה ${booking.bookingId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-green-700 transition-all"
                      >
                        <MessageSquare size={16} />
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminBookings;

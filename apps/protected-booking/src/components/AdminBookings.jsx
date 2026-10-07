import { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations } from '../hooks/useFirebaseData';
import { formatDateHebrew } from '../utils/dateUtils';
import { Calendar, Users, Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock } from '../utils/icons';

import { adminRequest, adminErrorMessage } from '../utils/adminService';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState('');
  const [jobs, setJobs] = useState([]);
  const [bookingsError, setBookingsError] = useState('');
  const [jobsError, setJobsError] = useState('');
  const [jobsLoading, setJobsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const actionLock = useRef(false);
  const [retrying, setRetrying] = useState(null);

  const cloudData = useFirebaseData({ admin: true });

  useEffect(() => {
    setLoading(true);
    setBookingsError('');
    // Real-time listener for bookings
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingsData = [];
      snapshot.forEach((doc) => {
        bookingsData.push({
          ...doc.data(),
          id: doc.id
        });
      });
      setBookings(bookingsData);
      setBookingsError('');
      setLoading(false);
    }, () => {
      // Keep server/customer details out of browser logs.
      setBookingsError('לא ניתן לטעון הזמנות. בדוק הרשאות וחיבור.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [refresh]);

  useEffect(() => {
    setJobsLoading(true); setJobsError('');
    return onSnapshot(query(collection(db, 'integrationJobs'), orderBy('updatedAt', 'desc'), limit(100)),
      snapshot => { setJobs(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))); setJobsLoading(false); setJobsError(''); },
      () => { setJobsLoading(false); setJobsError('לא ניתן לטעון מצב משלוח מיילים וסנכרון יומן'); });
  }, [refresh]);

  const updateBookingStatus = async (bookingId, status) => {
    if (actionLock.current || bookingsError) return;
    const notice = status === 'cancelled'
      ? `לבטל את ההזמנה ${bookingId}? המקומות ישוחררו. פעולה זו אינה מבצעת החזר כספי. תשלום שכבר התקבל או שיתקבל מאוחר יותר מחייב בדיקה ידנית.`
      : `לאשר את ההזמנה ${bookingId}? יש לוודא את פרטי ההזמנה והתשלום לפני האישור. האישור אינו מחייב כרטיס אשראי.`;
    if (!window.confirm(notice)) return;
    actionLock.current = true;
    setUpdating(bookingId);
    setError('');
    try { await adminRequest('updateBookingStatus', { bookingId, status }); }
    catch (error) { setError(adminErrorMessage(error)); }
    finally { actionLock.current = false; setUpdating(null); }
  };

  const retryJob = async (jobId) => {
    if (actionLock.current || jobsError || jobsLoading) return;
    actionLock.current = true;
    setRetrying(jobId);
    setError('');
    try { await adminRequest('retryIntegrationJob', { jobId }); }
    catch (error) { setError(adminErrorMessage(error)); }
    finally { actionLock.current = false; setRetrying(null); }
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
      case 'payment_review':
        return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/50', label: 'נדרשת בדיקת תשלום', icon: <Clock size={16} /> };
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
    pending: bookings.filter(b => ['pending', 'payment_pending'].includes(b.status)).length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0),
    totalParticipants: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.participants || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div role="status" className="text-brand-gold text-xl animate-pulse">טוען הזמנות...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {bookingsError && <div role="alert">{bookingsError} הנתונים המוצגים עשויים להיות לא עדכניים.</div>}
      <button type="button" onClick={() => setRefresh(n => n + 1)} disabled={!!updating || !!retrying}>רענן נתונים</button>
      {error && <div role="alert" className="border border-red-500 rounded-2xl p-4 text-red-300">{error}</div>}
      <section aria-label="מצב משלוח מיילים וסנכרון יומן" className="border border-white/20 rounded-2xl p-4 space-y-3" dir="rtl">
        <h2 className="font-bold text-lg">מיילים וסנכרון יומן</h2>
        <p className="text-sm text-gray-300">100 הפעולות האחרונות. אישור הספק אינו מעיד שהמייל נקרא. ניסיון חוזר רק מוסיף לתור ואינו מפעיל חיבור חסום. ביטול הזמנה אינו מבצע החזר כספי.</p>
        {jobsLoading && <p role="status">טוען פעולות סנכרון...</p>}
        {jobsError && <p role="alert">{jobsError}</p>}
        {!jobsLoading && !jobsError && !jobs.length && <p>אין פעולות סנכרון להצגה</p>}
        {jobs.map(job => <div key={job.id} className="border-t border-white/10 pt-3 flex flex-wrap gap-3 items-center">
          <span>{job.kind === 'calendar' ? 'יומן' : 'מייל'} · {job.bookingId || job.tourDate} · {{ pending: 'בתור', processing: 'בטיפול', sent: job.kind === 'calendar' ? 'הסנכרון אושר על ידי הספק' : 'הספק קיבל את בקשת המשלוח', blocked: 'חסום: נדרשת בדיקה', retry: 'ממתין לניסיון חוזר', failed: 'נכשל: נדרשת בדיקה' }[job.status] || 'מצב לא מוכר'}</span>
          {job.lastError && <span className="text-red-300">{job.lastError}</span>}
          {['failed', 'blocked', 'retry'].includes(job.status) && <button type="button"
            disabled={!!retrying || !!updating || !!jobsError || jobsLoading} onClick={() => retryJob(job.id)}
            className="border border-brand-gold rounded-full px-3 py-1 text-brand-gold disabled:opacity-50" aria-label={`הוסף לתור שוב ${job.id}`}>הוסף לתור שוב</button>}
        </div>)}
      </section>
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
          <div className="text-sm text-gray-400">תשלומים שהתקבלו</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 justify-end">
        <button
          aria-pressed={filter === 'all'} onClick={() => setFilter('all')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            filter === 'all'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-brand-dark-lighter text-gray-400 hover:text-white'
          }`}
        >
          הכל ({bookings.length})
        </button>
        <button
          aria-pressed={filter === 'upcoming'} onClick={() => setFilter('upcoming')}
          className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
            filter === 'upcoming'
              ? 'bg-brand-gold text-brand-dark'
              : 'bg-brand-dark-lighter text-gray-400 hover:text-white'
          }`}
        >
          סיורים קרובים
        </button>
        <button
          aria-pressed={filter === 'past'} onClick={() => setFilter('past')}
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
            <p className="text-gray-400 text-lg">{bookingsError ? 'רשימת ההזמנות אינה זמינה' : 'אין הזמנות להצגה'}</p>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const statusBadge = getStatusBadge(booking.status);

            // Get tour capacity info
            const tourCapacity = cloudData?.availabilityStatus === 'ready' ? {
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
                          {booking.bookingId || booking.id}
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

                    <div className="text-sm text-gray-300" dir="rtl">תשלום: {{ pending: 'ממתין לאישור', creating: 'פותח תשלום', awaiting_payment: 'ממתין לתשלום', paid: 'שולם', failed: 'נכשל', cancelled: 'בוטל', expired: 'פג תוקף', pending_review: 'נדרשת בדיקה' }[booking.paymentStatus] || 'לא ידוע'} · {booking.paymentMethod}</div>
                    {(booking.paymentStatus === 'pending_review' || booking.additionalPaymentReview || booking.refundStatus === 'manual_review_required') && <p className="text-amber-300 text-sm" dir="rtl">נדרשת בדיקת תשלום/החזר ידנית. לא בוצע החזר אוטומטי.</p>}
                    {booking.schemaVersion !== 2 && <p className="text-amber-300 text-sm" dir="rtl">הזמנה ישנה: נדרשת התאמת נתונים לפני שינוי מצב</p>}
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
                      {booking.schemaVersion === 2 && booking.status === 'pending' && booking.capacityReserved === true && booking.paymentMethod !== 'credit' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          disabled={!!updating || !!retrying || !!bookingsError}
                          className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          <CheckCircle size={16} />
                          אשר הזמנה
                        </button>
                      )}

                      {booking.schemaVersion === 2 && booking.status !== 'cancelled' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          disabled={!!updating || !!retrying || !!bookingsError}
                          className="flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-3 rounded-full text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                          <XCircle size={16} />
                          בטל הזמנה
                        </button>
                      )}

                      <a
                        href={`https://wa.me/972${String(booking.phone || '').replace(/^0/, '').replace(/-/g, '')}?text=שלום ${booking.name}, לגבי ההזמנה ${booking.bookingId || booking.id}`}
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

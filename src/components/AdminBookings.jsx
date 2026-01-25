import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { formatDateHebrew } from '../utils/dateUtils';
import { Calendar, Users, Phone, Mail, MessageSquare, CheckCircle, XCircle, Clock } from '../utils/icons';

const AdminBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, upcoming, past
  const [updating, setUpdating] = useState(null);

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

  const updateBookingStatus = async (bookingId, newStatus) => {
    setUpdating(bookingId);
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await updateDoc(bookingRef, {
        status: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('שגיאה בעדכון ההזמנה');
    } finally {
      setUpdating(null);
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

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
    totalRevenue: bookings
      .filter(b => b.status === 'confirmed')
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                      {booking.status !== 'confirmed' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                          disabled={updating === booking.id}
                          className="flex items-center justify-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full text-sm font-bold hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          <CheckCircle size={16} />
                          אשר הזמנה
                        </button>
                      )}

                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          disabled={updating === booking.id}
                          className="flex items-center justify-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-3 rounded-full text-sm font-bold hover:bg-red-500/30 transition-all disabled:opacity-50"
                        >
                          <XCircle size={16} />
                          בטל הזמנה
                        </button>
                      )}

                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => updateBookingStatus(booking.id, 'pending')}
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

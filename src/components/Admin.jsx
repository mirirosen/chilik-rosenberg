import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, formatDateHebrew, isThursday } from '../utils/dateUtils';
import { Lock, Unlock, XCircle, CheckCircle, LogOut, Calendar, Users } from '../utils/icons';
import AdminBookings from './AdminBookings';

const ADMIN_PASSWORD = "chilik2026"; // Change this to a secure password

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('tours'); // 'tours' or 'bookings'

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12), []); // Show next 12 Thursdays

  // Check localStorage for existing session
  useEffect(() => {
    const session = localStorage.getItem('admin_session');
    if (session === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_session', 'authenticated');
      setError('');
    } else {
      setError('סיסמה שגויה');
      setPassword('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_session');
    setPassword('');
  };

  const toggleBlocked = async (dateStr) => {
    if (!db || !cloudData) return;
    
    setSaving(true);
    setSuccessMessage('');

    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
      
      const currentBlocked = cloudData.blocked || [];
      const currentSoldOut = cloudData.soldOut || [];
      
      let newBlocked;
      let newSoldOut = currentSoldOut;
      
      if (currentBlocked.includes(dateStr)) {
        // Unblock the date
        newBlocked = currentBlocked.filter(d => d !== dateStr);
      } else {
        // Block the date and remove from soldOut if present
        newBlocked = [...currentBlocked, dateStr];
        newSoldOut = currentSoldOut.filter(d => d !== dateStr);
      }

      await setDoc(docRef, {
        blocked: newBlocked,
        soldOut: newSoldOut
      });

      setSuccessMessage('✅ השינויים נשמרו בהצלחה');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating Firestore:', err);
      setError('שגיאה בשמירה. נסה שוב.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleSoldOut = async (dateStr) => {
    if (!db || !cloudData) return;
    
    setSaving(true);
    setSuccessMessage('');

    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
      
      const currentBlocked = cloudData.blocked || [];
      const currentSoldOut = cloudData.soldOut || [];
      
      let newSoldOut;
      let newBlocked = currentBlocked;
      
      if (currentSoldOut.includes(dateStr)) {
        // Mark as available
        newSoldOut = currentSoldOut.filter(d => d !== dateStr);
      } else {
        // Mark as sold out and remove from blocked if present
        newSoldOut = [...currentSoldOut, dateStr];
        newBlocked = currentBlocked.filter(d => d !== dateStr);
      }

      await setDoc(docRef, {
        blocked: newBlocked,
        soldOut: newSoldOut
      });

      setSuccessMessage('✅ השינויים נשמרו בהצלחה');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating Firestore:', err);
      setError('שגיאה בשמירה. נסה שוב.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getStatus = (dateStr) => {
    if (!cloudData) return { status: 'loading', label: 'טוען...', color: 'gray' };
    if (cloudData.blocked?.includes(dateStr)) return { status: 'blocked', label: 'חסום', color: 'gray' };
    if (cloudData.soldOut?.includes(dateStr)) return { status: 'soldOut', label: 'אזל', color: 'red' };
    return { status: 'available', label: 'זמין', color: 'green' };
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-brand-dark-lighter p-12 rounded-5xl border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-8">
            <Lock size={64} className="text-brand-gold" />
          </div>
          <h1 className="text-4xl font-serif text-brand-gold text-center mb-8 font-bold">
            כניסת מנהל
          </h1>
          
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-2 text-right">
                סיסמה
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-dark border border-white/20 rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-right"
                placeholder="הזן סיסמה"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 text-red-400 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-gold text-brand-dark py-4 rounded-full font-black text-xl hover:scale-105 transition-all"
            >
              התחבר
            </button>
          </form>

          <div className="mt-8 text-center">
            <a 
              href="/" 
              className="text-sm text-gray-400 hover:text-brand-gold transition-colors"
            >
              ← חזרה לאתר
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Header */}
      <header className="bg-brand-dark-lighter border-b border-white/10 px-6 py-6 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl md:text-3xl font-serif text-brand-gold font-bold">
              ניהול סיורים
            </h1>
            <span className="hidden md:inline-block text-sm text-gray-400 bg-brand-dark px-4 py-2 rounded-full">
              חיליק רוזנברג
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="/" 
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              לאתר הראשי
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-500/20 transition-all"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">יציאה</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('tours')}
              className={`flex items-center gap-2 px-6 py-4 font-bold transition-all ${
                activeTab === 'tours'
                  ? 'text-brand-gold border-b-2 border-brand-gold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Calendar size={20} />
              <span>ניהול תאריכים</span>
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-6 py-4 font-bold transition-all ${
                activeTab === 'bookings'
                  ? 'text-brand-gold border-b-2 border-brand-gold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users size={20} />
              <span>הזמנות</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {activeTab === 'bookings' ? (
          <AdminBookings />
        ) : (
          <div>
        {/* Status Messages */}
        {successMessage && (
          <div className="mb-6 bg-green-500/10 border border-green-500/50 rounded-2xl p-4 text-green-400 text-center animate-in fade-in">
            {successMessage}
          </div>
        )}
        
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/50 rounded-2xl p-4 text-red-400 text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* Quick Date Selector */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8 mb-8">
          <h2 className="text-xl font-bold text-brand-gold mb-6 text-right">
            בחירת תאריך מהירה
          </h2>
          
          <div className="flex flex-col md:flex-row gap-6 items-center">
            <div className="w-full md:w-1/3">
              <label htmlFor="datepicker" className="block text-sm font-bold mb-2 text-right text-gray-300">
                בחר תאריך
              </label>
              <input
                type="date"
                id="datepicker"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-brand-dark border border-white/20 rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center font-bold text-lg"
                style={{ colorScheme: 'dark' }}
              />
            </div>

            {selectedDate && (
              <div className="w-full md:w-2/3 animate-in fade-in slide-in-from-top-2 duration-300">
                {!isThursday(selectedDate) ? (
                  // Warning for non-Thursday dates
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3 justify-center">
                      <XCircle size={24} className="text-yellow-500" />
                      <div className="text-lg font-bold text-yellow-500">
                        הסיורים הקבועים מתקיימים רק בימי חמישי
                      </div>
                    </div>
                    <div className="text-center text-gray-300 text-sm">
                      <p className="mb-2">התאריך שבחרת: <strong>{formatDateHebrew(selectedDate)}</strong></p>
                      <p className="text-xs text-gray-400">
                        (בעתיד תוכל להוסיף סיורים מיוחדים בימים אחרים)
                      </p>
                    </div>
                  </div>
                ) : (
                  // Thursday date - show controls
                  <div className="bg-brand-dark border border-white/10 rounded-2xl p-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      {/* Selected Date Info */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-white mb-1">
                          {formatDateHebrew(selectedDate)}
                        </div>
                        <div className="text-xs text-gray-400">{selectedDate}</div>
                      </div>

                      {/* Status Badge */}
                      <div className="text-center">
                        <span
                          className={`inline-block px-6 py-2 rounded-full text-sm font-bold ${
                            getStatus(selectedDate).status === 'available'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : getStatus(selectedDate).status === 'soldOut'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                          }`}
                        >
                          {getStatus(selectedDate).label}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => toggleBlocked(selectedDate)}
                          disabled={saving}
                          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
                            getStatus(selectedDate).status === 'blocked'
                              ? 'bg-gray-500 text-white shadow-lg'
                              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                          } disabled:opacity-50`}
                        >
                          {getStatus(selectedDate).status === 'blocked' ? <Lock size={16} /> : <Unlock size={16} />}
                          {getStatus(selectedDate).status === 'blocked' ? 'בטל חסימה' : 'חסום'}
                        </button>

                        <button
                          onClick={() => toggleSoldOut(selectedDate)}
                          disabled={saving}
                          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
                            getStatus(selectedDate).status === 'soldOut'
                              ? 'bg-red-500 text-white shadow-lg'
                              : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                          } disabled:opacity-50`}
                        >
                          {getStatus(selectedDate).status === 'soldOut' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          {getStatus(selectedDate).status === 'soldOut' ? 'פנה מקום' : 'אזל'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8 mb-8">
          <h2 className="text-xl font-bold text-brand-gold mb-4 text-right">
            הוראות שימוש
          </h2>
          <ul className="space-y-2 text-gray-300 text-right text-sm">
            <li className="flex items-start gap-3 justify-end">
              <span>לחץ על "חסום" כדי לסמן תאריך שבו אין סיור</span>
              <XCircle size={20} className="text-gray-400 mt-0.5" />
            </li>
            <li className="flex items-start gap-3 justify-end">
              <span>לחץ על "אזל המקום" כדי לסמן סיור שהתמלא</span>
              <CheckCircle size={20} className="text-red-400 mt-0.5" />
            </li>
            <li className="flex items-start gap-3 justify-end">
              <span>תאריך לא יכול להיות גם חסום וגם "אזל המקום" במקביל</span>
              <Lock size={20} className="text-brand-gold mt-0.5" />
            </li>
            <li className="flex items-start gap-3 justify-end">
              <span>השינויים נשמרים מיידית ומעודכנים באתר הראשי</span>
              <Unlock size={20} className="text-green-400 mt-0.5" />
            </li>
          </ul>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-6 text-center">
            <div className="text-4xl font-black text-green-400 mb-2">
              {thursdays.filter(t => getStatus(t.dateStr).status === 'available').length}
            </div>
            <div className="text-sm text-gray-400">סיורים זמינים</div>
          </div>
          
          <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
            <div className="text-4xl font-black text-red-400 mb-2">
              {cloudData?.soldOut?.length || 0}
            </div>
            <div className="text-sm text-gray-400">אזל המקום</div>
          </div>
          
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-3xl p-6 text-center">
            <div className="text-4xl font-black text-gray-400 mb-2">
              {cloudData?.blocked?.length || 0}
            </div>
            <div className="text-sm text-gray-400">תאריכים חסומים</div>
          </div>
        </div>

        {/* Tour Dates List */}
        <div className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
          <h2 className="text-2xl font-serif text-brand-gold mb-6 text-right font-bold">
            סיורי חמישי הקרובים
          </h2>
          
          {saving && (
            <div className="text-center text-brand-gold mb-4 animate-pulse">
              שומר שינויים...
            </div>
          )}

          <div className="space-y-3">
            {thursdays.map((item, i) => {
              const status = getStatus(item.dateStr);
              
              return (
                <div
                  key={i}
                  className="bg-brand-dark border border-white/10 rounded-2xl p-6 hover:border-brand-gold/30 transition-all"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Date Info */}
                    <div className="flex items-center gap-4 text-right md:w-1/3">
                      <div className="text-center">
                        <div className="text-3xl font-black text-white">{item.day}</div>
                        <div className="text-xs text-gray-400">{item.month}</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">
                          {formatDateHebrew(item.dateStr)}
                        </div>
                        <div className="text-xs text-gray-400">{item.dateStr}</div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="md:w-1/3 text-center">
                      <span
                        className={`inline-block px-6 py-2 rounded-full text-sm font-bold ${
                          status.status === 'available'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                            : status.status === 'soldOut'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                        }`}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 md:w-1/3 justify-end">
                      <button
                        onClick={() => toggleBlocked(item.dateStr)}
                        disabled={saving}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
                          status.status === 'blocked'
                            ? 'bg-gray-500 text-white shadow-lg'
                            : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                        } disabled:opacity-50`}
                      >
                        {status.status === 'blocked' ? <Lock size={16} /> : <Unlock size={16} />}
                        {status.status === 'blocked' ? 'בטל חסימה' : 'חסום'}
                      </button>

                      <button
                        onClick={() => toggleSoldOut(item.dateStr)}
                        disabled={saving}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
                          status.status === 'soldOut'
                            ? 'bg-red-500 text-white shadow-lg'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                        } disabled:opacity-50`}
                      >
                        {status.status === 'soldOut' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        {status.status === 'soldOut' ? 'פנה מקום' : 'אזל'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Firestore Info */}
        <div className="mt-8 text-center text-xs text-gray-500">
          <p>נתונים נשמרים ב-Firestore:</p>
          <code className="text-brand-gold">artifacts/{APP_ID}/public/data/settings/global</code>
        </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default Admin;

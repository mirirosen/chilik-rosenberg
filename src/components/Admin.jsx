import { useState, useEffect, useMemo } from 'react';
import { doc, setDoc, updateDoc, increment } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations, getAvailableSpots, usesGlobalMax } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, formatDateHebrew, isThursday } from '../utils/dateUtils';
import { Lock, Unlock, XCircle, CheckCircle, LogOut, Calendar, Users, Settings, Plus, Minus, Edit2, RotateCcw } from '../utils/icons';
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
  
  // Capacity management state
  const [editingGlobalMax, setEditingGlobalMax] = useState(false);
  const [tempGlobalMax, setTempGlobalMax] = useState(30);
  const [editingTourMax, setEditingTourMax] = useState(null); // dateStr being edited
  const [tempTourMax, setTempTourMax] = useState(30);

  const cloudData = useFirebaseData();
  const thursdays = useMemo(() => getUpcomingThursdays(12), []); // Show next 12 Thursdays

  // Initialize tempGlobalMax when cloudData loads
  useEffect(() => {
    if (cloudData?.globalMaxParticipants) {
      setTempGlobalMax(cloudData.globalMaxParticipants);
    }
  }, [cloudData?.globalMaxParticipants]);

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

  // ============================================
  // GLOBAL MAX PARTICIPANTS FUNCTIONS
  // ============================================

  const saveGlobalMax = async () => {
    if (!db || !cloudData) return;
    
    setSaving(true);
    setSuccessMessage('');

    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
      
      await setDoc(docRef, {
        ...cloudData,
        globalMaxParticipants: tempGlobalMax
      });

      setEditingGlobalMax(false);
      setSuccessMessage('✅ מקסימום משתתפים כללי נשמר בהצלחה');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving global max:', err);
      setError('שגיאה בשמירה. נסה שוב.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  // ============================================
  // TOUR-SPECIFIC MAX PARTICIPANTS FUNCTIONS
  // ============================================

  const saveTourMax = async (dateStr, useGlobal, customMax) => {
    if (!db) return;
    
    setSaving(true);
    setSuccessMessage('');

    try {
      const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', dateStr);
      
      await setDoc(docRef, {
        date: dateStr,
        useGlobalMax: useGlobal,
        customMax: useGlobal ? null : customMax,
        currentRegistrations: cloudData?.tourDates?.[dateStr]?.currentRegistrations || 0,
      }, { merge: true });

      setEditingTourMax(null);
      setSuccessMessage(`✅ הגדרות סיור ${formatDateHebrew(dateStr)} נשמרו`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error saving tour max:', err);
      setError('שגיאה בשמירה. נסה שוב.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const resetToGlobalMax = async (dateStr) => {
    await saveTourMax(dateStr, true, null);
  };

  const startEditingTourMax = (dateStr) => {
    const currentMax = getEffectiveMax(cloudData, dateStr);
    setTempTourMax(currentMax);
    setEditingTourMax(dateStr);
  };

  // ============================================
  // BLOCK/SOLD OUT FUNCTIONS
  // ============================================

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
        ...cloudData,
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
        ...cloudData,
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

  // ============================================
  // STATISTICS CALCULATIONS
  // ============================================

  const stats = useMemo(() => {
    if (!cloudData) return { available: 0, soldOut: 0, blocked: 0, totalRegistrations: 0, totalCapacity: 0, fullTours: 0 };
    
    const globalMax = cloudData.globalMaxParticipants || 30;
    let totalRegistrations = 0;
    let totalCapacity = 0;
    let fullTours = 0;
    
    thursdays.forEach(({ dateStr }) => {
      const status = getStatus(dateStr);
      if (status.status !== 'blocked') {
        const max = getEffectiveMax(cloudData, dateStr);
        const current = getCurrentRegistrations(cloudData, dateStr);
        totalCapacity += max;
        totalRegistrations += current;
        
        if (current >= max) {
          fullTours++;
        }
      }
    });
    
    return {
      available: thursdays.filter(t => getStatus(t.dateStr).status === 'available').length,
      soldOut: cloudData.soldOut?.length || 0,
      blocked: cloudData.blocked?.length || 0,
      totalRegistrations,
      totalCapacity,
      totalAvailable: totalCapacity - totalRegistrations,
      fullTours,
      globalMax
    };
  }, [cloudData, thursdays]);

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
        <div className="max-w-6xl mx-auto flex flex-row-reverse justify-between items-center">
          <div className="flex items-center gap-4">
            <span className="hidden md:inline-block text-sm text-gray-400 bg-brand-dark px-4 py-2 rounded-full">
              חיליק רוזנברג
            </span>
            <h1 className="text-2xl md:text-3xl font-serif text-brand-gold font-bold">
              ניהול סיורים
            </h1>
          </div>
          
          <div className="flex flex-row-reverse items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500/10 text-red-400 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-500/20 transition-all"
            >
              <LogOut size={16} />
              <span className="hidden md:inline">יציאה</span>
            </button>
            <a 
              href="/" 
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              לאתר הראשי
            </a>
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
              <span>ניהול תאריכים</span>
              <Calendar size={20} />
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`flex items-center gap-2 px-6 py-4 font-bold transition-all ${
                activeTab === 'bookings'
                  ? 'text-brand-gold border-b-2 border-brand-gold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>הזמנות</span>
              <Users size={20} />
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

            {/* ============================================ */}
            {/* GLOBAL SETTINGS SECTION - NEW */}
            {/* ============================================ */}
            <div className="bg-brand-gold/10 border-2 border-brand-gold/30 rounded-3xl p-6 mb-8">
              <div className="flex items-center gap-3 mb-4 justify-end">
                <h2 className="text-xl font-bold text-brand-gold">הגדרות קיבולת כללית</h2>
                <Settings size={24} className="text-brand-gold" />
              </div>
              
              <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-6">
                <div className="text-right">
                  <label className="text-white font-bold text-lg block mb-1">מקסימום משתתפים לסיור</label>
                  <p className="text-gray-400 text-sm">ברירת מחדל לכל הסיורים (ניתן לשנות לכל סיור בנפרד)</p>
                </div>
                
                <div className="flex items-center gap-4">
                  {editingGlobalMax ? (
                    <>
                      <button
                        onClick={() => setTempGlobalMax(Math.max(1, tempGlobalMax - 1))}
                        className="bg-brand-dark text-white w-12 h-12 rounded-full text-2xl font-bold hover:bg-brand-dark-lighter transition-all flex items-center justify-center border border-white/20"
                        disabled={saving}
                      >
                        <Minus size={20} />
                      </button>
                      
                      <input
                        type="number"
                        value={tempGlobalMax}
                        onChange={(e) => setTempGlobalMax(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                        className="w-24 text-center text-3xl font-black bg-brand-dark text-brand-gold border-2 border-brand-gold/50 rounded-2xl py-3 outline-none focus:border-brand-gold"
                        min="1"
                        max="100"
                      />
                      
                      <button
                        onClick={() => setTempGlobalMax(Math.min(100, tempGlobalMax + 1))}
                        className="bg-brand-dark text-white w-12 h-12 rounded-full text-2xl font-bold hover:bg-brand-dark-lighter transition-all flex items-center justify-center border border-white/20"
                        disabled={saving}
                      >
                        <Plus size={20} />
                      </button>
                      
                      <div className="flex gap-2 mr-4">
                        <button
                          onClick={saveGlobalMax}
                          disabled={saving}
                          className="bg-brand-gold text-brand-dark px-6 py-3 rounded-full font-bold hover:scale-105 transition-all disabled:opacity-50"
                        >
                          {saving ? 'שומר...' : 'שמור'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingGlobalMax(false);
                            setTempGlobalMax(cloudData?.globalMaxParticipants || 30);
                          }}
                          className="bg-gray-500/20 text-gray-400 px-4 py-3 rounded-full font-bold hover:bg-gray-500/30 transition-all"
                        >
                          ביטול
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-5xl font-black text-brand-gold">
                        {cloudData?.globalMaxParticipants || 30}
                      </div>
                      <span className="text-gray-400 text-lg">משתתפים</span>
                      <button
                        onClick={() => setEditingGlobalMax(true)}
                        className="bg-brand-dark border border-brand-gold/30 text-brand-gold px-4 py-2 rounded-full font-bold hover:bg-brand-gold/10 transition-all flex items-center gap-2 mr-4"
                      >
                        <Edit2 size={16} />
                        <span>ערוך</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================ */}
            {/* STATS SUMMARY - UPDATED */}
            {/* ============================================ */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-3xl p-6 text-center">
                <div className="text-4xl font-black text-brand-gold mb-2">
                  {stats.globalMax}
                </div>
                <div className="text-sm text-gray-400">מקסימום כללי</div>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-6 text-center">
                <div className="text-4xl font-black text-green-400 mb-2">
                  {stats.totalAvailable}
                </div>
                <div className="text-sm text-gray-400">מקומות פנויים</div>
              </div>
              
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-6 text-center">
                <div className="text-4xl font-black text-blue-400 mb-2">
                  {stats.totalRegistrations}
                </div>
                <div className="text-sm text-gray-400">סה"כ נרשמים</div>
              </div>
              
              <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 text-center">
                <div className="text-4xl font-black text-red-400 mb-2">
                  {stats.fullTours}
                </div>
                <div className="text-sm text-gray-400">סיורים מלאים</div>
              </div>
            </div>

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
                          <div className="text-lg font-bold text-yellow-500">
                            הסיורים הקבועים מתקיימים רק בימי חמישי
                          </div>
                          <XCircle size={24} className="text-yellow-500" />
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
                        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                          {/* Action Buttons */}
                          <div className="flex gap-3 order-last md:order-none">
                            <button
                              onClick={() => toggleBlocked(selectedDate)}
                              disabled={saving}
                              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
                                getStatus(selectedDate).status === 'blocked'
                                  ? 'bg-gray-500 text-white shadow-lg'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                              } disabled:opacity-50`}
                            >
                              <span>{getStatus(selectedDate).status === 'blocked' ? 'בטל חסימה' : 'חסום'}</span>
                              {getStatus(selectedDate).status === 'blocked' ? <Lock size={16} /> : <Unlock size={16} />}
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
                              <span>{getStatus(selectedDate).status === 'soldOut' ? 'פנה מקום' : 'אזל'}</span>
                              {getStatus(selectedDate).status === 'soldOut' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </button>
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

                          {/* Selected Date Info */}
                          <div className="text-right">
                            <div className="text-lg font-bold text-white mb-1">
                              {formatDateHebrew(selectedDate)}
                            </div>
                            <div className="text-xs text-gray-400">{selectedDate}</div>
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
                  <span>הגדר מקסימום משתתפים כללי - ישמש כברירת מחדל לכל הסיורים</span>
                  <div className="mt-0.5"><Settings size={20} className="text-brand-gold" /></div>
                </li>
                <li className="flex items-start gap-3 justify-end">
                  <span>לחץ על "ערוך קיבולת" בכל סיור כדי להגדיר מקסימום שונה</span>
                  <div className="mt-0.5"><Edit2 size={20} className="text-blue-400" /></div>
                </li>
                <li className="flex items-start gap-3 justify-end">
                  <span>לחץ על "חסום" כדי לסמן תאריך שבו אין סיור</span>
                  <div className="mt-0.5"><XCircle size={20} className="text-gray-400" /></div>
                </li>
                <li className="flex items-start gap-3 justify-end">
                  <span>לחץ על "אזל המקום" כדי לסמן סיור שהתמלא</span>
                  <div className="mt-0.5"><CheckCircle size={20} className="text-red-400" /></div>
                </li>
                <li className="flex items-start gap-3 justify-end">
                  <span>השינויים נשמרים מיידית ומעודכנים באתר הראשי</span>
                  <div className="mt-0.5"><Unlock size={20} className="text-green-400" /></div>
                </li>
              </ul>
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
                  const effectiveMax = getEffectiveMax(cloudData, item.dateStr);
                  const currentRegs = getCurrentRegistrations(cloudData, item.dateStr);
                  const availableSpots = getAvailableSpots(cloudData, item.dateStr);
                  const isUsingGlobal = usesGlobalMax(cloudData, item.dateStr);
                  const isEditing = editingTourMax === item.dateStr;
                  const isFull = currentRegs >= effectiveMax;
                  
                  return (
                    <div
                      key={i}
                      className={`bg-brand-dark border rounded-2xl p-6 hover:border-brand-gold/30 transition-all ${
                        isFull && status.status === 'available' ? 'border-red-500/50' : 'border-white/10'
                      }`}
                    >
                      <div className="flex flex-col gap-4">
                        {/* Top Row: Date Info, Status, Actions */}
                        <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                          {/* Action Buttons */}
                          <div className="flex gap-3 md:w-1/3 justify-end order-last md:order-none">
                            <button
                              onClick={() => toggleBlocked(item.dateStr)}
                              disabled={saving}
                              className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-bold transition-all ${
                                status.status === 'blocked'
                                  ? 'bg-gray-500 text-white shadow-lg'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 hover:bg-gray-500/30'
                              } disabled:opacity-50`}
                            >
                              <span>{status.status === 'blocked' ? 'בטל חסימה' : 'חסום'}</span>
                              {status.status === 'blocked' ? <Lock size={16} /> : <Unlock size={16} />}
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
                              <span>{status.status === 'soldOut' ? 'פנה מקום' : 'אזל'}</span>
                              {status.status === 'soldOut' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </button>
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
                        </div>

                        {/* Bottom Row: Capacity Display */}
                        {status.status !== 'blocked' && (
                          <div className="border-t border-white/10 pt-4">
                            <div className="flex flex-col md:flex-row-reverse items-center justify-between gap-4">
                              {/* Capacity Edit Controls */}
                              <div className="flex items-center gap-3">
                                {isEditing ? (
                                  <>
                                    <button
                                      onClick={() => setTempTourMax(Math.max(1, tempTourMax - 1))}
                                      className="bg-brand-dark-lighter text-white w-8 h-8 rounded-full flex items-center justify-center border border-white/20 hover:border-brand-gold"
                                      disabled={saving}
                                    >
                                      <Minus size={14} />
                                    </button>
                                    
                                    <input
                                      type="number"
                                      value={tempTourMax}
                                      onChange={(e) => setTempTourMax(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                                      className="w-16 text-center text-xl font-bold bg-brand-dark-lighter text-brand-gold border border-brand-gold/50 rounded-xl py-1 outline-none"
                                      min="1"
                                      max="100"
                                    />
                                    
                                    <button
                                      onClick={() => setTempTourMax(Math.min(100, tempTourMax + 1))}
                                      className="bg-brand-dark-lighter text-white w-8 h-8 rounded-full flex items-center justify-center border border-white/20 hover:border-brand-gold"
                                      disabled={saving}
                                    >
                                      <Plus size={14} />
                                    </button>
                                    
                                    <button
                                      onClick={() => saveTourMax(item.dateStr, false, tempTourMax)}
                                      disabled={saving}
                                      className="bg-brand-gold text-brand-dark px-4 py-2 rounded-full text-sm font-bold hover:scale-105 transition-all disabled:opacity-50"
                                    >
                                      שמור
                                    </button>
                                    
                                    <button
                                      onClick={() => setEditingTourMax(null)}
                                      className="text-gray-400 hover:text-white px-3 py-2 text-sm"
                                    >
                                      ביטול
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditingTourMax(item.dateStr)}
                                      className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-500/30 transition-all border border-blue-500/30"
                                    >
                                      <Edit2 size={14} />
                                      <span>ערוך קיבולת</span>
                                    </button>
                                    
                                    {!isUsingGlobal && (
                                      <button
                                        onClick={() => resetToGlobalMax(item.dateStr)}
                                        className="flex items-center gap-2 text-gray-400 hover:text-white px-3 py-2 text-sm transition-all"
                                        title="חזור לקיבולת כללית"
                                      >
                                        <RotateCcw size={14} />
                                        <span>חזור לכללי</span>
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Capacity Display */}
                              <div className="flex items-center gap-4">
                                {/* Progress Bar */}
                                <div className="w-32 h-3 bg-brand-dark-lighter rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      isFull ? 'bg-red-500' : currentRegs > effectiveMax * 0.7 ? 'bg-yellow-500' : 'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(100, (currentRegs / effectiveMax) * 100)}%` }}
                                  />
                                </div>
                                
                                {/* Numbers */}
                                <div className="flex items-center gap-2">
                                  <span className={`text-2xl font-black ${isFull ? 'text-red-400' : 'text-brand-gold'}`}>
                                    {currentRegs}
                                  </span>
                                  <span className="text-gray-400">/</span>
                                  <span className="text-xl font-bold text-white">{effectiveMax}</span>
                                </div>
                                
                                {/* Type Badge */}
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  isUsingGlobal 
                                    ? 'bg-gray-500/20 text-gray-400' 
                                    : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {isUsingGlobal ? 'כללי' : 'מותאם'}
                                </span>
                                
                                {/* Full Badge */}
                                {isFull && status.status === 'available' && (
                                  <span className="bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                                    מלא!
                                  </span>
                                )}
                              </div>

                              {/* Available Spots */}
                              <div className="text-right">
                                <span className="text-sm text-gray-400">מקומות פנויים: </span>
                                <span className={`font-bold ${availableSpots > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {availableSpots}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
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
              <br />
              <code className="text-blue-400">artifacts/{APP_ID}/public/data/tourDates/[date]</code>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Admin;

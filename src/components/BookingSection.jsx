import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { doc, getDoc } from 'firebase/firestore';
import { db, APP_ID } from '../utils/firebase';
import { ChevronLeft, ChevronRight, Plus, Minus, Users, Calendar, MessageCircle, XCircle } from '../utils/icons';
import { useFirebaseData, getEffectiveMax, getCurrentRegistrations, getAvailableSpots } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, isThursday, getNearestThursday, formatDateHebrew } from '../utils/dateUtils';

const PRICE_PER_PERSON = 250;

const BookingSection = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState('');
  const [participants, setParticipants] = useState(1);
  const [isChecking, setIsChecking] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, title: '', message: '', whatsappUrl: '' });
  
  const cloudData = useFirebaseData();
  const scrollContainerRef = useRef(null);

  const thursdays = useMemo(() => getUpcomingThursdays(9), []);

  // Get status for a date (blocked, soldOut, or available)
  const getStatus = (dateStr) => {
    if (!cloudData) {
      return { text: t('common.loading'), color: 'text-gray-500', available: false };
    }
    if (cloudData.blocked?.includes(dateStr)) {
      return { text: t('bookingSection.blocked'), color: 'text-gray-500', available: false };
    }
    if (cloudData.soldOut?.includes(dateStr)) {
      return { text: t('bookingSection.soldOut'), color: 'text-red-500', available: false };
    }
    
    // Check capacity
    const availableSpots = getAvailableSpots(cloudData, dateStr);
    if (availableSpots <= 0) {
      return { text: t('bookingSection.soldOut'), color: 'text-red-500', available: false };
    }
    
    return { text: t('bookingSection.available'), color: 'text-green-400', available: true, spots: availableSpots };
  };

  // Get capacity info for selected date
  const selectedDateCapacity = useMemo(() => {
    if (!selectedDate || !cloudData) return null;
    
    const effectiveMax = getEffectiveMax(cloudData, selectedDate);
    const currentRegs = getCurrentRegistrations(cloudData, selectedDate);
    const available = Math.max(0, effectiveMax - currentRegs);
    
    return {
      max: effectiveMax,
      current: currentRegs,
      available: available
    };
  }, [selectedDate, cloudData]);

  const scrollDates = (direction) => {
    if (scrollContainerRef.current) {
      // In RTL, we reverse the scroll direction
      const move = direction === 'left' ? 300 : -300;
      scrollContainerRef.current.scrollBy({ left: move, behavior: 'smooth' });
    }
  };

  const handleThursdayCorrection = () => {
    const nearestThursday = getNearestThursday(selectedDate);
    setSelectedDate(nearestThursday.toLocaleDateString('en-CA'));
  };

  // Handle continue to booking - with capacity check
  const handleContinueToBooking = async () => {
    if (!selectedDate || participants < 1) return;
    
    setIsChecking(true);
    
    try {
      // Fresh fetch from Firebase to get latest data
      const tourDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'tourDates', selectedDate);
      const globalDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'settings', 'global');
      
      const [tourDoc, globalDoc] = await Promise.all([
        getDoc(tourDocRef),
        getDoc(globalDocRef)
      ]);
      
      const globalData = globalDoc.exists() ? globalDoc.data() : { globalMaxParticipants: 30 };
      const tourData = tourDoc.exists() ? tourDoc.data() : { useGlobalMax: true, currentRegistrations: 0 };
      
      const globalMax = globalData.globalMaxParticipants || 30;
      const effectiveMax = tourData.useGlobalMax ? globalMax : (tourData.customMax || globalMax);
      const currentRegistrations = tourData.currentRegistrations || 0;
      const availableSpots = effectiveMax - currentRegistrations;
      
      // Also check if date is blocked or sold out
      const blocked = globalData.blocked || [];
      const soldOut = globalData.soldOut || [];
      
      if (blocked.includes(selectedDate)) {
        showNoSpotsError(selectedDate, participants, 0, 'התאריך חסום להרשמה');
        return;
      }
      
      if (soldOut.includes(selectedDate)) {
        showNoSpotsError(selectedDate, participants, 0, 'אזל המקום לתאריך זה');
        return;
      }
      
      // Check if enough spots available
      if (participants > availableSpots) {
        showNoSpotsError(selectedDate, participants, availableSpots);
      } else {
        // Enough spots - navigate to booking form with pre-filled data
        navigateToBookingForm(selectedDate, participants);
      }
      
    } catch (error) {
      console.error('Error checking capacity:', error);
      alert('שגיאה בבדיקת זמינות. אנא נסה שוב.');
    } finally {
      setIsChecking(false);
    }
  };

  // Show error modal when not enough spots
  const showNoSpotsError = (date, requestedParticipants, availableSpots, customMessage = null) => {
    const formattedDate = formatDateHebrew(date);
    
    // Create WhatsApp message
    const whatsappMessage = encodeURIComponent(
      `שלום חיליק,\n\n` +
      `ניסיתי לרשום ${requestedParticipants} אנשים לסיור בתאריך ${formattedDate} ` +
      `אך אין מספיק מקומות פנויים.\n\n` +
      `נותרו ${availableSpots} מקומות בלבד.\n\n` +
      `האם ניתן לסייע?\n\n` +
      `תודה!`
    );
    
    const whatsappUrl = `https://wa.me/972505804367?text=${whatsappMessage}`;
    
    const message = customMessage || 
      (availableSpots > 0 
        ? `מצטערים, אין מספיק מקומות פנויים לתאריך ${formattedDate}.\n\nביקשת: ${requestedParticipants} מקומות\nפנויים: ${availableSpots} מקומות בלבד`
        : `מצטערים, אין מקומות פנויים לתאריך ${formattedDate}.`);
    
    setErrorModal({
      show: true,
      title: 'אין מקומות פנויים',
      message,
      whatsappUrl
    });
  };

  // Navigate to booking form with pre-filled data
  const navigateToBookingForm = (date, numParticipants) => {
    window.history.pushState({}, '', `/booking?date=${date}&participants=${numParticipants}`);
    window.location.href = `/booking?date=${date}&participants=${numParticipants}`;
  };

  const totalPrice = participants * PRICE_PER_PERSON;
  const canContinue = selectedDate && 
    isThursday(selectedDate) && 
    getStatus(selectedDate).available && 
    participants > 0 && 
    selectedDateCapacity && 
    participants <= selectedDateCapacity.available;

  return (
    <section id="date-selection" className="py-32 max-w-5xl mx-auto px-6 text-center">
      <div className="bg-brand-dark-lighter p-8 md:p-16 rounded-5xl md:rounded-7xl border border-white/5 shadow-2xl relative overflow-hidden">
        
        {/* Title */}
        <h2 className="text-4xl md:text-6xl font-bold text-brand-gold font-serif mb-4 text-center">
          {t('bookingSection.title')}
        </h2>
        <p className="text-lg text-gray-300 mb-12 text-center font-light">
          {t('bookingSection.subtitle')}
        </p>
        
        {/* ============================================ */}
        {/* STEP 1: DATE SELECTION */}
        {/* ============================================ */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="bg-brand-gold text-brand-dark w-8 h-8 rounded-full flex items-center justify-center font-black text-lg">1</span>
            <h3 className="text-xl md:text-2xl font-bold text-white" dir="rtl">
              בחירת תאריך סיור
            </h3>
          </div>
          <p className="text-gray-400 text-sm mb-6" dir="rtl">
            הסיורים מתקיימים בימי חמישי בערב
          </p>
          
          {/* Date Cards Carousel */}
          <div className="relative group mx-auto">
            {/* Right Arrow */}
            <button 
              onClick={() => scrollDates('right')} 
              className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-10 bg-brand-gold text-black p-3 rounded-full shadow-2xl hover:bg-white transition-all"
              aria-label="גלול ימינה"
            >
              <ChevronRight size={24} />
            </button>
            
            {/* Dates Container */}
            <div 
              ref={scrollContainerRef} 
              className="dates-wrapper custom-scroll pb-6" 
              aria-live="polite"
            >
              {thursdays.map((item, i) => {
                const status = getStatus(item.dateStr);
                const active = selectedDate === item.dateStr;
                const isAvailable = status.available;
                
                return (
                  <div
                    key={i}
                    onClick={() => isAvailable && setSelectedDate(item.dateStr)}
                    className={`date-card h-40 md:h-44 border flex flex-col items-center justify-center transition-all text-center ${
                      !isAvailable 
                        ? 'bg-gray-800/50 border-gray-700 cursor-not-allowed opacity-60' 
                        : active 
                          ? 'bg-brand-gold text-black scale-110 shadow-inner cursor-pointer' 
                          : 'bg-brand-dark border-white/10 hover:border-brand-gold cursor-pointer'
                    }`}
                  >
                    <span className="text-[10px] font-black opacity-60 uppercase">
                      חמישי
                    </span>
                    <span className="text-4xl md:text-5xl font-black">
                      {item.day}
                    </span>
                    <span className="text-xs md:text-sm font-bold">
                      {item.month}
                    </span>
                    <div className={`mt-3 text-[9px] font-black uppercase ${status.color}`}>
                      {status.text}
                    </div>
                    {isAvailable && status.spots && (
                      <div className="text-[8px] text-gray-400 mt-1">
                        {status.spots} מקומות
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Left Arrow */}
            <button 
              onClick={() => scrollDates('left')} 
              className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-10 bg-brand-gold text-black p-3 rounded-full shadow-2xl hover:bg-white transition-all"
              aria-label="גלול שמאלה"
            >
              <ChevronLeft size={24} />
            </button>
          </div>
          
          {/* Date Picker Fallback */}
          <div className="mt-6">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)} 
              min={new Date().toISOString().split('T')[0]}
              className="w-full max-w-sm bg-brand-dark border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center font-bold text-lg mx-auto block shadow-inner" 
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Date Validation Messages */}
        {selectedDate && !isThursday(selectedDate) && (
          <div className="animate-in fade-in zoom-in duration-300 mb-8">
            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-md mx-auto">
              <p className="text-red-400 font-bold mb-4" dir="rtl">
                {t('bookingSection.thursdaysOnly')}
              </p>
              <button 
                onClick={handleThursdayCorrection} 
                className="bg-white text-black py-3 px-6 rounded-full font-bold text-sm hover:bg-brand-gold transition-all"
              >
                {t('bookingSection.nextThursday')}
              </button>
            </div>
          </div>
        )}

        {/* Selected Date Confirmation & Capacity Info */}
        {selectedDate && isThursday(selectedDate) && (
          <div className="animate-in fade-in duration-300 mb-8">
            {getStatus(selectedDate).available ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-3xl p-6 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <Calendar size={24} className="text-green-400" />
                  <p className="text-xl text-white font-bold" dir="rtl">
                    {formatDateHebrew(selectedDate)}
                  </p>
                </div>
                <p className="text-green-400 font-bold" dir="rtl">
                  ✓ תאריך זמין
                </p>
                {selectedDateCapacity && (
                  <p className="text-green-300 text-sm mt-2" dir="rtl">
                    נותרו {selectedDateCapacity.available} מקומות פנויים מתוך {selectedDateCapacity.max}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-3 mb-3">
                  <XCircle size={24} className="text-red-400" />
                  <p className="text-xl text-white font-bold" dir="rtl">
                    {formatDateHebrew(selectedDate)}
                  </p>
                </div>
                <p className="text-red-400 font-bold" dir="rtl">
                  ⚠️ תאריך זה אזל
                </p>
                <p className="text-red-300 text-sm mt-2" dir="rtl">
                  אנא בחר תאריך אחר
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 2: PARTICIPANTS SELECTION */}
        {/* ============================================ */}
        {selectedDate && isThursday(selectedDate) && getStatus(selectedDate).available && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="bg-brand-gold text-brand-dark w-8 h-8 rounded-full flex items-center justify-center font-black text-lg">2</span>
              <h3 className="text-xl md:text-2xl font-bold text-white" dir="rtl">
                מספר משתתפים
              </h3>
            </div>
            
            <div className="bg-brand-dark border border-white/10 rounded-3xl p-8 max-w-md mx-auto">
              {/* Participants Counter */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <button 
                  onClick={() => setParticipants(Math.max(1, participants - 1))}
                  disabled={participants <= 1}
                  className="bg-brand-dark-lighter text-white w-14 h-14 rounded-full text-3xl font-bold hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-white/20"
                >
                  <Minus size={24} />
                </button>
                
                <div className="text-center">
                  <input 
                    type="number"
                    value={participants}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                      setParticipants(val);
                    }}
                    className="w-24 text-center text-5xl font-black bg-transparent text-brand-gold border-b-4 border-brand-gold/50 focus:border-brand-gold outline-none"
                    min="1"
                    max="20"
                  />
                  <p className="text-gray-400 text-sm mt-2">משתתפים</p>
                </div>
                
                <button 
                  onClick={() => setParticipants(Math.min(selectedDateCapacity?.available || 20, participants + 1))}
                  disabled={participants >= (selectedDateCapacity?.available || 20)}
                  className="bg-brand-dark-lighter text-white w-14 h-14 rounded-full text-3xl font-bold hover:bg-brand-gold hover:text-brand-dark transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center border border-white/20"
                >
                  <Plus size={24} />
                </button>
              </div>
              
              {/* Price Display */}
              <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 mb-6">
                <div className="text-sm text-gray-300 mb-1" dir="rtl">סה"כ לתשלום</div>
                <div className="text-4xl font-black text-brand-gold">
                  ₪{totalPrice.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 mt-1" dir="rtl">
                  {participants} × ₪{PRICE_PER_PERSON} לאדם
                </div>
              </div>
              
              {/* Warning if requesting more than available */}
              {selectedDateCapacity && participants > selectedDateCapacity.available && (
                <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-2xl p-4 mb-6">
                  <p className="text-yellow-400 font-bold text-sm" dir="rtl">
                    ⚠️ מספר המשתתפים גדול ממספר המקומות הפנויים
                  </p>
                  <p className="text-yellow-300 text-xs mt-2" dir="rtl">
                    נותרו {selectedDateCapacity.available} מקומות בלבד
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* STEP 3: CONTINUE BUTTON */}
        {/* ============================================ */}
        {selectedDate && isThursday(selectedDate) && getStatus(selectedDate).available && participants > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-center gap-3 mb-6">
              <span className="bg-brand-gold text-brand-dark w-8 h-8 rounded-full flex items-center justify-center font-black text-lg">3</span>
              <h3 className="text-xl md:text-2xl font-bold text-white" dir="rtl">
                המשך להרשמה
              </h3>
            </div>
            
            <button 
              onClick={handleContinueToBooking}
              disabled={!canContinue || isChecking}
              className="bg-brand-gold text-brand-dark px-12 py-5 rounded-full font-black text-xl md:text-2xl shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isChecking ? (
                <span className="flex items-center gap-3">
                  <span className="animate-spin">⏳</span>
                  בודק זמינות...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  המשך להרשמה
                  <Users size={24} />
                </span>
              )}
            </button>
            
            <p className="text-gray-400 text-sm mt-4" dir="rtl">
              לאחר לחיצה, תועבר לטופס ההרשמה עם הפרטים שבחרת
            </p>
          </div>
        )}
      </div>

      {/* ============================================ */}
      {/* ERROR MODAL - No Available Spots */}
      {/* ============================================ */}
      {errorModal.show && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          onClick={() => setErrorModal({ show: false, title: '', message: '', whatsappUrl: '' })}
        >
          <div 
            className="bg-brand-dark-lighter border-2 border-red-500/50 rounded-3xl p-8 max-w-md w-full animate-in zoom-in duration-300"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setErrorModal({ show: false, title: '', message: '', whatsappUrl: '' })}
              className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
            >
              <XCircle size={28} />
            </button>
            
            {/* Error Icon */}
            <div className="text-6xl text-center mb-4">😔</div>
            
            {/* Title */}
            <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">
              {errorModal.title}
            </h3>
            
            {/* Message */}
            <p className="text-white text-center mb-6 whitespace-pre-line leading-relaxed">
              {errorModal.message}
            </p>
            
            {/* WhatsApp Option */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 mb-6">
              <p className="text-yellow-400 font-bold mb-2 text-center">
                💬 רוצה לנסות בכל זאת?
              </p>
              <p className="text-yellow-300 text-sm text-center">
                שלח הודעה לחיליק ב-WhatsApp ונראה מה אפשר לעשות
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              <a
                href={errorModal.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-4 rounded-full text-lg font-bold hover:bg-green-600 transition-all"
              >
                <MessageCircle size={20} />
                <span>שלח הודעה ב-WhatsApp</span>
              </a>
              
              <button
                onClick={() => {
                  setErrorModal({ show: false, title: '', message: '', whatsappUrl: '' });
                  setSelectedDate('');
                  setParticipants(1);
                }}
                className="bg-brand-dark border border-white/20 text-white px-6 py-3 rounded-full font-bold hover:bg-white/10 transition-all"
              >
                בחר תאריך אחר
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default BookingSection;

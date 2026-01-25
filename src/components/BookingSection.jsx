import { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from '../utils/icons';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { getUpcomingThursdays, isThursday, getNearestThursday, formatDateHebrew } from '../utils/dateUtils';
import { handleWhatsApp } from '../utils/whatsapp';

const BookingSection = () => {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState('');
  const cloudData = useFirebaseData();
  const scrollContainerRef = useRef(null);

  const thursdays = useMemo(() => getUpcomingThursdays(9), []);

  const getStatus = (dateStr) => {
    if (!cloudData) {
      return { text: t('common.loading'), color: 'text-gray-500' };
    }
    if (cloudData.blocked?.includes(dateStr)) {
      return { text: t('bookingSection.blocked'), color: 'text-gray-500' };
    }
    if (cloudData.soldOut?.includes(dateStr)) {
      return { text: t('bookingSection.soldOut'), color: 'text-red-500' };
    }
    return { text: t('bookingSection.available'), color: 'text-green-400' };
  };

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

  return (
    <section id="dates-anchor" className="py-32 max-w-5xl mx-auto px-6 text-center text-right">
      <div className="bg-brand-dark-lighter p-8 md:p-24 rounded-5xl md:rounded-7xl border border-white/5 shadow-2xl relative overflow-hidden text-center">
        <h2 className="text-4xl md:text-7xl font-bold text-brand-gold font-serif mb-8 text-center">
          {t('bookingSection.title')}
        </h2>
        <p className="text-lg text-gray-300 mb-12 text-center font-light">
          {t('bookingSection.subtitle')}
        </p>
        
        <div className="relative group mx-auto text-center">
          {/* Right Arrow (in RTL, right = previous) */}
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
            className="dates-wrapper custom-scroll pb-12 text-center" 
            aria-live="polite"
          >
            {thursdays.map((item, i) => {
              const status = getStatus(item.dateStr);
              const active = selectedDate === item.dateStr;
              
              return (
                <div
                  key={i}
                  onClick={() => setSelectedDate(item.dateStr)}
                  className={`date-card h-44 md:h-48 border flex flex-col items-center justify-center transition-all cursor-pointer text-center ${
                    active 
                      ? 'bg-brand-gold text-black scale-110 shadow-inner' 
                      : 'bg-brand-dark border-white/10 hover:border-brand-gold'
                  }`}
                >
                  <span className="text-[10px] font-black opacity-60 uppercase text-center">
                    חמישי
                  </span>
                  <span className="text-4xl md:text-5xl font-black text-center">
                    {item.day}
                  </span>
                  <span className="text-xs md:text-sm font-bold text-center">
                    {item.month}
                  </span>
                  <div className={`mt-4 text-[9px] font-black uppercase text-center ${status.color}`}>
                    {status.text}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Left Arrow (in RTL, left = next) */}
          <button 
            onClick={() => scrollDates('left')} 
            className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-10 bg-brand-gold text-black p-3 rounded-full shadow-2xl hover:bg-white transition-all"
            aria-label="גלול שמאלה"
          >
            <ChevronLeft size={24} />
          </button>
        </div>
        
        <div className="mt-8 flex flex-col items-center text-center">
          {selectedDate && (
            <div className="animate-in fade-in zoom-in duration-500 mb-6 text-center">
              {!isThursday(selectedDate) ? (
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl max-w-md mx-auto text-center">
                  <p className="text-red-400 font-bold mb-4 text-center">
                    {t('bookingSection.thursdaysOnly')}
                  </p>
                  <div className="flex flex-col gap-3 text-center">
                    <button 
                      onClick={handleThursdayCorrection} 
                      className="bg-white text-black py-3 px-6 rounded-full font-bold text-sm hover:bg-brand-gold transition-all text-center"
                    >
                      {t('bookingSection.nextThursday')}
                    </button>
                    <button 
                      onClick={() => handleWhatsApp(null, true)} 
                      className="border border-white/20 text-white py-3 px-6 rounded-full font-bold text-sm hover:bg-white hover:text-black transition-all text-center"
                    >
                      {t('bookingSection.privateTour')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-xl md:text-2xl text-white mb-6 font-serif italic font-bold">
                    {t('bookingSection.selectDate')}: {formatDateHebrew(selectedDate)}
                  </p>
                  <button 
                    onClick={() => {
                      window.history.pushState({}, '', '/booking');
                      window.location.href = '/booking';
                    }} 
                    className="bg-brand-gold text-brand-dark px-10 md:px-14 py-4 rounded-full font-black text-xl md:text-2xl shadow-xl hover:scale-105 transition-all text-center"
                  >
                    {t('bookingSection.registerNow')}
                  </button>
                </div>
              )}
            </div>
          )}
          
          <input 
            type="date" 
            value={selectedDate} 
            onChange={(e) => setSelectedDate(e.target.value)} 
            className="w-full max-w-sm bg-brand-dark border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-brand-gold text-center font-bold text-lg mx-auto block shadow-inner" 
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>
    </section>
  );
};

export default BookingSection;

import { useState } from 'react';
import { ArrowUp, Phone, MessageCircle, XCircle } from '../utils/icons';

const Terms = () => {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    window.history.back();
  };

  const handlePaymentClick = (method) => {
    setSelectedPaymentMethod(method);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPaymentMethod(null);
  };

  const getPaymentInstructions = () => {
    switch (selectedPaymentMethod) {
      case 'bit':
        return {
          title: 'תשלום ב-Bit',
          icon: '💳',
          instructions: [
            'העבר 250 ₪ (לכל משתתף) לטלפון:',
            '050-580-4367',
            'שם: חיליק רוזנברג',
            'לאחר התשלום, שלח צילום מסך של האישור בוואטסאפ'
          ]
        };
      case 'credit':
        return {
          title: 'תשלום בכרטיס אשראי',
          icon: '💳',
          instructions: [
            'לתשלום בכרטיס אשראי, אנא צור קשר:',
            'טלפון: 050-580-4367',
            'WhatsApp: 050-580-4367',
            'נשלח לך קישור תשלום מאובטח'
          ]
        };
      case 'bank':
        return {
          title: 'העברה בנקאית',
          icon: '🏦',
          instructions: [
            'פרטי חשבון הבנק:',
            'בנק: [שם הבנק]',
            'מספר חשבון: [מספר חשבון]',
            'מספר סניף: [מספר סניף]',
            'שם המוטב: חיליק רוזנברג',
            '',
            'לאחר ההעברה, שלח אישור בוואטסאפ: 050-580-4367'
          ]
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Header */}
      <header className="bg-brand-dark-lighter border-b border-white/10 px-6 py-6 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <a href="/" className="text-2xl md:text-3xl font-black text-brand-gold font-serif tracking-tighter">
            חיליק רוזנברג | סיורים בבני ברק
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif text-brand-gold font-bold mb-4">
            תנאי שימוש ותקנון
          </h1>
          <p className="text-xl text-gray-400">
            נא לקרוא בעיון לפני ביצוע הזמנה
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Section 1: כללי */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              1. כללי
            </h2>
            <ul className="space-y-3 text-gray-300 text-right">
              <li className="flex items-start gap-3 justify-end">
                <span>הסיורים מתקיימים בימי חמישי בערב</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>משך הסיור: בין 2.5 ל-3 שעות</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>המחיר כולל את כל האוכל, משקאות, אלכוהול ופינוקים</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
            </ul>
          </section>

          {/* Section 2: תשלום */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              2. תשלום
            </h2>
            <div className="space-y-4 text-right mb-6">
              <p className="text-gray-300 text-right">
                • התשלום מבוצע מראש
              </p>
              <p className="text-gray-300 text-right">
                • המחיר: <span className="text-brand-gold font-bold text-xl">250 ש"ח</span> לאדם
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-bold text-white mb-3 text-right">בחר אמצעי תשלום:</p>
              
              <button
                onClick={() => handlePaymentClick('bit')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex items-center justify-between group"
              >
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">לחץ לפרטי תשלום →</span>
                <span className="text-lg font-bold">Bit 💳</span>
              </button>
              
              <button
                onClick={() => handlePaymentClick('credit')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex items-center justify-between group"
              >
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">לחץ לפרטי תשלום →</span>
                <span className="text-lg font-bold">כרטיס אשראי 💳</span>
              </button>
              
              <button
                onClick={() => handlePaymentClick('bank')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex items-center justify-between group"
              >
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">לחץ לפרטי תשלום →</span>
                <span className="text-lg font-bold">העברה בנקאית 🏦</span>
              </button>
            </div>
          </section>

          {/* Section 3: מדיניות ביטולים - IMPORTANT */}
          <section className="bg-red-500/5 border-2 border-red-500/30 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              3. מדיניות ביטולים ⚠️
            </h2>
            <div className="space-y-4 text-right">
              <div className="bg-brand-dark border border-green-500/30 rounded-2xl p-6">
                <p className="text-green-400 font-bold text-lg mb-2">
                  ✓ ביטול עד 7 ימים לפני מועד הסיור
                </p>
                <p className="text-gray-300">
                  ללא עלות - החזר מלא של התשלום
                </p>
              </div>

              <div className="bg-brand-dark border border-yellow-500/30 rounded-2xl p-6">
                <p className="text-yellow-400 font-bold text-lg mb-2">
                  ⚠️ ביטול בין 7 ימים לבין 48 שעות לפני הסיור
                </p>
                <p className="text-gray-300">
                  החזר של 50% מסכום התשלום
                </p>
              </div>

              <div className="bg-brand-dark border border-red-500/30 rounded-2xl p-6">
                <p className="text-red-400 font-bold text-lg mb-2">
                  ✗ ביטול פחות מ-48 שעות לפני הסיור
                </p>
                <p className="text-gray-300">
                  ללא החזר כספי
                </p>
              </div>

              <div className="bg-brand-dark border border-blue-500/30 rounded-2xl p-6 mt-4">
                <p className="text-blue-400 font-bold text-lg mb-2">
                  🔄 אפשרות דחייה
                </p>
                <p className="text-gray-300">
                  בכל מקרה של ביטול, ניתן לדחות את הסיור למועד אחר ללא עלות נוספת (בכפוף לזמינות)
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: מתאים לכל הגילאים */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              4. מתאים לכל הגילאים
            </h2>
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-right">
              <div className="space-y-3">
                <p className="text-green-400 font-bold text-lg">
                  👨‍👩‍👧‍👦 הסיור מתאים לכל גיל!
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-3 justify-end">
                    <span>אמהות מוזמנות להגיע גם עם תינוקות</span>
                    <div className="text-green-400 mt-1">👶</div>
                  </li>
                  <li className="flex items-start gap-3 justify-end">
                    <span>משפחות עם ילדים - מוזמנים בברכה!</span>
                    <div className="text-green-400 mt-1">👨‍👩‍👧‍👦</div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: אחריות */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              5. אחריות
            </h2>
            <ul className="space-y-3 text-gray-300 text-right">
              <li className="flex items-start gap-3 justify-end">
                <span>המשתתפים אחראים על עצמם במהלך הסיור</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>מארגן הסיור אינו אחראי לחפצי ערך או לנזקים אישיים</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
            </ul>
          </section>

          {/* Section 6: פרטיות */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              6. פרטיות ואבטחת מידע
            </h2>
            <ul className="space-y-3 text-gray-300 text-right">
              <li className="flex items-start gap-3 justify-end">
                <span>הפרטים האישיים נשמרים במאובטח ולא יועברו לצדדים שלישיים</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>השימוש בפרטים הוא לצורך ניהול ההזמנה בלבד</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>המידע מאוחסן בשרתי Firebase המאובטחים</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
            </ul>
          </section>

          {/* Section 7: יצירת קשר */}
          <section className="bg-brand-gold/10 border-2 border-brand-gold/30 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-center">
              יצירת קשר
            </h2>
            <div className="text-center space-y-4">
              <p className="text-xl text-white font-bold">
                לשאלות בנוגע לתנאי השימוש:
              </p>
              <div>
                <p className="text-lg text-white font-bold mb-2">חיליק רוזנברג</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <a 
                  href="tel:0505804367" 
                  className="text-brand-gold hover:text-brand-gold/80 font-bold text-xl transition-colors"
                  dir="ltr"
                >
                  050-580-4367
                </a>
                <Phone size={20} className="text-brand-gold" />
              </div>
              <div>
                <a 
                  href="https://wa.me/972505804367?text=שלום, יש לי שאלה בנוגע לתנאי השימוש" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-green-700 transition-all"
                >
                  <MessageCircle size={18} />
                  <span>שלח הודעת WhatsApp</span>
                </a>
              </div>
            </div>
          </section>

          {/* Last Updated */}
          <div className="text-center text-sm text-gray-500 py-6">
            <p>עדכון אחרון: ינואר 2026</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={goBack}
            className="bg-brand-gold text-brand-dark px-12 py-4 rounded-full font-black text-lg hover:scale-105 transition-all"
          >
            חזרה לטופס הרשמה
          </button>
          
          <button
            onClick={scrollToTop}
            className="bg-transparent border-2 border-white/20 text-white px-12 py-4 rounded-full font-bold text-lg hover:border-brand-gold hover:text-brand-gold transition-all flex items-center justify-center gap-2"
          >
            <ArrowUp size={20} />
            חזרה למעלה
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs text-gray-500 tracking-widest">
            © 2026 כל הזכויות שמורות - חיליק רוזנברג | סיורים בבני ברק
          </p>
        </div>
      </footer>

      {/* Payment Instructions Modal */}
      {showPaymentModal && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-6"
          onClick={closePaymentModal}
        >
          <div 
            className="bg-brand-dark border-2 border-brand-gold rounded-3xl p-8 max-w-md w-full relative animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePaymentModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
              aria-label="סגור"
            >
              <XCircle size={32} />
            </button>

            {getPaymentInstructions() && (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-4">{getPaymentInstructions().icon}</div>
                  <h3 className="text-2xl font-bold text-brand-gold font-serif">
                    {getPaymentInstructions().title}
                  </h3>
                </div>

                <div className="space-y-3 text-right bg-brand-dark-lighter rounded-2xl p-6 border border-white/10">
                  {getPaymentInstructions().instructions.map((instruction, index) => (
                    <p 
                      key={index} 
                      className={`${
                        instruction.includes('050-580-4367') || instruction.includes('חיליק רוזנברג')
                          ? 'text-brand-gold font-bold text-xl'
                          : instruction === ''
                          ? 'h-2'
                          : 'text-gray-300'
                      }`}
                    >
                      {instruction}
                    </p>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <a
                    href="https://wa.me/972505804367?text=שלום, אני מעוניין/ת בפרטי תשלום לסיור"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 text-white px-6 py-4 rounded-full font-bold text-center hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={20} />
                    <span>פתח שיחה בוואטסאפ</span>
                  </a>
                  
                  <button
                    onClick={closePaymentModal}
                    className="border-2 border-white/20 text-white px-6 py-4 rounded-full font-bold hover:border-brand-gold hover:text-brand-gold transition-all"
                  >
                    סגור
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Terms;

import { useState } from 'react';
import { ArrowUp, Phone, MessageCircle, XCircle } from '../utils/icons';
import { useTranslation } from 'react-i18next';

const Terms = () => {
  const { t } = useTranslation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToDateSelection = () => {
    window.location.href = '/#date-selection';
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
          title: t('terms.paymentModal.bit.title'),
          icon: '💳',
          instructions: [
            t('terms.paymentModal.bit.line1'),
            t('terms.paymentModal.bit.phone'),
            t('terms.paymentModal.bit.name'),
            t('terms.paymentModal.bit.line4')
          ]
        };
      case 'credit':
        return {
          title: t('terms.paymentModal.credit.title'),
          icon: '💳',
          instructions: [
            t('terms.paymentModal.credit.line1'),
            t('terms.paymentModal.credit.phone'),
            t('terms.paymentModal.credit.whatsapp'),
            t('terms.paymentModal.credit.line4')
          ]
        };
      case 'bank':
        return {
          title: t('terms.paymentModal.bank.title'),
          icon: '🏦',
          instructions: [
            t('terms.paymentModal.bank.details'),
            t('terms.paymentModal.bank.bankName'),
            t('terms.paymentModal.bank.accountNumber'),
            t('terms.paymentModal.bank.branchNumber'),
            t('terms.paymentModal.bank.beneficiary'),
            '',
            t('terms.paymentModal.bank.confirmation')
          ]
        };
      default:
        return null;
    }
  };

  // RTL List Item Component - bullet on RIGHT
  const RtlListItem = ({ children, icon = '•', iconColor = 'text-brand-gold' }) => (
    <div className="text-right" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
      <span className="text-gray-300">{children}</span>
      <span className={`${iconColor} mr-2`}> {icon}</span>
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-brand-dark text-white" style={{ direction: 'rtl' }}>
      {/* Header */}
      <header className="bg-brand-dark-lighter border-b border-white/10 px-6 py-6 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto text-right">
          <a href="/" className="text-2xl md:text-3xl font-black text-brand-gold font-serif tracking-tighter">
            {t('header.title')}
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main dir="rtl" className="max-w-4xl mx-auto px-6 py-12" style={{ direction: 'rtl', textAlign: 'right' }}>
        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-serif text-brand-gold font-bold mb-4">
            {t('terms.title')}
          </h1>
          <p className="text-xl text-gray-400">
            {t('terms.subtitle')}
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* AGE RESTRICTION - PROMINENT WARNING */}
          <section className="bg-red-500/20 border-2 border-red-500/50 rounded-3xl p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-serif text-red-400 font-bold mb-4">
                תנאי לרכישה ולהשתתפות בסיור
              </h2>
              <div className="bg-brand-dark border border-red-500/30 rounded-2xl p-6 space-y-3">
                <p className="text-xl text-white font-bold text-right" dir="rtl">
                  הרוכש והמשתתף חייבים להיות בגיל 18 שנים ומעלה 🔞
                </p>
                <p className="text-gray-300 text-right" dir="rtl">
                  רכישת כרטיסים והשתתפות בסיור מאשרת שהנך בגיל 18 ומעלה.
                </p>
              </div>
            </div>
          </section>

          {/* Section 1: כללי */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right" dir="rtl">
              כללי .1
            </h2>
            <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
              <p className="text-gray-300 text-right" dir="rtl">{t('terms.section1.tours')} <span className="text-brand-gold">•</span></p>
              <p className="text-gray-300 text-right" dir="rtl">{t('terms.section1.duration')} <span className="text-brand-gold">•</span></p>
              <p className="text-gray-300 text-right" dir="rtl">{t('terms.section1.includes')} <span className="text-brand-gold">•</span></p>
            </div>
          </section>

          {/* Section 2: תשלום */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right" dir="rtl">
              תשלום .2
            </h2>
            <div className="space-y-4 mb-6" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
              <p className="text-gray-300 text-right" dir="rtl">
                {t('terms.section2.prepayment')} <span className="text-brand-gold">•</span>
              </p>
              <p className="text-gray-300 text-right" dir="rtl">
                {t('terms.section2.price')}: <span className="text-brand-gold font-bold text-xl">{t('terms.section2.priceAmount')}</span> {t('terms.section2.perPerson')} <span className="text-brand-gold">•</span>
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-bold text-white mb-3 text-right" dir="rtl">{t('terms.section2.selectMethod')}</p>
              
              <button
                onClick={() => handlePaymentClick('bit')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex flex-row-reverse items-center justify-between group"
              >
                <span className="text-lg font-bold">💳 {t('terms.section2.bit')}</span>
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">← {t('terms.section2.clickForDetails')}</span>
              </button>
              
              <button
                onClick={() => handlePaymentClick('credit')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex flex-row-reverse items-center justify-between group"
              >
                <span className="text-lg font-bold">💳 {t('terms.section2.credit')}</span>
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">← {t('terms.section2.clickForDetails')}</span>
              </button>
              
              <button
                onClick={() => handlePaymentClick('bank')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex flex-row-reverse items-center justify-between group"
              >
                <span className="text-lg font-bold">🏦 {t('terms.section2.bank')}</span>
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">← {t('terms.section2.clickForDetails')}</span>
              </button>
            </div>
          </section>

          {/* Section 3: מדיניות ביטול רכישה */}
          <section className="bg-red-500/5 border-2 border-red-500/30 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right" dir="rtl">
              ⚠️ מדיניות ביטול רכישה .3
            </h2>
            
            {/* 3.1 - תקופות ביטול והחזר כספי */}
            <div className="mb-6">
              <h3 className="text-lg font-bold text-white mb-4 text-right" dir="rtl">תקופות ביטול והחזר כספי :1</h3>
              <div className="space-y-4">
                <div className="bg-brand-dark border border-green-500/30 rounded-2xl p-4">
                  <p className="text-green-400 font-bold text-right" dir="rtl">
                    ביטול עד 7 ימים לפני מועד הסיור - החזר כספי מלא (100%) ✓
                  </p>
                </div>
                <div className="bg-brand-dark border border-yellow-500/30 rounded-2xl p-4">
                  <p className="text-yellow-400 font-bold text-right" dir="rtl">
                    ביטול בין 7 ימים ל-48 שעות לפני הסיור - החזר של 50% ⚠️
                  </p>
                </div>
                <div className="bg-brand-dark border border-red-500/30 rounded-2xl p-4">
                  <p className="text-red-400 font-bold text-right" dir="rtl">
                    ביטול פחות מ-48 שעות לפני הסיור - ללא החזר כספי ✗
                  </p>
                </div>
                <div className="bg-brand-dark border border-blue-500/30 rounded-2xl p-4">
                  <p className="text-blue-400 font-bold text-right" dir="rtl">
                    בכל מקרה של ביטול - ניתן לדחות את הסיור למועד אחר ללא עלות נוספת (בכפוף לזמינות) 🔄
                  </p>
                </div>
              </div>
            </div>

            {/* 3.2 - איך לבטל הזמנה */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">איך לבטל הזמנה :2</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl"><strong>ביטול ההזמנה חייב להיעשות בהודעה בכתב בלבד</strong> <span className="text-brand-gold">📝</span></p>
                <p className="text-gray-300 text-right" dir="rtl">דרכי יצירת קשר לביטול: <span className="text-brand-gold">📞</span></p>
                <p className="text-brand-gold text-right pr-6" dir="rtl">WhatsApp: 0505804367 <span className="text-green-500">💬</span></p>
                <p className="text-brand-gold text-right pr-6" dir="rtl">דוא"ל: hr20192022@gmail.com <span className="text-brand-gold">✉️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">יש לציין בבקשת הביטול: <strong>מספר ההזמנה, תאריך הסיור, שם המזמין</strong> <span className="text-brand-gold">📋</span></p>
                <p className="text-gray-300 text-right" dir="rtl">תקבל/י אישור על הביטול בתוך 24 שעות <span className="text-brand-gold">⏰</span></p>
              </div>
            </div>

            {/* 3.3 - תהליך החזר כספי */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">תהליך החזר כספי :3</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">החזר כספי יבוצע תוך <strong>14 ימי עסקים</strong> ממועד אישור הביטול <span className="text-brand-gold">💰</span></p>
                <p className="text-gray-300 text-right" dir="rtl">ההחזר יבוצע לאותו אמצעי תשלום בו בוצעה התשלום המקורי <span className="text-brand-gold">🔄</span></p>
                <p className="text-gray-300 text-right" dir="rtl">במקרה של תשלום בביט - ההחזר יבוצע לאותו מספר טלפון <span className="text-brand-gold">📱</span></p>
                <p className="text-gray-300 text-right" dir="rtl">במקרה של תשלום באשראי - ההחזר יזוכה לכרטיס האשראי <span className="text-brand-gold">💳</span></p>
              </div>
            </div>

            {/* 3.4 - דחיית סיור למועד אחר */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-blue-400 mb-4 text-right" dir="rtl">דחיית סיור למועד אחר :4</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">ניתן לבקש דחייה במקום ביטול <strong>ללא עלות נוספת</strong> <span className="text-blue-400">✓</span></p>
                <p className="text-gray-300 text-right" dir="rtl">הדחייה כפופה לזמינות במועדים עתידיים <span className="text-blue-400">📅</span></p>
                <p className="text-gray-300 text-right" dir="rtl">הדחייה חייבת להתבקש <strong>לפחות 48 שעות</strong> לפני מועד הסיור המקורי <span className="text-blue-400">⏰</span></p>
              </div>
            </div>
          </section>

          {/* Section 4: מדיניות אספקת השירות */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right" dir="rtl">
              📋 מדיניות אספקת השירות .4
            </h2>
            
            {/* 4.1 - מועדי הסיורים */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">מועדי הסיורים :1</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">הסיורים מתקיימים <strong>בימי חמישי בלבד</strong> <span className="text-brand-gold">📅</span></p>
                <p className="text-gray-300 text-right" dir="rtl">השעה המדויקת של תחילת הסיור תישלח במייל אישור ההזמנה <span className="text-brand-gold">⏰</span></p>
                <p className="text-gray-300 text-right" dir="rtl">מומלץ להגיע <strong>10 דקות לפני</strong> שעת תחילת הסיור <span className="text-brand-gold">⏱️</span></p>
              </div>
            </div>

            {/* 4.2 - נקודת מפגש */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">נקודת מפגש :2</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">נקודת המפגש משתנה בהתאם לסיור הספציפי <span className="text-brand-gold">📍</span></p>
                <p className="text-gray-300 text-right" dir="rtl">פרטי נקודת המפגש המדויקת (כתובת וכיוונים) יישלחו במייל אישור <span className="text-brand-gold">✉️</span></p>
                <p className="text-gray-300 text-right" dir="rtl"><strong>שבוע לפני הסיור</strong> - תישלח תזכורת עם כל הפרטים לנקודת המפגש <span className="text-brand-gold">📧</span></p>
                <p className="text-gray-300 text-right" dir="rtl"><strong>יום לפני הסיור</strong> - תתקבל תזכורת SMS/WhatsApp נוספת <span className="text-green-500">💬</span></p>
              </div>
            </div>

            {/* 4.3 - משך הסיור */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">משך הסיור :3</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">משך הסיור: <strong>בין 2.5 ל-3 שעות</strong> <span className="text-brand-gold">⏳</span></p>
                <p className="text-gray-300 text-right" dir="rtl">המשך המדויק תלוי בדינמיקה של הקבוצה ובתחנות הסיור <span className="text-brand-gold">👥</span></p>
              </div>
            </div>

            {/* 4.4 - מה כלול במחיר */}
            <div className="mb-6 bg-green-500/10 border border-green-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-green-400 mb-4 text-right" dir="rtl">מה כלול במחיר (250 ש"ח לאדם) :4</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">כל האוכל והמשקאות בתחנות הסיור <span className="text-green-400">🍽️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">משקאות אלכוהוליים <span className="text-green-400">🍷</span></p>
                <p className="text-gray-300 text-right" dir="rtl">פינוקים מיוחדים <span className="text-green-400">🎁</span></p>
                <p className="text-gray-300 text-right" dir="rtl">הדרכה מקצועית ומלווה לאורך כל הסיור <span className="text-green-400">🎤</span></p>
              </div>
            </div>

            {/* 4.5 - אישור השתתפות */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">אישור השתתפות :5</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">לאחר ביצוע התשלום - תקבל/י <strong>מייל אישור מיידי</strong> <span className="text-brand-gold">✅</span></p>
                <p className="text-gray-300 text-right" dir="rtl">המייל יכלול: מספר הזמנה, תאריך הסיור, מספר משתתפים <span className="text-brand-gold">📝</span></p>
                <p className="text-gray-300 text-right" dir="rtl"><strong>שבוע לפני</strong> - מייל עם פרטי נקודת המפגש והוראות הגעה <span className="text-brand-gold">📧</span></p>
                <p className="text-gray-300 text-right" dir="rtl"><strong>יום לפני</strong> - תזכורת SMS/WhatsApp <span className="text-green-500">💬</span></p>
              </div>
            </div>

            {/* 4.6 - ביטול סיור מצד החברה */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 text-right" dir="rtl">ביטול סיור מצד החברה :6</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">במקרים חריגים של כוח עליון (מזג אוויר קיצוני, מצב ביטחוני, מגפה), הסיור עלול להתבטל <span className="text-yellow-400">⚠️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">במקרה כזה תקבל/י הודעה מראש (<strong>לפחות 24 שעות</strong> אם אפשרי) <span className="text-yellow-400">📢</span></p>
                <p className="text-gray-300 text-right" dir="rtl">תוצע אחת מהאפשרויות: דחיית הסיור למועד חלופי (ללא עלות) <strong>או</strong> החזר כספי מלא תוך 7 ימי עסקים <span className="text-yellow-400">🔄</span></p>
                <p className="text-gray-300 text-right" dir="rtl">החברה אינה אחראית לנזקים עקיפים הנובעים מביטול הסיור <span className="text-yellow-400">ℹ️</span></p>
              </div>
            </div>
          </section>

          {/* Section 5: אחריות ושיפוי */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right" dir="rtl">
              ⚖️ אחריות ושיפוי .5
            </h2>
            
            {/* 5.1 - אחריות כללית */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">אחריות כללית :1</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">המשתתפים בסיור אחראים באופן מלא על עצמם, בריאותם ורכושם <span className="text-brand-gold">👤</span></p>
                <p className="text-gray-300 text-right" dir="rtl">החברה, מארגן הסיור, והעסקים המשתתפים אינם אחראים לכל פגיעה, נזק, אובדן, גניבה או אבידה <span className="text-brand-gold">⚠️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">החברה אינה אחראית לתגובות אלרגיות, בעיות בריאותיות או תופעות לוואי מצריכת מזון או משקאות <span className="text-brand-gold">🍽️</span></p>
              </div>
            </div>

            {/* 5.2 - מידע רפואי ואלרגיות */}
            <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-red-400 mb-4 text-right" dir="rtl">מידע רפואי ואלרגיות :2</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl"><strong>חובת המשתתף</strong> ליידע את מארגן הסיור מראש על כל אלרגיה למזון, מגבלה תזונתית או בעיה רפואית <span className="text-red-400">❗</span></p>
                <p className="text-gray-300 text-right" dir="rtl">החברה תעשה מאמץ סביר להתאים את הסיור, אך אינה מתחייבת שהמזון יהיה מתאים לכל המגבלות <span className="text-red-400">ℹ️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">המשתתף אחראי לוודא בעצמו שהמזון מתאים לו <strong>לפני</strong> הצריכה <span className="text-red-400">👀</span></p>
                <p className="text-gray-300 text-right" dir="rtl">המידע בסיור הוא למטרות הנאה וחינוך בלבד ואינו מהווה ייעוץ תזונתי, רפואי או מקצועי <span className="text-red-400">📚</span></p>
              </div>
            </div>

            {/* 5.3 - כושר בריאותי */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">כושר בריאותי :3</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">המשתתף מצהיר ומאשר שהוא כשיר מבחינה בריאותית להשתתף בסיור <span className="text-brand-gold">✓</span></p>
                <p className="text-gray-300 text-right" dir="rtl">הסיור כולל הליכה רגלית למשך מספר שעות <span className="text-brand-gold">🚶</span></p>
                <p className="text-gray-300 text-right" dir="rtl">מי שסובל ממגבלות ניידות או בעיות בריאותיות <strong>חייב ליידע מראש</strong> <span className="text-brand-gold">♿</span></p>
              </div>
            </div>

            {/* 5.4 - אחריות לאיכות מוצרים */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">אחריות לאיכות מוצרים :4</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">העסקים והמסעדות בהם מתקיים הסיור אחראים על איכות המזון והמשקאות שהם מגישים <span className="text-brand-gold">🏪</span></p>
                <p className="text-gray-300 text-right" dir="rtl">החברה משמשת כמארגנת הסיור בלבד ואינה אחראית לאיכות, טריות או כשרות המזון <span className="text-brand-gold">ℹ️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">תלונות על איכות מזון יש להפנות ישירות לעסק הספציפי <span className="text-brand-gold">📞</span></p>
              </div>
            </div>

            {/* 5.5 - שיפוי */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">שיפוי :5</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">המשתתף מתחייב לשפות ולפצות את החברה, בעליה, עובדיה ומי מטעמה מכל תביעה, דרישה, נזק, הוצאה או עלות <span className="text-brand-gold">⚖️</span></p>
                <p className="text-gray-300 text-right" dir="rtl">זאת למעט במקרים של רשלנות חמורה מצד החברה שהוכחה בבית משפט <span className="text-brand-gold">🏛️</span></p>
              </div>
            </div>

            {/* 5.6 - ביטוח */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">ביטוח :6</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">החברה אינה מספקת ביטוח בריאות או ביטוח אישי למשתתפים <span className="text-brand-gold">🏥</span></p>
                <p className="text-gray-300 text-right" dir="rtl">מומלץ בחום למשתתפים לוודא שיש להם ביטוח בריאות תקף <span className="text-brand-gold">💡</span></p>
                <p className="text-gray-300 text-right" dir="rtl">המשתתפים אחראים לוודא את כיסוי הביטוח שלהם <span className="text-brand-gold">📋</span></p>
              </div>
            </div>

            {/* 5.7 - צילומים ופרסום */}
            <div className="mb-6 bg-brand-dark border border-white/20 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-brand-gold mb-4 text-right" dir="rtl">צילומים ופרסום :7</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">במהלך הסיור עשויים להיעשות צילומים ותיעוד <span className="text-brand-gold">📸</span></p>
                <p className="text-gray-300 text-right" dir="rtl">ההשתתפות בסיור מהווה <strong>הסכמה</strong> לשימוש בתמונות ובסרטונים למטרות שיווק ופרסום <span className="text-brand-gold">✓</span></p>
                <p className="text-gray-300 text-right" dir="rtl">מי שאינו מעוניין להיות מצולם <strong>חייב ליידע את המדריך</strong> בתחילת הסיור <span className="text-brand-gold">🚫</span></p>
              </div>
            </div>

            {/* 5.8 - הגבלת אחריות כספית */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-yellow-400 mb-4 text-right" dir="rtl">הגבלת אחריות כספית :8</h3>
              <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                <p className="text-gray-300 text-right" dir="rtl">במקרה שבית משפט יקבע אחריות כלשהי של החברה, האחריות הכספית המקסימלית תוגבל <strong>לסכום ששולם עבור ההשתתפות בסיור בלבד</strong> <span className="text-yellow-400">💰</span></p>
                <p className="text-gray-300 text-right" dir="rtl">החברה לא תהיה אחראית לנזקים עקיפים, תוצאתיים או מיוחדים מכל סוג שהוא <span className="text-yellow-400">⚠️</span></p>
              </div>
            </div>
          </section>

          {/* Section 6: פרטיות */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right" dir="rtl">
              🔒 פרטיות .6
            </h2>
            <div className="space-y-3" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
              <p className="text-gray-300 text-right" dir="rtl">{t('terms.section6.secure')} <span className="text-brand-gold">•</span></p>
              <p className="text-gray-300 text-right" dir="rtl">{t('terms.section6.purpose')} <span className="text-brand-gold">•</span></p>
              <p className="text-gray-300 text-right" dir="rtl">{t('terms.section6.storage')} <span className="text-brand-gold">•</span></p>
            </div>
          </section>

          {/* Section 7: יצירת קשר */}
          <section className="bg-brand-gold/10 border-2 border-brand-gold/30 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-center">
              📞 יצירת קשר .7
            </h2>
            <div className="text-center space-y-6">
              <p className="text-xl text-white font-bold">
                {t('terms.section7.questions')}
              </p>
              
              {/* Business Details Card */}
              <div className="bg-brand-dark border border-brand-gold/30 rounded-2xl p-6 space-y-4">
                <p className="text-2xl text-brand-gold font-bold">חיליק רוזנברג</p>
                <p className="text-lg text-white font-semibold">סיורים קולינריים בבני ברק</p>
                
                <div className="space-y-3 text-gray-300">
                  <p dir="rtl" className="text-right">כתובת: <strong>רחוב לחי 11, בני ברק</strong> 📍</p>
                  <p dir="rtl">
                    טלפון/WhatsApp: <a href="tel:0505804367" className="text-brand-gold hover:text-brand-gold/80 font-bold text-lg transition-colors" dir="ltr">050-580-4367</a> 📞
                  </p>
                  <p dir="rtl">
                    דוא"ל: <a href="mailto:hr20192022@gmail.com" className="text-brand-gold hover:text-brand-gold/80 font-bold transition-colors">hr20192022@gmail.com</a> ✉️
                  </p>
                </div>
              </div>

              {/* WhatsApp Button */}
              <div>
                <a 
                  href="https://wa.me/972505804367?text=שלום, יש לי שאלה בנוגע לתנאי השימוש" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 flex-row-reverse bg-green-600 text-white px-8 py-4 rounded-full text-lg font-bold hover:bg-green-700 transition-all"
                >
                  <MessageCircle size={20} />
                  <span>שלח הודעה ב-WhatsApp</span>
                </a>
              </div>
            </div>
          </section>

          {/* Last Updated */}
          <div className="text-center text-sm text-gray-500 py-6">
            <p>{t('terms.lastUpdated')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex flex-col md:flex-row-reverse gap-4 justify-center">
          <button
            onClick={goToDateSelection}
            className="bg-brand-gold text-brand-dark px-12 py-4 rounded-full font-black text-lg hover:scale-105 transition-all"
          >
            הרשמה לסיור
          </button>
          
          <button
            onClick={scrollToTop}
            className="bg-transparent border-2 border-white/20 text-white px-12 py-4 rounded-full font-bold text-lg hover:border-brand-gold hover:text-brand-gold transition-all flex items-center justify-center gap-2 flex-row-reverse"
          >
            <ArrowUp size={20} />
            {t('terms.backToTop')}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-4">
          <p className="text-brand-gold font-bold text-lg">חיליק רוזנברג - סיורים קולינריים</p>
          <div className="text-gray-400 text-sm space-y-1">
            <p dir="rtl">כתובת: רחוב לחי 11, בני ברק 📍</p>
            <p dir="rtl">טלפון/WhatsApp: <a href="tel:0505804367" className="text-brand-gold hover:underline" dir="ltr">050-580-4367</a> 📞</p>
            <p dir="rtl">דוא"ל: <a href="mailto:hr20192022@gmail.com" className="text-brand-gold hover:underline">hr20192022@gmail.com</a> ✉️</p>
          </div>
          <p className="text-xs text-gray-500 tracking-widest pt-4 border-t border-white/10">
            © 2026 {t('header.title')} - כל הזכויות שמורות
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
            dir="rtl"
            className="bg-brand-dark border-2 border-brand-gold rounded-3xl p-8 max-w-md w-full relative animate-in zoom-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closePaymentModal}
              className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors"
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

                <div className="space-y-3 text-right bg-brand-dark-lighter rounded-2xl p-6 border border-white/10" dir="rtl" style={{ direction: 'rtl', textAlign: 'right' }}>
                  {getPaymentInstructions().instructions.map((instruction, index) => (
                    <p 
                      key={index} 
                      dir="rtl"
                      className={`text-right ${
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
                    className="bg-green-600 text-white px-6 py-4 rounded-full font-bold text-center hover:bg-green-700 transition-all flex items-center justify-center gap-2 flex-row-reverse"
                  >
                    <MessageCircle size={20} />
                    <span>{t('terms.paymentModal.openWhatsapp')}</span>
                  </a>
                  
                  <button
                    onClick={closePaymentModal}
                    className="border-2 border-white/20 text-white px-6 py-4 rounded-full font-bold hover:border-brand-gold hover:text-brand-gold transition-all"
                  >
                    {t('terms.paymentModal.close')}
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

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

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* Header */}
      <header className="bg-brand-dark-lighter border-b border-white/10 px-6 py-6 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-4xl mx-auto">
          <a href="/" className="text-2xl md:text-3xl font-black text-brand-gold font-serif tracking-tighter">
            {t('header.title')}
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
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
          {/* Section 1: כללי */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              1. {t('terms.section1.title')}
            </h2>
            <ul className="space-y-3 text-gray-300 text-right">
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section1.tours')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section1.duration')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section1.includes')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
            </ul>
          </section>

          {/* Section 2: תשלום */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              2. {t('terms.section2.title')}
            </h2>
            <div className="space-y-4 text-right mb-6">
              <p className="text-gray-300 text-right">
                • {t('terms.section2.prepayment')}
              </p>
              <p className="text-gray-300 text-right">
                • {t('terms.section2.price')}: <span className="text-brand-gold font-bold text-xl">{t('terms.section2.priceAmount')}</span> {t('terms.section2.perPerson')}
              </p>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm font-bold text-white mb-3 text-right">{t('terms.section2.selectMethod')}</p>
              
              <button
                onClick={() => handlePaymentClick('bit')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex flex-row-reverse items-center justify-between group"
              >
                <span className="text-lg font-bold">{t('terms.section2.bit')} 💳</span>
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">{t('terms.section2.clickForDetails')} →</span>
              </button>
              
              <button
                onClick={() => handlePaymentClick('credit')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex flex-row-reverse items-center justify-between group"
              >
                <span className="text-lg font-bold">{t('terms.section2.credit')} 💳</span>
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">{t('terms.section2.clickForDetails')} →</span>
              </button>
              
              <button
                onClick={() => handlePaymentClick('bank')}
                className="w-full bg-brand-dark border border-brand-gold/30 hover:border-brand-gold hover:bg-brand-gold/10 rounded-2xl p-4 text-white transition-all text-right flex flex-row-reverse items-center justify-between group"
              >
                <span className="text-lg font-bold">{t('terms.section2.bank')} 🏦</span>
                <span className="text-sm text-gray-400 group-hover:text-brand-gold">{t('terms.section2.clickForDetails')} →</span>
              </button>
            </div>
          </section>

          {/* Section 3: מדיניות ביטולים - IMPORTANT */}
          <section className="bg-red-500/5 border-2 border-red-500/30 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              3. {t('terms.section3.title')} ⚠️
            </h2>
            <div className="space-y-4 text-right">
              <div className="bg-brand-dark border border-green-500/30 rounded-2xl p-6">
                <p className="text-green-400 font-bold text-lg mb-2">
                  ✓ {t('terms.section3.option1.title')}
                </p>
                <p className="text-gray-300">
                  {t('terms.section3.option1.desc')}
                </p>
              </div>

              <div className="bg-brand-dark border border-yellow-500/30 rounded-2xl p-6">
                <p className="text-yellow-400 font-bold text-lg mb-2">
                  ⚠️ {t('terms.section3.option2.title')}
                </p>
                <p className="text-gray-300">
                  {t('terms.section3.option2.desc')}
                </p>
              </div>

              <div className="bg-brand-dark border border-red-500/30 rounded-2xl p-6">
                <p className="text-red-400 font-bold text-lg mb-2">
                  ✗ {t('terms.section3.option3.title')}
                </p>
                <p className="text-gray-300">
                  {t('terms.section3.option3.desc')}
                </p>
              </div>

              <div className="bg-brand-dark border border-blue-500/30 rounded-2xl p-6 mt-4">
                <p className="text-blue-400 font-bold text-lg mb-2">
                  🔄 {t('terms.section3.postpone.title')}
                </p>
                <p className="text-gray-300">
                  {t('terms.section3.postpone.desc')}
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: מתאים לכל הגילאים */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              4. {t('terms.section4.title')}
            </h2>
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-right">
              <div className="space-y-3">
                <p className="text-green-400 font-bold text-lg">
                  👨‍👩‍👧‍👦 {t('terms.section4.allAges')}
                </p>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-start gap-3 justify-end">
                    <span>{t('terms.section4.babies')}</span>
                    <div className="text-green-400 mt-1">👶</div>
                  </li>
                  <li className="flex items-start gap-3 justify-end">
                    <span>{t('terms.section4.families')}</span>
                    <div className="text-green-400 mt-1">👨‍👩‍👧‍👦</div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5: אחריות */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              5. {t('terms.section5.title')}
            </h2>
            <ul className="space-y-3 text-gray-300 text-right">
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section5.responsibility')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section5.valuables')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
            </ul>
          </section>

          {/* Section 6: פרטיות */}
          <section className="bg-brand-dark-lighter border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-right">
              6. {t('terms.section6.title')}
            </h2>
            <ul className="space-y-3 text-gray-300 text-right">
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section6.secure')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section6.purpose')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
              <li className="flex items-start gap-3 justify-end">
                <span>{t('terms.section6.storage')}</span>
                <div className="text-brand-gold mt-1">•</div>
              </li>
            </ul>
          </section>

          {/* Section 7: יצירת קשר */}
          <section className="bg-brand-gold/10 border-2 border-brand-gold/30 rounded-3xl p-8">
            <h2 className="text-2xl font-serif text-brand-gold font-bold mb-6 text-center">
              {t('terms.section7.title')}
            </h2>
            <div className="text-center space-y-4">
              <p className="text-xl text-white font-bold">
                {t('terms.section7.questions')}
              </p>
              <div>
                <p className="text-lg text-white font-bold mb-2">{t('terms.section7.name')}</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <Phone size={20} className="text-brand-gold" />
                <a 
                  href="tel:0505804367" 
                  className="text-brand-gold hover:text-brand-gold/80 font-bold text-xl transition-colors"
                  dir="ltr"
                >
                  050-580-4367
                </a>
              </div>
              <div>
                <a 
                  href="https://wa.me/972505804367?text=שלום, יש לי שאלה בנוגע לתנאי השימוש" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-4 rounded-full text-sm font-bold hover:bg-green-700 transition-all"
                >
                  <span>{t('terms.section7.whatsapp')}</span>
                  <MessageCircle size={18} />
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
        <div className="mt-12 flex flex-col md:flex-row gap-4 justify-center">
          <button
            onClick={goBack}
            className="bg-brand-gold text-brand-dark px-12 py-4 rounded-full font-black text-lg hover:scale-105 transition-all"
          >
            {t('terms.backToBooking')}
          </button>
          
          <button
            onClick={scrollToTop}
            className="bg-transparent border-2 border-white/20 text-white px-12 py-4 rounded-full font-bold text-lg hover:border-brand-gold hover:text-brand-gold transition-all flex items-center justify-center gap-2"
          >
            {t('terms.backToTop')}
            <ArrowUp size={20} />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-xs text-gray-500 tracking-widest">
            © 2026 {t('header.title')}
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
                    <span>{t('terms.paymentModal.openWhatsapp')}</span>
                    <MessageCircle size={20} />
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

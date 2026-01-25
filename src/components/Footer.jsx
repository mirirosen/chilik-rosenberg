const Footer = () => {
  const handleTermsClick = () => {
    window.history.pushState({}, '', '/terms');
    window.location.href = '/terms';
  };

  return (
    <footer className="py-16 pb-32 border-t border-white/5 bg-brand-dark-section">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 text-right">
          {/* Contact Info */}
          <div className="text-right">
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              יצירת קשר
            </h3>
            <div className="space-y-2 text-gray-400">
              <p className="text-white font-bold">חיליק רוזנברג</p>
              <a 
                href="tel:0505804367" 
                className="block hover:text-brand-gold transition-colors"
                dir="ltr"
              >
                050-580-4367
              </a>
              <a 
                href="https://wa.me/972505804367" 
                target="_blank" 
                rel="noopener noreferrer"
                className="block hover:text-brand-gold transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-right">
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              קישורים מהירים
            </h3>
            <div className="space-y-2 text-gray-400">
              <button 
                onClick={() => {
                  window.history.pushState({}, '', '/booking');
                  window.location.href = '/booking';
                }}
                className="block hover:text-brand-gold transition-colors text-right"
              >
                הרשמה לסיור
              </button>
              <button 
                onClick={handleTermsClick}
                className="block hover:text-brand-gold transition-colors text-right"
              >
                תנאי שימוש ותקנון
              </button>
              <a 
                href="#about" 
                className="block hover:text-brand-gold transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                אודות
              </a>
              <a 
                href="#faq" 
                className="block hover:text-brand-gold transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                שאלות נפוצות
              </a>
            </div>
          </div>

          {/* About */}
          <div className="text-right">
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              אודות הסיורים
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              סיורים קולינריים בבני ברק עם חיליק רוזנברג. 
              חוויה אותנטית של טעמים, ריחות וסיפורים מהלב החרדי של בני ברק.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-4 text-center md:text-right">
            <div className="text-xs text-gray-500 tracking-wider">
              © 2026 סיורי חיליק רוזנברג - כל הזכויות שמורות
            </div>
            <button 
              onClick={handleTermsClick}
              className="text-xs text-gray-400 hover:text-brand-gold transition-colors underline"
            >
              תנאי שימוש ומדיניות ביטולים
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

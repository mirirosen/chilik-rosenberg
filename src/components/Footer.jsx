import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'he' ? 'rtl' : 'ltr';

  const handleTermsClick = () => {
    window.location.href = '/terms';
  };

  const goToDateSelection = () => {
    if (window.location.pathname === '/') {
      // Already on homepage - just scroll
      const element = document.getElementById('date-selection');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      // On another page - navigate to homepage with hash
      window.location.href = '/#date-selection';
    }
  };

  return (
    <footer className="py-16 pb-32 border-t border-white/5 bg-brand-dark-section">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 text-right">
          {/* Contact Info */}
          <div className="text-right" dir={dir}>
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              {t('footer.title')}
            </h3>
            <div className="space-y-2 text-gray-400">
              <p className="flex items-center gap-2 justify-end">
                <span>רחוב לחי 11, בני ברק</span>
                <span className="text-brand-gold">📍</span>
              </p>
              <a
                href="tel:0506724312"
                className="flex items-center gap-2 justify-end hover:text-brand-gold transition-colors"
                dir="ltr"
              >
                <span dir="ltr">050-672-4312</span>
                <span className="text-brand-gold">📞</span>
              </a>
              <a
                href="https://wa.me/972506724312"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-end hover:text-brand-gold transition-colors"
              >
                <span>WhatsApp</span>
                <span className="text-green-500">💬</span>
              </a>
              <a
                href="mailto:hr20192022@gmail.com"
                className="flex items-center gap-2 justify-end hover:text-brand-gold transition-colors"
              >
                <span>hr20192022@gmail.com</span>
                <span className="text-brand-gold">✉️</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-right" dir={dir}>
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              {t('footer.quickLinks')}
            </h3>
            <div className="space-y-2 text-gray-400">
              <button
                onClick={goToDateSelection}
                className="block hover:text-brand-gold transition-colors text-right"
              >
                {t('footer.register')}
              </button>
              <button
                onClick={handleTermsClick}
                className="block hover:text-brand-gold transition-colors text-right"
              >
                {t('footer.terms')}
              </button>
              <a
                href="#about"
                className="block hover:text-brand-gold transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  if (window.location.pathname === '/') {
                    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.location.href = '/#about';
                  }
                }}
              >
                {t('footer.aboutLink')}
              </a>
              <a
                href="#faq"
                className="block hover:text-brand-gold transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  if (window.location.pathname === '/') {
                    document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    window.location.href = '/#faq';
                  }
                }}
              >
                {t('footer.faqs')}
              </a>
            </div>
          </div>

          {/* About */}
          <div className="text-right" dir={dir}>
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              {t('footer.about')}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              {t('footer.aboutText')}
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-4 text-center md:text-right">
            <div className="text-xs text-gray-500 tracking-wider" dir={dir}>
              © 2026 {t('footer.copyright')}
            </div>
            <button
              onClick={handleTermsClick}
              className="text-xs text-gray-400 hover:text-brand-gold transition-colors underline"
            >
              {t('footer.terms')}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

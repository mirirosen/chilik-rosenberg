import { useTranslation } from 'react-i18next';
import { MapPin, Phone, MessageCircle, Mail } from '../utils/icons';

const Footer = () => {
  const { t, i18n } = useTranslation();
  const dir = i18n.language === 'he' ? 'rtl' : 'ltr';

  return (
    <footer className="py-16 pb-32 border-t border-white/5 bg-brand-dark-section">
      <div className="max-w-6xl mx-auto px-6">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12 text-start">
          {/* Contact Info */}
          <div className="text-start" dir={dir}>
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              {t('footer.title')}
            </h3>
            <div className="space-y-2 text-gray-400">
              <p className="flex items-center gap-2 justify-start">
                <span>{t('footer.address')}</span>
                <MapPin size={18} className="text-brand-gold shrink-0" aria-hidden="true" />
              </p>
              <a
                href="tel:0506724312"
                className="flex items-center gap-2 justify-start hover:text-brand-gold transition-colors"
                dir={dir}
              >
                <span dir="ltr">0506724312</span>
                <Phone size={18} className="text-brand-gold shrink-0" aria-hidden="true" />
              </a>
              <a
                href="https://wa.me/972506724312"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 justify-start hover:text-brand-gold transition-colors"
              >
                <span>WhatsApp</span>
                <MessageCircle size={18} className="text-brand-gold shrink-0" aria-hidden="true" />
              </a>
              <a
                href="mailto:hr20192022@gmail.com"
                className="flex items-center gap-2 justify-start hover:text-brand-gold transition-colors"
              >
                <span>hr20192022@gmail.com</span>
                <Mail size={18} className="text-brand-gold shrink-0" aria-hidden="true" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="text-start" dir={dir}>
            <h3 className="text-brand-gold font-bold text-xl mb-4 font-serif">
              {t('footer.quickLinks')}
            </h3>
            <div className="space-y-2 text-gray-400">
              <a
                href="/#date-selection"
                className="block hover:text-brand-gold transition-colors text-start"
              >
                {t('footer.register')}
              </a>
              <a
                href="/terms"
                className="block hover:text-brand-gold transition-colors text-start"
              >
                {t('footer.terms')}
              </a>
              <a
                href="/#about"
                className="block hover:text-brand-gold transition-colors"

              >
                {t('footer.aboutLink')}
              </a>
              <a
                href="/#faq"
                className="block hover:text-brand-gold transition-colors"

              >
                {t('footer.faqs')}
              </a>
            </div>
          </div>

          {/* About */}
          <div className="text-start" dir={dir}>
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
          <div className="flex flex-col md:flex-row-reverse justify-between items-center gap-4 text-center md:text-start">
            <div className="text-xs text-[#d1d5db] tracking-wider" dir={dir}>
              © 2026 {t('footer.copyright')}
            </div>
            <a
              href="/terms"
              className="text-xs text-gray-400 hover:text-brand-gold transition-colors underline"
            >
              {t('footer.terms')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

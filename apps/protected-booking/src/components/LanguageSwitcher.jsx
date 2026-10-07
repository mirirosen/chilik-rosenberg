import { useTranslation } from 'react-i18next';
import { Globe } from '../utils/icons';

const LanguageSwitcher = ({ mobile = false }) => {
  const { i18n } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };

  const currentLang = i18n.language;

  if (mobile) {
    // Mobile version - larger, centered
    return (
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => changeLanguage('he')}
          className={`px-6 py-3 rounded-full text-lg font-bold transition-all ${
            currentLang === 'he'
              ? 'bg-brand-gold text-brand-dark'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🇮🇱 עברית
        </button>
        <div className="text-gray-600">|</div>
        <button
          onClick={() => changeLanguage('en')}
          className={`px-6 py-3 rounded-full text-lg font-bold transition-all ${
            currentLang === 'en'
              ? 'bg-brand-gold text-brand-dark'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          🇬🇧 English
        </button>
      </div>
    );
  }

  // Desktop version - compact
  return (
    <div className="flex items-center gap-2 bg-brand-dark-lighter border border-white/10 rounded-full p-1">
      <button
        onClick={() => changeLanguage('he')}
        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
          currentLang === 'he'
            ? 'bg-brand-gold text-brand-dark'
            : 'text-gray-400 hover:text-white'
        }`}
        title="עברית"
      >
        🇮🇱 HE
      </button>
      <button
        onClick={() => changeLanguage('en')}
        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
          currentLang === 'en'
            ? 'bg-brand-gold text-brand-dark'
            : 'text-gray-400 hover:text-white'
        }`}
        title="English"
      >
        🇬🇧 EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;

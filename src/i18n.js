import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import heTranslations from './locales/he.json';
import enTranslations from './locales/en.json';

const resources = {
  he: {
    translation: heTranslations
  },
  en: {
    translation: enTranslations
  }
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'he', // Default language (Hebrew)
    lng: localStorage.getItem('language') || 'he', // Use saved language or default to Hebrew
    
    detection: {
      // Detection order and caches
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    interpolation: {
      escapeValue: false // React already does escaping
    },

    react: {
      useSuspense: false // Disable suspense for simplicity
    }
  });

// Update HTML dir attribute when language changes
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
  localStorage.setItem('language', lng);
});

export default i18n;

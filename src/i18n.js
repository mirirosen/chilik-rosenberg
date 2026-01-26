import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { detectUserLanguage, detectFromBrowserLanguage } from './utils/detectLanguage';

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

// Get initial language synchronously (before async detection)
const getInitialLanguage = () => {
  // First check localStorage
  const saved = localStorage.getItem('language');
  if (saved && (saved === 'he' || saved === 'en')) {
    return saved;
  }
  
  // Check session cache
  const cachedCountry = sessionStorage.getItem('detectedCountry');
  if (cachedCountry) {
    return cachedCountry === 'IL' ? 'he' : 'en';
  }
  
  // Use browser language as temporary fallback
  return detectFromBrowserLanguage();
};

// Initialize i18n with synchronous initial language
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'he',
    lng: getInitialLanguage(),
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'language'
    },

    interpolation: {
      escapeValue: false
    },

    react: {
      useSuspense: false
    }
  });

// Update HTML dir attribute when language changes
i18n.on('languageChanged', (lng) => {
  const dir = lng === 'he' ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
  localStorage.setItem('language', lng);
});

// Set initial direction
const initialLang = i18n.language;
document.documentElement.setAttribute('dir', initialLang === 'he' ? 'rtl' : 'ltr');
document.documentElement.setAttribute('lang', initialLang);

/**
 * Initialize geolocation-based language detection (async)
 * Call this after app mounts to update language based on location
 */
export const initGeoLanguageDetection = async () => {
  // Only run if user hasn't manually set a preference
  const savedLanguage = localStorage.getItem('language');
  if (savedLanguage) {
    console.log('User has saved language preference, skipping geolocation');
    return savedLanguage;
  }
  
  try {
    const detectedLang = await detectUserLanguage();
    
    // Only change if different from current
    if (detectedLang !== i18n.language) {
      console.log('Updating language based on geolocation:', detectedLang);
      i18n.changeLanguage(detectedLang);
    }
    
    return detectedLang;
  } catch (error) {
    console.error('Geolocation language detection failed:', error);
    return i18n.language;
  }
};

export default i18n;

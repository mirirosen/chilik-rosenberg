/**
 * Auto-detect user language based on geographic location
 * Priority:
 * 1. Saved preference in localStorage
 * 2. IP-based geolocation (Israel = Hebrew, else = English)
 * 3. Browser language
 * 4. Fallback to Hebrew
 */

// Cache key for session storage (to avoid repeated API calls)
const LOCATION_CACHE_KEY = 'detectedCountry';
const LANGUAGE_PREF_KEY = 'language';

/**
 * Detect user language with geolocation
 * @returns {Promise<string>} - 'he' for Hebrew or 'en' for English
 */
export const detectUserLanguage = async () => {
  // Level 1: Check if user already has a saved preference
  const savedLanguage = localStorage.getItem(LANGUAGE_PREF_KEY);
  if (savedLanguage && (savedLanguage === 'he' || savedLanguage === 'en')) {
    console.log('Using saved language preference:', savedLanguage);
    return savedLanguage;
  }

  // Level 2: Check session cache (to avoid repeated API calls)
  const cachedCountry = sessionStorage.getItem(LOCATION_CACHE_KEY);
  if (cachedCountry) {
    const lang = cachedCountry === 'IL' ? 'he' : 'en';
    console.log('Using cached location:', cachedCountry, '→', lang);
    return lang;
  }

  // Level 3: Try primary geolocation API (ipapi.co)
  try {
    console.log('Detecting location via ipapi.co...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch('https://ipapi.co/json/', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    const countryCode = data.country_code;
    
    console.log('Detected country:', countryCode, '(' + data.country_name + ')');
    
    // Cache the result in session storage
    sessionStorage.setItem(LOCATION_CACHE_KEY, countryCode);
    
    // Return Hebrew for Israel, English for all others
    if (countryCode === 'IL') {
      return 'he';
    }
    return 'en';
    
  } catch (error) {
    console.warn('Primary geolocation (ipapi.co) failed:', error.message);
    
    // Level 4: Try backup API (ip-api.com)
    try {
      console.log('Trying backup API (ip-api.com)...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('http://ip-api.com/json/', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const data = await response.json();
      const countryCode = data.countryCode;
      
      console.log('Backup detected country:', countryCode);
      
      // Cache the result
      sessionStorage.setItem(LOCATION_CACHE_KEY, countryCode);
      
      if (countryCode === 'IL') {
        return 'he';
      }
      return 'en';
      
    } catch (error2) {
      console.warn('Backup geolocation (ip-api.com) failed:', error2.message);
      
      // Level 5: Fallback to browser language
      return detectFromBrowserLanguage();
    }
  }
};

/**
 * Detect language from browser settings
 * @returns {string} - 'he' or 'en'
 */
export const detectFromBrowserLanguage = () => {
  try {
    const browserLang = navigator.language || navigator.userLanguage || '';
    console.log('Browser language:', browserLang);
    
    // Check if browser language is Hebrew
    if (browserLang.toLowerCase().startsWith('he')) {
      return 'he';
    }
    
    // Check if browser language is in a list of languages that might indicate Israel
    // (some Israelis might have English as browser language but Hebrew keyboard)
    const hebrewIndicators = ['he', 'he-il', 'iw']; // 'iw' is old Hebrew code
    if (hebrewIndicators.includes(browserLang.toLowerCase())) {
      return 'he';
    }
    
    // Default to English for all other languages
    return 'en';
    
  } catch (error) {
    console.warn('Browser language detection failed:', error);
    // Final fallback: Hebrew (primary target audience)
    return 'he';
  }
};

/**
 * Check if user is likely in Israel (for other purposes)
 * @returns {Promise<boolean>}
 */
export const isUserInIsrael = async () => {
  // Check session cache first
  const cachedCountry = sessionStorage.getItem(LOCATION_CACHE_KEY);
  if (cachedCountry) {
    return cachedCountry === 'IL';
  }
  
  // Detect and return
  const lang = await detectUserLanguage();
  return lang === 'he';
};

/**
 * Clear cached location (for testing or reset)
 */
export const clearLocationCache = () => {
  sessionStorage.removeItem(LOCATION_CACHE_KEY);
  localStorage.removeItem(LANGUAGE_PREF_KEY);
  console.log('Location and language cache cleared');
};

/**
 * Get current detected country code from cache
 * @returns {string|null}
 */
export const getCachedCountry = () => {
  return sessionStorage.getItem(LOCATION_CACHE_KEY);
};

export default detectUserLanguage;

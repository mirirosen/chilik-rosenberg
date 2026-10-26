import i18n from './inquiry-i18n';
import he from '../apps/protected-booking/src/locales/he.json';
import en from '../apps/protected-booking/src/locales/en.json';
import { bookingDesign } from '../apps/protected-booking/src/data/bookingDesign';
import { bookingFaqOverrides } from './data/bookingFaqCopy';

for (const [language, resources] of [['he', he], ['en', en]]) {
  // Keep the current homepage content; replace only the booking-facing copy.
  for (const key of ['booking', 'bookingSection', 'confirmation', 'demo']) {
    i18n.addResourceBundle(language, 'translation', { [key]: resources[key] }, true, true);
  }
  i18n.addResourceBundle(language, 'translation', {
    bookingDesign: bookingDesign[language],
    header: { dates: resources.header.dates, register: resources.header.register, upcomingTours: resources.header.upcomingTours },
    hero: { cta: resources.hero.cta },
    menu: { nextTours: resources.menu.nextTours },
    footer: { register: resources.footer.register },
    terms: { backToSite: language === 'he' ? 'חזרה לאתר' : 'Back to the site', ui: { register: resources.terms.ui.register } },
    faqs: bookingFaqOverrides(language, resources),
    common: resources.common,
    seo: {
      admin: { title: language === 'he' ? 'ניהול הזמנות — חיליק' : 'Booking management — Hilik', description: '' },
      booking: { title: language === 'he' ? 'הזמנת סיור עם חיליק' : 'Book a tour with Hilik', description: bookingDesign[language].description },
      confirmation: { title: language === 'he' ? 'מצב ההזמנה' : 'Booking status', description: '' },
    },
  }, true, true);
}
export default i18n;

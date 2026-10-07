import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import he from './locales/he.json';
import en from './locales/en.json';

const copy = {
  he: {
    title: 'בירור על סיור', cta: 'פנייה לחיליק ב־WhatsApp', contact: 'פנייה לחיליק', short: 'פנייה לחיליק',
    notice: 'הזמינות וההזמנה יאושרו אישית. פנייה אינה שומרת מקום ואינה גובה תשלום.',
    draftNotice: 'הכפתור פותח טיוטת הודעה. יש לשלוח אותה בעצמכם ב־WhatsApp.',
    draft: 'שלום חיליק, אשמח לברר פרטים וזמינות לסיור. אבקש לתאם אישית את ההזמנה.',
    call: 'שיחה עם חיליק', email: 'פנייה באימייל',
    statusTitle: 'בירור הזמנה קודמת',
    statusNotice: 'האתר אינו בודק כרגע מצב תשלום או הזמנה. לצורך בירור או ביטול, פנו לחיליק וציינו את פרטי ההזמנה. אין בעמוד הזה אישור לתשלום, ביטול או שמירת מקום.',
    reference: 'מספר ההזמנה מהקישור, לבירור בלבד',
    paymentNotice: 'התשלום ותנאי ההזמנה מתואמים אישית עם חיליק. האתר אינו מבצע תשלום או הרשמה אוטומטית.',
  },
  en: {
    title: 'Ask about a tour', cta: 'Contact Chilik on WhatsApp', contact: 'Contact Chilik', short: 'Contact Chilik',
    notice: 'Availability and bookings are confirmed personally. An enquiry does not reserve a place or take payment.',
    draftNotice: 'This button opens a message draft. You must send it yourself in WhatsApp.',
    draft: 'Hi Chilik, I would like to ask about a tour and availability, and arrange the booking personally.',
    call: 'Call Chilik', email: 'Email Chilik',
    statusTitle: 'Check an existing booking',
    statusNotice: 'This site currently does not check payment or booking status. Contact Chilik with your booking details for enquiries or cancellation. This page does not confirm payment, cancellation or a reserved place.',
    reference: 'Booking reference from this link, for enquiries only',
    paymentNotice: 'Payment and booking arrangements are agreed personally with Chilik. This site does not take payment or register a booking automatically.',
  },
};

function resource(base, lang) {
  const inquiry = copy[lang];
  return { ...base, inquiry,
    hero: { ...base.hero, cta: inquiry.contact },
    header: { ...base.header, dates: inquiry.title, register: inquiry.contact, upcomingTours: inquiry.short },
    menu: { ...base.menu, nextTours: inquiry.title },
    footer: { ...base.footer, register: inquiry.title },
    helpHub: { ...base.helpHub, register: inquiry.contact },
    terms: { ...base.terms, ui: { ...base.terms.ui, register: inquiry.title } },
    seo: { ...base.seo,
      booking: { title: `${inquiry.title} | Chilik`, description: inquiry.notice },
      confirmation: { title: `${inquiry.statusTitle} | Chilik`, description: inquiry.statusNotice },
    },
  };
}

let initial = /^he\b/i.test(navigator.language || '') ? 'he' : 'en';
try { const saved = localStorage.getItem('language'); if (['he', 'en'].includes(saved)) initial = saved; } catch {}
i18n.use(initReactI18next).init({ resources: { he: { translation: resource(he, 'he') }, en: { translation: resource(en, 'en') } }, lng: initial, fallbackLng: 'he', interpolation: { escapeValue: false }, react: { useSuspense: false } });
function applyLanguage(language) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
  try { localStorage.setItem('language', language); } catch {}
}
i18n.on('languageChanged', applyLanguage);
applyLanguage(initial);
export default i18n;

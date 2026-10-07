import { IS_PREPROD } from './preview';
import { whatsappNumber } from '../data/content';
import { formatDateHebrew } from './dateUtils';

/**
 * Open WhatsApp with pre-filled message
 */
export const handleWhatsApp = (date = null, isPrivate = false) => {
  if (IS_PREPROD) return;
  let message;

  if (isPrivate) {
    message = `היי מירי, אני מעוניין לתאם סיור פרטי בבני ברק לקבוצה של 10 אנשים ומעלה. אשמח לפרטים!`;
  } else {
    message = `היי מירי, אשמח להירשם לסיור ב-${formatDateHebrew(date)}. נותרו מקומות?`;
  }

  const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  window.location.href = url;
};

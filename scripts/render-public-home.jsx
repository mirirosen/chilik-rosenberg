import React from 'react';
import { renderToString } from 'react-dom/server';
import InquiryApp from '../src/InquiryApp';
import BookingSiteApp from '../src/BookingSiteApp';
import i18n from '../src/inquiry-i18n';

export async function renderPublicHome(mode) {
  if (mode === 'booking') await import('../src/booking-i18n');
  await i18n.changeLanguage('he');
  return renderToString(<React.StrictMode>{mode === 'booking' ? <BookingSiteApp /> : <InquiryApp />}</React.StrictMode>);
}

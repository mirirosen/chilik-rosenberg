import React from 'react';
import ReactDOM from 'react-dom/client';
import { bootstrapProtectedBooking } from './bootstrap';

bootstrapProtectedBooking({
  enabled: import.meta.env.VITE_BOOKING_REVIEW_ENABLED,
  renderDisabled: () => ReactDOM.createRoot(document.getElementById('root')).render(
    <main dir="rtl"><h1>ממשק ההזמנות כבוי</h1><p>ממשק המנהל וההזמנות טרם הופעל.</p></main>,
  ),
  load: () => import('./main-enabled.jsx'),
});

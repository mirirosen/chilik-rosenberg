import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as analytics from '../../apps/protected-booking/src/utils/analytics';
const events=()=>[...(window.dataLayer||[])].filter(e=>e[0]==='event').map(e=>[e[1],e[2]]);
beforeEach(()=>{localStorage.clear();document.cookie='chilik-analytics-opt-out=; Max-Age=0; path=/';document.documentElement.lang='he';window.history.replaceState({},'','/booking');delete window.gtag;delete window.dataLayer;analytics.__setMeasurementIdForTests('G-CXTM7ZJZYX');analytics.initAnalytics();});
afterEach(()=>{cleanup();window.history.replaceState({},'','/');localStorage.clear();delete window.gtag;delete window.dataLayer;document.querySelectorAll('script[src^="https://www.googletagmanager.com/gtag/js"]').forEach(s=>s.remove());vi.restoreAllMocks();});
it('observes only fixed booking stages/errors and current language, without accepting customer data',()=>{
 analytics.trackCalendarView();analytics.trackTourDateSelected();analytics.trackBookingError('details','validation_phone');
 document.documentElement.lang='en';analytics.trackBookingError('payment','session_unavailable');
 expect(events()).toEqual([
 ['view_booking_calendar',{booking_stage:'date_selection',page_language:'he'}],
 ['select_tour_date',{booking_stage:'date_selection',page_language:'he'}],
 ['booking_error',{booking_stage:'details',booking_error_code:'validation_phone',page_language:'he'}],
 ['booking_error',{booking_stage:'payment',booking_error_code:'session_unavailable',page_language:'en'}],
 ]);
 const before=events().length;
 expect(analytics.trackBookingError('details','0501234567')).toBe(false);
 expect(analytics.trackBookingError('customer@example.test','validation_phone')).toBe(false);
 expect(analytics.trackBookingError('payment','validation_phone')).toBe(false);
 expect(events()).toHaveLength(before);
});
it('retains opt-out/management/demo exclusions and never throws from diagnostic measurement',()=>{
 localStorage.setItem('chilik-analytics-consent','denied');expect(analytics.trackCalendarView()).toBe(false);expect(events()).toHaveLength(0);
 localStorage.clear();window.history.replaceState({},'','/manage-bookings');expect(analytics.trackTourDateSelected()).toBe(false);expect(events()).toHaveLength(0);
 window.history.replaceState({},'','/booking');window.gtag=()=>{throw Error('measurement blocked')};expect(()=>analytics.trackBookingError('details','validation_terms')).not.toThrow();
 analytics.__setMeasurementIdForTests('');expect(analytics.trackCalendarView()).toBe(false);
});

it('legacy booking, checkout and verified purchase measurement cannot throw into customer flow',()=>{
 window.gtag=()=>{throw Error('blocked sink')};
 expect(()=>analytics.trackBeginBooking({participants:2,pricePerPerson:250,totalPrice:500})).not.toThrow();
 expect(analytics.trackBeginCheckout({participants:2,pricePerPerson:250,totalPrice:500})).toBe(false);
 const paid={bookingId:'BK-'+'c'.repeat(24),paymentStatus:'paid',status:'confirmed',totalPrice:500,participants:2,pricePerPerson:250};
 expect(analytics.trackPurchase(paid)).toBe(false);expect(localStorage.getItem('chilik-analytics-purchase:'+paid.bookingId)).toBeNull();
 window.gtag=function(){window.dataLayer.push(arguments)};expect(analytics.trackPurchase(paid)).toBe(true);expect(analytics.trackPurchase(paid)).toBe(false);
});

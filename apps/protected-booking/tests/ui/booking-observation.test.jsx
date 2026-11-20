import React from 'react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
const m=vi.hoisted(()=>({view:vi.fn(),select:vi.fn(),error:vi.fn(),pay:vi.fn(),fresh:vi.fn(),observer:null}));
vi.mock('../../src/utils/analytics',()=>({trackCalendarView:m.view,trackTourDateSelected:m.select,trackBookingError:m.error,trackBeginBooking:vi.fn(),trackBeginCheckout:vi.fn(),trackPurchase:vi.fn()}));
vi.mock('react-i18next',()=>({useTranslation:()=>({t:k=>k,i18n:{language:'he',dir:()=> 'rtl'}})}));
vi.mock('../../src/utils/firebase',()=>({db:null,APP_ID:'isolated'}));
vi.mock('../../src/utils/calendarAvailability',()=>({serverAvailabilityEnabled:true,getServerAvailability:m.fresh,freshAvailabilityRow:(d,date)=>d.publicAvailability?.[date]}));
vi.mock('../../src/hooks/useFirebaseData',()=>({useFirebaseData:()=>({availabilityStatus:'ready',serverAvailabilityEnabled:true,publicAvailability:{'2026-11-26':{available:true,availableSpots:30}},blocked:[],soldOut:[]}),getAvailableSpots:()=>30,getEffectiveMax:()=>30,getCurrentRegistrations:()=>0}));
vi.mock('../../src/utils/paymentService',()=>({makeIdempotencyKey:async()=> 'a'.repeat(32),createCreditPayment:m.pay,retryCreditPayment:vi.fn(),getPaymentStatus:vi.fn()}));
import BookingSection from '../../src/components/BookingSection';
import BookingForm from '../../src/components/BookingForm';
beforeEach(()=>{vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-11-20T07:00:00Z'));window.history.replaceState({},'','/booking?date=2026-11-26&participants=2');m.fresh.mockResolvedValue({availabilityStatus:'ready',publicAvailability:{'2026-11-26':{available:true,availableSpots:30}}});vi.spyOn(console,'error').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('counts a calendar only when its dates become visible, once per mount; passive changes send no selection',()=>{
 vi.stubGlobal('IntersectionObserver',class{constructor(cb){m.observer=cb}observe(){}disconnect(){}});
 const view=render(<BookingSection standalone onContinue={vi.fn()}/>);
 expect(m.view).not.toHaveBeenCalled();expect(m.observer).toBeTypeOf('function');act(()=>m.observer([{isIntersecting:false}]));expect(m.view).not.toHaveBeenCalled();
 act(()=>m.observer([{isIntersecting:true}]));act(()=>m.observer([{isIntersecting:true}]));expect(m.view).toHaveBeenCalledTimes(1);expect(m.select).not.toHaveBeenCalled();view.unmount();
});
it('records an available choice and a fresh availability failure without changing continuation',async()=>{
 const next=vi.fn();render(<BookingSection standalone onContinue={next}/>);
 fireEvent.click(screen.getAllByRole('button',{name:/bookingSection.dateCardLabel/}).find(b=>!b.disabled));
 expect(m.select).toHaveBeenCalledTimes(1);m.fresh.mockRejectedValueOnce(Error('customer@example.test'));
 fireEvent.click(screen.getAllByRole('button',{name:/bookingDesign.continue/})[0]);
 await waitFor(()=>expect(m.error).toHaveBeenCalledWith('date_selection','availability_unavailable'));expect(next).not.toHaveBeenCalled();
});
it('reports a fixed first validation field and a safe payment category while preserving focus and retry',async()=>{
 const redirect=vi.fn(),{container}=render(<BookingForm onPaymentRedirect={redirect}/>);
 fireEvent.submit(container.querySelector('form'));await waitFor(()=>expect(document.activeElement.id).toBe('name'));expect(m.error).toHaveBeenLastCalledWith('details','validation_name');
 fireEvent.change(container.querySelector('#name'),{target:{value:'Private customer'}});fireEvent.change(container.querySelector('#phone'),{target:{value:'0501234567'}});fireEvent.click(container.querySelector('#agreeToTerms'));
 m.pay.mockRejectedValueOnce(Error('customer@example.test')).mockResolvedValueOnce({bookingId:'BK-'+ 'a'.repeat(24),paymentUrl:'https://directng.tranzila.com/isolated/'});
 fireEvent.submit(container.querySelector('form'));await waitFor(()=>expect(m.error).toHaveBeenLastCalledWith('payment','checkout_unavailable'));
 fireEvent.submit(container.querySelector('form'));await waitFor(()=>expect(redirect).toHaveBeenCalledTimes(1));expect(m.error.mock.calls.every(args=>args.length===2)).toBe(true);
});

it('observes native browser validation without cancelling native validation or sending input values',()=>{
 const {container}=render(<BookingForm/>);
 const first=new Event('invalid',{cancelable:true}),second=new Event('invalid',{cancelable:true});
 act(()=>{container.querySelector('#name').dispatchEvent(first);container.querySelector('#phone').dispatchEvent(second)});
 expect(first.defaultPrevented).toBe(false);expect(second.defaultPrevented).toBe(false);
 expect(m.error).toHaveBeenCalledTimes(1);expect(m.error).toHaveBeenCalledWith('details','validation_name');
 expect(m.pay).not.toHaveBeenCalled();
});

import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import BookingDiscovery from '../../src/components/BookingDiscovery';
import MobileBookingBar from '../../src/components/MobileBookingBar';
const NOW = Date.parse('2026-11-17T12:00:00Z');
function fixture() {
  return { availabilityStatus: 'ready', validUntilMs: NOW + 60000, publicAvailability: {
    '2026-12-10': { available: true, availableSpots: 25, validUntilMs: NOW + 60000 },
    '2026-11-12': { available: true, availableSpots: 30, validUntilMs: NOW + 60000 },
    '2026-11-26': { available: true, availableSpots: 2, validUntilMs: NOW + 60000 },
    '2026-12-03': { available: false, availableSpots: 0, validUntilMs: NOW + 60000 },
    '2026-11-19': { available: true, availableSpots: 30, validUntilMs: NOW + 60000 },
    '2026-12-17': { available: true, availableSpots: 30, validUntilMs: NOW + 60000 },
    '2029-01-04': { available: true, availableSpots: 30, validUntilMs: NOW + 60000 },
  }};
}
beforeEach(() => { vi.useFakeTimers({ toFake:['Date'] }); vi.setSystemTime(NOW); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('nearby dates and distinct booking choices', () => {
  it('offers the earliest three fresh open dates and carries the selected date to the existing picker', async () => {
    const choose=vi.fn(); render(<BookingDiscovery language="he" loadAvailability={async () => fixture()} onSelectDate={choose} />);
    const dates=await screen.findAllByRole('button', { name:/2026/ });
    expect(dates.map(b=>b.dataset.tourDate)).toEqual(['2026-11-19','2026-11-26','2026-12-10']);
    fireEvent.click(dates[1]); expect(choose).toHaveBeenCalledWith('2026-11-26');
    expect(screen.getByRole('link', {name:'בחירת מועד'}).getAttribute('href')).toBe('/booking');
    expect(screen.getByRole('link', {name:'פרטי סיור לקבוצה'}).getAttribute('href')).toBe('/guides/private-tour-bnei-brak.html');
  });
  it('removes expired suggestions and keeps a useful regular booking path', async () => {
    vi.useRealTimers(); vi.useFakeTimers(); vi.setSystemTime(NOW);
    render(<BookingDiscovery language="en" loadAvailability={async () => fixture()} onSelectDate={vi.fn()} />);
    await act(async()=>{ await vi.advanceTimersByTimeAsync(0); });
    expect(screen.getAllByRole('button', {name:/2026/})).toHaveLength(3);
    await act(async()=>{ await vi.advanceTimersByTimeAsync(60001); });
    expect(screen.queryAllByRole('button', {name:/2026/})).toHaveLength(0);
    expect(screen.getByRole('link',{name:'Choose a date'}).getAttribute('href')).toBe('/booking');
  });
  it('does not advertise unknown or closed dates on an outage and aborts the pending read on unmount', async () => {
    let signal; const load=({signal:s})=>{signal=s;return Promise.reject(Error('unavailable'));};
    const result=render(<BookingDiscovery language="en" loadAvailability={load} onSelectDate={vi.fn()} />);
    await screen.findByText('Check dates in the booking calendar.');
    expect(screen.queryAllByRole('button',{name:/2026/})).toHaveLength(0);
    expect(screen.getByRole('link',{name:'Food tour guide'}).getAttribute('href')).toBe('/guides/bnei-brak-food-tour-en.html');
    result.unmount(); expect(signal.aborted).toBe(true);
  });
});
describe('mobile continuation delegates to the existing action', () => {
  it('hides for a visible primary action and editable focus, and obeys disabled state', () => {
    let observe; vi.stubGlobal('IntersectionObserver', class { constructor(cb){observe=cb;} observe(){} disconnect(){} });
    const action=vi.fn(), primary={current:document.createElement('button')};
    const props={language:'he', date:'2026-11-26', participants:2, total:500, actionLabel:'המשך לפרטים', onContinue:action, primaryActionRef:primary};
    const view=render(<><input aria-label="שם"/><MobileBookingBar {...props}/></>);
    act(()=>observe([{isIntersecting:false}]));
    fireEvent.click(screen.getByRole('button',{name:'המשך לפרטים'})); expect(action).toHaveBeenCalledTimes(1);
    fireEvent.focus(screen.getByRole('textbox')); expect(screen.queryByRole('button',{name:'המשך לפרטים'})).toBeNull();
    fireEvent.blur(screen.getByRole('textbox')); expect(screen.getByRole('button',{name:'המשך לפרטים'})).toBeTruthy();
    act(()=>observe([{isIntersecting:true}])); expect(screen.queryByRole('button',{name:'המשך לפרטים'})).toBeNull();
    act(()=>observe([{isIntersecting:false}])); view.rerender(<><input aria-label="שם"/><MobileBookingBar {...props} disabled/></>);
    fireEvent.click(screen.getByRole('button',{name:'המשך לפרטים'})); expect(action).toHaveBeenCalledTimes(1);
  });
});

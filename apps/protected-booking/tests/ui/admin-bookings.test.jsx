import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import AdminBookings from '../../src/components/AdminBookings';
const mocks = vi.hoisted(() => ({ listeners: {}, request: vi.fn() }));
vi.mock('../../src/utils/firebase', () => ({ db: {} }));
vi.mock('../../src/utils/adminService', () => ({ adminRequest: mocks.request, adminErrorMessage: () => 'עדכון לא אושר' }));
vi.mock('../../src/hooks/useFirebaseData', () => ({ useFirebaseData: () => null }));
vi.mock('firebase/firestore', () => ({ collection: (_, name) => name, query: value => value, orderBy: vi.fn(), limit: vi.fn(), onSnapshot: (name, success, failure) => { mocks.listeners[name] = { success, failure }; if(name === 'bookings') success({ forEach: fn => fn({ id: 'BK-123', data: () => ({ schemaVersion: 2, bookingId: 'BK-123', name: 'Test', status: 'confirmed', paymentStatus: 'paid', phone: '', tourDate: '2026-10-08', participants: 2, totalPrice: 500 }) }) }); else success({ docs: [] }); return vi.fn(); } }));
afterEach(cleanup);
beforeEach(() => { mocks.request.mockReset().mockResolvedValue({}); vi.spyOn(window, 'confirm').mockReturnValue(false); });
describe('admin booking safeguards', () => {
  it('requires explicit cancellation and explains no refund', async () => {
    render(<AdminBookings />);
    fireEvent.click(screen.getByRole('button', { name: 'בטל הזמנה' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('אינה מבצעת החזר כספי'));
    expect(mocks.request).not.toHaveBeenCalled();
    window.confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: 'בטל הזמנה' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('updateBookingStatus', { bookingId: 'BK-123', status: 'cancelled' }));
  });
  it('prevents duplicate action while an update is unresolved', async () => {
    window.confirm.mockReturnValue(true); mocks.request.mockReturnValue(new Promise(() => {}));
    render(<AdminBookings />);
    const cancel = screen.getByRole('button', { name: 'בטל הזמנה' });
    fireEvent.click(cancel); fireEvent.click(cancel);
    expect(cancel.disabled).toBe(true); expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it('distinguishes load errors from empty data and disables stale actions', async () => {
    render(<AdminBookings />);
    act(() => { mocks.listeners.bookings.failure(new Error('offline')); mocks.listeners.integrationJobs.failure(); });
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'בטל הזמנה' }).disabled).toBe(true);
    expect(screen.queryByText('אין פעולות סנכרון להצגה')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'רענן נתונים' }));
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
  it('labels provider acceptance accurately and requeues blocked jobs', async () => {
    render(<AdminBookings />);
    act(() => mocks.listeners.integrationJobs.success({ docs: [
      { id: 'email-job', data: () => ({ kind: 'email', status: 'sent' }) },
      { id: 'blocked-job', data: () => ({ kind: 'calendar', status: 'blocked' }) }
    ] }));
    expect(screen.getByText(/הספק קיבל את בקשת המשלוח/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'הוסף לתור שוב blocked-job' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith('retryIntegrationJob', { jobId: 'blocked-job' }));
  });
  it('surfaces uncertain mutation failures without claiming success', async () => {
    window.confirm.mockReturnValue(true); mocks.request.mockRejectedValue(new Error('timeout'));
    render(<AdminBookings />);
    fireEvent.click(screen.getByRole('button', { name: 'בטל הזמנה' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('עדכון לא אושר'));
  });

});

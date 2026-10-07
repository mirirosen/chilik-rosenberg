import { beforeEach, afterEach, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
const input = { name: 'Private Test Name', phone: '0501234567', email: 'private@example.test', dateOfBirth: '1990-01-01', tourDate: '2026-10-08', participants: 2, paymentMethod: 'credit', agreeToTerms: true, language: 'he', notes: 'private note' };
beforeEach(() => { vi.resetModules(); vi.stubEnv('MODE', 'preprod'); vi.stubGlobal('crypto', webcrypto); vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Network forbidden'); })); sessionStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-02T12:00:00Z')); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const service = () => import('../../src/utils/demoBookingService');
async function create(s, patch = {}) { const booking = { ...input, ...patch }; const key = await s.makeDemoIdempotencyKey(booking); return s.demoBookingApi.createBooking(booking, key); }
it('same-request concurrent keys and repeated creation reserve participants exactly once', async () => {
  const s = await service(); const [a,b] = await Promise.all([s.makeDemoIdempotencyKey(input),s.makeDemoIdempotencyKey(input)]); expect(a).toBe(b);
  const [one,two] = await Promise.all([s.demoBookingApi.createBooking(input,a),s.demoBookingApi.createBooking(input,b)]);
  expect(one.bookingId).toBe(two.bookingId); expect(s.getDemoAvailability().tourDates[input.tourDate].currentRegistrations).toBe(2);
  // WebCrypto completion order is unspecified: either concurrent call may reuse.
  expect([one,two].filter(result => result.reused === true)).toHaveLength(1);
  expect((await s.demoBookingApi.createBooking(input,a)).reused).toBe(true);
});
it('refresh restores state and stores only sample customer details and digests', async () => {
  const s = await service(), record = await create(s); await s.resolveDemoBooking(record.bookingId,'success');
  vi.resetModules(); const restored = await service(); expect(restored.getDemoBooking(record.bookingId)).toMatchObject({status:'confirmed',paymentStatus:'paid',name:'Demo Customer'});
  const storage = sessionStorage.getItem('chilik-design-demo-v1');
  for(const value of ['Private Test Name','0501234567','private@example.test','1990-01-01','private note']) expect(storage).not.toContain(value);
  expect(fetch).not.toHaveBeenCalled();
});
it('30 participants fill the date; the same request recovers and a new request is rejected', async () => {
  const s = await service(); const first = await create(s,{participants:20}); await create(s,{participants:10});
  expect(s.getDemoAvailability().tourDates[input.tourDate].currentRegistrations).toBe(30);
  expect((await create(s,{participants:20})).bookingId).toBe(first.bookingId);
  await expect(create(s,{participants:1})).rejects.toThrow('capacity-exceeded');
  await s.resolveDemoBooking(first.bookingId,'decline'); await s.resolveDemoBooking(first.bookingId,'decline');
  expect(s.getDemoAvailability().tourDates[input.tourDate].currentRegistrations).toBe(10);
  await expect(create(s,{participants:20})).rejects.toThrow('booking-closed');
});
it('pending, declined and cancelled outcomes never report a paid confirmation', async () => {
  const s = await service(); const record = await create(s);
  expect((await s.resolveDemoBooking(record.bookingId,'pending')).paymentStatus).toBe('awaiting_payment');
  expect((await s.resolveDemoBooking(record.bookingId,'cancel')).paymentStatus).toBe('cancelled');
  expect(s.getDemoAvailability().tourDates[input.tourDate]).toBeUndefined();
  await expect(s.demoBookingApi.getPaymentStatus('BK-'+'a'.repeat(24))).rejects.toThrow('not-found');
});
it('paid cancellation and late capture require review and never restore released seats', async () => {
  const s = await service(); const record = await create(s); await s.resolveDemoBooking(record.bookingId,'success');
  expect(await s.resolveDemoBooking(record.bookingId,'cancel')).toMatchObject({status:'cancelled',paymentStatus:'paid',refundStatus:'manual_review_required'});
  const another = await create(s,{participants:1}); vi.advanceTimersByTime(15*60000+1);
  expect(s.getDemoBooking(another.bookingId).paymentStatus).toBe('expired');
  expect(await s.resolveDemoBooking(another.bookingId,'success')).toMatchObject({status:'payment_review',paymentStatus:'pending_review',capacityReserved:false});
  expect(s.getDemoAvailability().tourDates[input.tourDate]).toBeUndefined();
});
it('manual booking approval is separate from card payment capture', async () => {
  const s = await service(); const record = await create(s,{paymentMethod:'bit'});
  expect(await s.resolveDemoBooking(record.bookingId,'success')).toMatchObject({status:'confirmed',paymentStatus:'pending'});
});
it('production mode cannot call the simulator even when imported directly', async () => {
  vi.stubEnv('MODE','production'); const s = await service();
  await expect(s.makeDemoIdempotencyKey(input)).rejects.toThrow('demo-unavailable'); expect(fetch).not.toHaveBeenCalled();
});

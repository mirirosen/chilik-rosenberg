'use strict';
// Explicit separate suite; never falls through to a production Firestore project.
const test = require('node:test'), assert = require('node:assert/strict');
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST required');
const admin = require('firebase-admin');
const { createBookingService } = require('../src/booking-service');
const app = admin.initializeApp({ projectId: 'demo-chilik-repair' });
const db = app.firestore(), service = createBookingService(db, admin.firestore.Timestamp);
const now = Date.parse('2026-10-01T10:00:00Z');
const input = { name: 'Test', phone: '0501234567', email: 'test@example.com', participants: 2, tourDate: '2026-10-08', paymentMethod: 'credit', dateOfBirth: '1990-01-01', agreeToTerms: true };
test('real Firestore last-seat contention, retries, callback read-before-write and release', async () => {
  await db.doc('artifacts/hilik-rosenberg-v1/public/data/settings/global').set({ globalMaxParticipants: 2 });
  const outcomes = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => service.create(`owner${i}`, 'a'.repeat(32), input, now)));
  const winners = outcomes.filter(o => o.status === 'fulfilled'); assert.equal(winners.length, 1);
  const booking = winners[0].value;
  assert.equal((await service.tourRef(input.tourDate).get()).data().currentRegistrations, 2);
  const receipt = { verified: true, bookingId: booking.bookingId, transactionKey: 'test-terminal:1', amount: 500, currency: 'ILS' };
  await Promise.all(Array.from({ length: 4 }, () => service.change(booking.bookingId, 'paid', 'verified-test-adapter', receipt, now)));
  assert.equal((await service.bookingRef(booking.bookingId).get()).data().status, 'confirmed');
  assert.equal((await db.collection('integrationJobs').get()).size, 4);
  await Promise.all(Array.from({ length: 4 }, () => service.change(booking.bookingId, 'cancel', 'test-admin', null, now)));
  assert.equal((await service.tourRef(input.tourDate).get()).data().currentRegistrations, 0);
  assert.equal((await db.collection('integrationJobs').get()).size, 6);
});
test.after(async () => { await db.terminate(); await app.delete(); });

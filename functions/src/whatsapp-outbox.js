'use strict';
const RECIPIENT = '0506724312';
const { SENDER, RECIPIENT: INTERNATIONAL_RECIPIENT } = require('./whatsapp-adapter');
function enqueueConfirmedBookingWhatsApp(tx, db, booking, now) {
  if (booking.status !== 'confirmed' || !/^BK-[a-f0-9]{24}$/.test(booking.bookingId || '') || !Number.isInteger(booking.revision) || booking.revision < 2) throw new Error('whatsapp-job-invalid');
  const id = `${booking.bookingId}-${booking.revision}-whatsapp`;
  tx.create(db.doc(`integrationJobs/${id}`), {
    kind: 'whatsapp', bookingId: booking.bookingId, revision: booking.revision,
    event: 'confirmed', tourDate: booking.tourDate, sender: SENDER, recipient: INTERNATIONAL_RECIPIENT,
    // Validation belongs to the delivery worker: an invalid notification must
    // never roll back an independently verified payment/booking confirmation.
    whatsappSnapshot: { name: booking.name, tourDate: booking.tourDate, participants: booking.participants }, status: 'pending', attempts: 0,
    nextAttemptAt: now, createdAt: now, updatedAt: now,
  });
}
function formatNewBookingWhatsApp(booking) {
  const name = typeof booking?.name === 'string' ? booking.name.trim().replace(/\s+/g, ' ') : '';
  const date = booking?.tourDate, participants = booking?.participants;
  if (!name || name.length > 120 || /[\u0000-\u001f\u007f]/.test(name) || !/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date || !Number.isInteger(participants) || participants < 1 || participants > 20) throw new Error('whatsapp-snapshot-invalid');
  return `${name} ${date.slice(8, 10)}/${date.slice(5, 7)} ${participants} אנשים`;
}
function enqueueNewBookingWhatsApp(tx, db, booking, now) {
  if (!/^BK-[a-f0-9]{24}$/.test(booking.bookingId || '')) throw new Error('invalid-booking-reference');
  // One immutable notification per new booking, not per participant or revision.
  // This runs inside the same transaction as booking/capacity creation.
  const id = `${booking.bookingId}-new-booking`, ref = db.doc(`whatsappOutbox/${id}`);
  tx.create(ref, { bookingId: booking.bookingId, kind: 'new-booking', recipient: RECIPIENT, text: formatNewBookingWhatsApp(booking), status: 'disabled', idempotencyKey: id, createdAt: now });
}
function createMockWhatsAppProcessor(db, Timestamp, { mode = 'disabled' } = {}) {
  // There is deliberately no provider, credential or send implementation here.
  // A mock acknowledgement is an atomic DB operation and never a delivery.
  return { async run(ref, nowMs = Date.now()) {
    if (mode !== 'mock') return { disabled: true };
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref), job = snap.data();
      if (!job) throw new Error('not-found');
      if (job.status === 'mock_sent') return { providerId: job.mockReceipt, reused: true };
      if (job.status !== 'disabled' || job.idempotencyKey !== ref.id || job.recipient !== RECIPIENT) throw new Error('whatsapp-job-invalid');
      const mockReceipt = `mock:${ref.id}`;
      tx.update(ref, { status: 'mock_sent', mockReceipt, mockProcessedAt: Timestamp.fromMillis(nowMs) });
      return { providerId: mockReceipt, simulated: true };
    });
  } };
}
module.exports = { RECIPIENT, formatNewBookingWhatsApp, enqueueNewBookingWhatsApp, createMockWhatsAppProcessor, enqueueConfirmedBookingWhatsApp };

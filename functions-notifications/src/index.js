'use strict';
// Booking notification emails for chilik-tours.com (separate codebase "notifications";
// does not touch the booking/payment functions). Provider: Gmail SMTP via nodemailer,
// sent from hr20192022@gmail.com. Requires secret GMAIL_APP_PASSWORD (a Google App Password).
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createGmailSender } = require('./mailer');
const { createNotifier } = require('./notifier');

admin.initializeApp();
const db = admin.firestore();
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const OWNER_TO = defineString('NOTIFY_OWNER_TO', { default: 'hr20192022@gmail.com' });
// Only bookings created after this moment are eligible (no retroactive mail).
const CUTOFF = defineString('NOTIFY_CUTOFF_ISO', { default: '2026-10-24T17:30:00Z' });
// Firestore (default) is in nam5; triggers and schedules run next to the booking codebase.
const REGION = 'us-central1';

let notifier = null;
function getNotifier() {
  if (notifier) return notifier;
  const cutoffMs = Date.parse(CUTOFF.value());
  if (!Number.isFinite(cutoffMs)) throw new Error('invalid-NOTIFY_CUTOFF_ISO');
  const { FieldValue, Timestamp } = admin.firestore;
  notifier = createNotifier({
    db, send: createGmailSender(GMAIL_APP_PASSWORD.value()), ownerTo: OWNER_TO.value(), cutoffMs,
    serverTimestamp: () => FieldValue.serverTimestamp(), increment: n => FieldValue.increment(n), fromMillis: ms => Timestamp.fromMillis(ms),
  });
  return notifier;
}

exports.notifyOwnerOnBooking = onDocumentCreated({ document: 'bookings/{id}', region: REGION, secrets: [GMAIL_APP_PASSWORD], retry: false },
  async event => { await getNotifier().onBookingCreated(event.data); });

exports.notifyUnpaidBookings = onSchedule({ schedule: 'every 10 minutes', region: REGION, secrets: [GMAIL_APP_PASSWORD] },
  async () => { await getNotifier().sweepUnpaid(); });

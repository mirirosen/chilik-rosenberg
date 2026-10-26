'use strict';
// Booking notification emails for chilik-tours.com (separate codebase "notifications";
// does not touch the booking/payment functions). Provider: Gmail SMTP via nodemailer,
// sent from hr20192022@gmail.com. Requires secret GMAIL_APP_PASSWORD (a Google App Password).
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString, defineBoolean } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createGmailSender } = require('./mailer');
const { createNotifier } = require('./notifier');

admin.initializeApp();
const db = admin.firestore();
const GMAIL_APP_PASSWORD = defineSecret('GMAIL_APP_PASSWORD');
const OWNER_TO = defineString('NOTIFY_OWNER_TO', { default: 'hr20192022@gmail.com' });
// Only bookings created after this moment are eligible (no retroactive mail).
const CUTOFF = defineString('NOTIFY_CUTOFF_ISO', { default: '2026-10-24T17:30:00Z' });
// Customer emails ("booking received" / "booking confirmed") are OFF unless both
// NOTIFY_CUSTOMER_EMAILS=true and NOTIFY_CUSTOMER_CUTOFF_ISO is a valid ISO time;
// only bookings created at/after that cutoff are mailed. Owner mail is unaffected.
const CUSTOMER_EMAILS = defineBoolean('NOTIFY_CUSTOMER_EMAILS', { default: false });
const CUSTOMER_CUTOFF = defineString('NOTIFY_CUSTOMER_CUTOFF_ISO', { default: '' });
// Firestore (default) is in nam5; triggers and schedules run next to the booking codebase.
const REGION = 'us-central1';

let notifier = null;
function getNotifier() {
  if (notifier) return notifier;
  const cutoffMs = Date.parse(CUTOFF.value());
  if (!Number.isFinite(cutoffMs)) throw new Error('invalid-NOTIFY_CUTOFF_ISO');
  const { FieldValue, Timestamp } = admin.firestore;
  const customerCutoffMs = Date.parse(CUSTOMER_CUTOFF.value() || '');
  notifier = createNotifier({
    customer: { enabled: CUSTOMER_EMAILS.value() === true, cutoffMs: Number.isFinite(customerCutoffMs) ? customerCutoffMs : null },
    db, send: createGmailSender(GMAIL_APP_PASSWORD.value()), ownerTo: OWNER_TO.value(), cutoffMs,
    serverTimestamp: () => FieldValue.serverTimestamp(), increment: n => FieldValue.increment(n), fromMillis: ms => Timestamp.fromMillis(ms),
  });
  return notifier;
}

exports.notifyOwnerOnBooking = onDocumentCreated({ document: 'bookings/{id}', region: REGION, secrets: [GMAIL_APP_PASSWORD], retry: false },
  async event => { await getNotifier().onBookingCreated(event.data); });

exports.notifyUnpaidBookings = onSchedule({ schedule: 'every 10 minutes', region: REGION, secrets: [GMAIL_APP_PASSWORD] },
  async () => { await getNotifier().sweepUnpaid(); });

// Customer triggers return before touching the notifier while the flag is off.
const customerOff = () => CUSTOMER_EMAILS.value() !== true;

exports.notifyCustomerOnBooking = onDocumentCreated({ document: 'bookings/{id}', region: REGION, secrets: [GMAIL_APP_PASSWORD], retry: true },
  async event => { if (customerOff()) return; await getNotifier().onCustomerBookingCreated(event.data); });

exports.notifyCustomerOnPaid = onDocumentUpdated({ document: 'bookings/{id}', region: REGION, secrets: [GMAIL_APP_PASSWORD], retry: true },
  async event => { if (customerOff()) return; await getNotifier().onCustomerBookingUpdated(event.data); });

'use strict';
// Booking notification emails for chilik-tours.com (separate codebase "notifications";
// does not touch the booking/payment functions). Provider: Gmail SMTP via nodemailer,
// sent from hr20192022@gmail.com. Requires secret GMAIL_APP_PASSWORD (a Google App Password).
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret, defineString } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createGmailSender } = require('./mailer');
const { createNotifier } = require('./notifier');
const { createWahaSender } = require('./whatsapp');
const { createWaNotifier } = require('./wa-notifier');

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

// WhatsApp to Hilik via the existing Newreel WAHA host (055-309-4372), send-only.
// Secrets copied from hilik-rosenberg-ddb9b STUDIO_WHATSAPP_WAHA_*.
const WAHA_API_ORIGIN = defineSecret('WAHA_API_ORIGIN');
const WAHA_API_KEY = defineSecret('WAHA_API_KEY');
const WAHA_SESSION = defineString('WAHA_SESSION', { default: 'default' });
const WA_OWNER_TO = defineString('CHILIK_WHATSAPP_OWNER_TO', { default: '972506724312' });
// Set to the deploy time of phase 1: older bookings never get a WhatsApp, no backfill.
const WA_CUTOFF = defineString('CHILIK_WHATSAPP_CUTOFF_ISO', { default: '2026-10-26T06:55:00Z' });
// Customer messages stay OFF unless this is exactly 'true'.
const WA_CUSTOMER = defineString('CHILIK_WHATSAPP_CUSTOMER_ENABLED', { default: 'false' });
let wa = null;
function getWa() {
  if (wa) return wa;
  wa = createWaNotifier({
    db, send: createWahaSender({ origin: WAHA_API_ORIGIN.value(), apiKey: WAHA_API_KEY.value(), session: WAHA_SESSION.value() }),
    ownerTo: WA_OWNER_TO.value(), cutoffMs: Date.parse(WA_CUTOFF.value()), customerEnabled: WA_CUSTOMER.value() === 'true',
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
  });
  return wa;
}
const WA_OPTS = { region: REGION, secrets: [WAHA_API_ORIGIN, WAHA_API_KEY], retry: false, maxInstances: 2 };
exports.whatsappOwnerOnBooking = onDocumentCreated({ document: 'bookings/{id}', ...WA_OPTS },
  async event => { if (event.data) await getWa().onCreated(event.data); });
exports.whatsappOnBookingPaid = onDocumentUpdated({ document: 'bookings/{id}', ...WA_OPTS },
  async event => { if (event.data) await getWa().onUpdated(event.data.before, event.data.after); });

'use strict';
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { FIREBASE_PROJECT } = require('./deployment-config');
const { createBookingService } = require('./booking-service');
const { createJobRunner } = require('./integration-jobs');
const { createBookingApi } = require('./api');
const { SECRET_NAMES, loadPaymentConfiguration, createRuntimePaymentFlow } = require('./payment-runtime');
const { createRuntimeReconciler } = require('./payment-reconciliation');
const { createIntegrationAdapters } = require('./integration-adapters');
const { createCalendarRuntime } = require('./calendar-runtime');
const { createCalendarApi } = require('./calendar-api');
const { createWhatsAppRuntime } = require('./whatsapp-runtime');
admin.initializeApp({ projectId: FIREBASE_PROJECT });
const db = admin.firestore(), Timestamp = admin.firestore.Timestamp;
const calendarRuntime = createCalendarRuntime({ db, secretFactory: name => defineSecret(name) });
const bookings = createBookingService(db, Timestamp, { weeklyPolicy: calendarRuntime.policy });
// Declarations only. Values are accessed inside a configured invocation, never
// during deployment discovery. No secret is created/set by loading this file.
const paymentSecrets = SECRET_NAMES.map(name => defineSecret(name));
const readSecret = name => paymentSecrets[SECRET_NAMES.indexOf(name)]?.value() || '';
const readConfiguration = () => loadPaymentConfiguration({ env: process.env, readSecret });
const paymentFlow = createRuntimePaymentFlow({ db, bookings, Timestamp, readConfiguration });
const paymentReconciler = createRuntimeReconciler({ db, bookings, Timestamp, readSecret, envFor: () => process.env });
const whatsappRuntime = createWhatsAppRuntime({ db, Timestamp, env: process.env, secretFactory: name => defineSecret(name) });
const jobs = createJobRunner(db, Timestamp, { ...createIntegrationAdapters({ db, config: { calendar: calendarRuntime.adapterConfig }, getAccessToken: calendarRuntime.getAccessToken }), whatsapp: whatsappRuntime.adapter });

Object.assign(exports, createBookingApi({
  onRequest, onSchedule, db, Timestamp, bookings, jobs, paymentFlow, paymentReconciler, paymentSecrets,
  verifyIdToken: (...args) => admin.auth().verifyIdToken(...args),
  integrationSecrets: [...(calendarRuntime.writesEnabled ? calendarRuntime.secretBindings : []), ...whatsappRuntime.secretBindings],
  logger: console,
  enabled: process.env.CHILIK_BOOKING_RUNTIME_ENABLED === 'true',
  schedulesEnabled: process.env.CHILIK_BOOKING_SCHEDULERS_ENABLED === 'true',
}));
Object.assign(exports, createCalendarApi({ db, onRequest, onSchedule, runtime: calendarRuntime }));

'use strict';
// Approved existing identities; this file declares deployment metadata only.
// No identity, permission, key, secret, or deployment is created by loading it.
const FIREBASE_PROJECT = 'hilik-site';
const FUNCTION_REGION = 'us-central1';
const BOOKING_RUNTIME = `chilik-booking-runtime@${FIREBASE_PROJECT}.iam.gserviceaccount.com`;
const INTEGRATION_RUNTIME = `chilik-integration-runtime@${FIREBASE_PROJECT}.iam.gserviceaccount.com`;
module.exports = Object.freeze({ FIREBASE_PROJECT, FUNCTION_REGION, BOOKING_RUNTIME, INTEGRATION_RUNTIME });

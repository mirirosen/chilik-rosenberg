#!/usr/bin/env node
'use strict';
// Predeploy gate for firebase.booking.functions.json.
// The no-hold-before-payment backend creates bank/bit bookings with capacityReserved:false.
// The admin UI currently live on hilik-site shows "אשר הזמנה" only for capacityReserved===true,
// so deploying these functions without the matching admin hosting leaves new bookings unconfirmable.
// The live-only hosting features (18+/terms checkbox, admin password setup/reset, booking-screen design)
// are recovered in this branch, so its hosting build can ship; functions and hosting must go out together.
const ACK_VAR = 'CHILIK_NO_HOLD_RELEASE_ACK';
const ACK_VALUE = 'functions-and-admin-hosting-together';

function checkGate(env = process.env) {
  if (env[ACK_VAR] === ACK_VALUE) return { ok: true };
  return {
    ok: false,
    message: [
      'BLOCKED: no-hold-before-payment functions must not be deployed alone.',
      'The live admin UI cannot confirm bookings with capacityReserved:false.',
      'Deploy only together with admin hosting built from a branch that contains both',
      'the live hosting source and this branch\'s admin changes, in one window.',
      `When that is true, rerun with ${ACK_VAR}=${ACK_VALUE}.`,
      'חסום: אין לפרוס את פונקציות "אין שמירת מקום לפני תשלום" בלי ה-hosting המתאים של ממשק הניהול באותו חלון פריסה.'
    ].join('\n')
  };
}

module.exports = { checkGate, ACK_VAR, ACK_VALUE };

if (require.main === module) {
  const result = checkGate();
  if (!result.ok) {
    console.error(result.message);
    process.exit(1);
  }
  console.log('no-hold release gate acknowledged: functions + admin hosting deploy together.');
}

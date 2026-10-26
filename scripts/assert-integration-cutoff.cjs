#!/usr/bin/env node
'use strict';
// Predeploy gate for firebase.booking.functions.json.
// With CHILIK_INTEGRATION_SCHEDULER_ENABLED=true, processIntegrationJobs claims nothing while
// CHILIK_INTEGRATION_CUTOFF_ISO is the shipped placeholder or not a valid UTC ISO time, so
// integrations would stay silently off. The deploy is refused until the cutoff is set.
const fs = require('fs');
const path = require('path');
const SETTINGS_PATH = path.join(__dirname, '..', 'functions', 'booking-deployment-settings.json');
const PLACEHOLDER = 'SET_TO_DEPLOY_TIME_UTC';
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const MAX_FUTURE_MS = 60 * 60000;

function checkCutoff(settings, nowMs = Date.now()) {
  if (settings?.CHILIK_INTEGRATION_SCHEDULER_ENABLED !== 'true') return { ok: true };
  const value = settings.CHILIK_INTEGRATION_CUTOFF_ISO;
  const fail = reason => ({
    ok: false,
    message: [
      `BLOCKED: CHILIK_INTEGRATION_CUTOFF_ISO ${reason} while CHILIK_INTEGRATION_SCHEDULER_ENABLED is "true".`,
      'Set it in functions/booking-deployment-settings.json to the deploy time in UTC,',
      'e.g. the output of: date -u +%Y-%m-%dT%H:%M:%SZ',
      'חסום: יש להגדיר את CHILIK_INTEGRATION_CUTOFF_ISO לזמן הפריסה (UTC) לפני פריסת הפונקציות.'
    ].join('\n')
  });
  if (value === undefined || value === '') return fail('is missing');
  if (value === PLACEHOLDER) return fail(`is still the placeholder ${PLACEHOLDER}`);
  const ms = Date.parse(value);
  // Date.parse rolls some invalid dates over (e.g. 2026-02-30); the round trip catches them.
  if (!ISO_UTC.test(value) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 19) !== value.slice(0, 19)) return fail(`"${value}" is not a valid UTC ISO time (YYYY-MM-DDTHH:MM:SSZ)`);
  // A future cutoff would skip every job created until then.
  if (ms > nowMs + MAX_FUTURE_MS) return fail(`"${value}" is more than an hour in the future`);
  return { ok: true };
}

module.exports = { checkCutoff, PLACEHOLDER, SETTINGS_PATH };

if (require.main === module) {
  let settings;
  try { settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); }
  catch (error) { console.error(`BLOCKED: cannot read ${SETTINGS_PATH}: ${error.message}`); process.exit(1); }
  const result = checkCutoff(settings);
  if (!result.ok) { console.error(result.message); process.exit(1); }
  console.log(settings.CHILIK_INTEGRATION_SCHEDULER_ENABLED === 'true'
    ? `integration cutoff set: ${settings.CHILIK_INTEGRATION_CUTOFF_ISO}`
    : 'integration scheduler disabled: no cutoff required.');
}

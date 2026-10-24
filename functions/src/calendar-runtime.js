'use strict';
const { APPROVED_WEEK_POLICY, localDateAt, weekStartDate } = require('./weekly-availability');
const { createCalendarImporter } = require('./calendar-importer');
const { createGoogleCalendarTokenProvider, tokenConfigurationReady, SECRET_NAMES } = require('./google-calendar-token');
const DISABLED_CALENDAR_FEATURES = Object.freeze({ scheduler: false, publicAvailability: false, weeklyEnforcement: false, calendarWrites: false });
const DISABLED_CALENDAR_CONFIG = Object.freeze({ enabled: false, readEnabled: false, provider: 'google', mode: 'reconciled-event', calendarId: 'hr20192022@gmail.com', idempotencyVerified: false, reconciliationVerified: false, privateEventAccessVerified: false, accessRole: null, oauth: Object.freeze({ enabled: false, existingGrantVerified: false, grantedScopes: [] }) });
function loadCalendarConfiguration(env = {}) {
  const flag = name => env[name] === 'true';
  let scopes = [];
  try { const parsed = JSON.parse(env.CHILIK_CALENDAR_GRANTED_SCOPES_JSON || '[]'); if (Array.isArray(parsed) && parsed.length <= 20 && parsed.every(s => typeof s === 'string' && s.length < 256)) scopes = parsed; } catch { /* Invalid grants remain unavailable. */ }
  const config = { ...DISABLED_CALENDAR_CONFIG,
    calendarId: env.CHILIK_CALENDAR_ID || DISABLED_CALENDAR_CONFIG.calendarId,
    readEnabled: flag('CHILIK_CALENDAR_READ_ENABLED'),
    privateEventAccessVerified: flag('CHILIK_CALENDAR_PRIVATE_ACCESS_VERIFIED'),
    accessRole: env.CHILIK_CALENDAR_ACCESS_ROLE || null,
    oauth: { enabled: flag('CHILIK_CALENDAR_OAUTH_ENABLED'), existingGrantVerified: flag('CHILIK_CALENDAR_GRANT_VERIFIED'), grantedScopes: scopes },
  };
  const ready = config.calendarId === DISABLED_CALENDAR_CONFIG.calendarId && config.readEnabled && config.privateEventAccessVerified
    && ['owner', 'writer'].includes(config.accessRole) && tokenConfigurationReady(config.oauth, false);
  return { config, features: { ...DISABLED_CALENDAR_FEATURES,
    weeklyEnforcement: flag('CHILIK_CALENDAR_WEEKLY_ENFORCEMENT_ENABLED'),
    scheduler: ready && flag('CHILIK_CALENDAR_SCHEDULER_ENABLED'),
    publicAvailability: ready && flag('CHILIK_CALENDAR_PUBLIC_AVAILABILITY_ENABLED'),
  } };
}
function upcomingThursdays(nowMs = Date.now()) {
  const today = localDateAt(nowMs, 'Asia/Jerusalem');
  let day = Date.parse(`${today}T00:00:00Z`);
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(new Date(nowMs)));
  const dates = [];
  for (let i = 0; i <= 84; i++, day += 86400000) {
    if (new Date(day).getUTCDay() === 4 && !(i === 0 && hour >= 20)) dates.push(new Date(day).toISOString().slice(0, 10));
  }
  return dates;
}
function calendarImportRange(nowMs = Date.now(), policy = APPROVED_WEEK_POLICY) {
  const fromDate = weekStartDate(localDateAt(nowMs, policy.timeZone), policy);
  // 13 complete weeks cover the booking horizon including the final Thursday.
  const toDate = new Date(Date.parse(`${fromDate}T00:00:00Z`) + 91 * 86400000).toISOString().slice(0, 10);
  return { fromDate, toDate };
}
function createCalendarRuntime({ db, config = DISABLED_CALENDAR_CONFIG, features = DISABLED_CALENDAR_FEATURES, secretFactory, getAccessToken, OAuth2ClientFactory, fetchImpl, now = Date.now }) {
  const policy = { ...APPROVED_WEEK_POLICY, enabled: features.weeklyEnforcement === true };
  const readsEnabled = features.scheduler === true && policy.enabled && config.readEnabled === true;
  const writesEnabled = features.calendarWrites === true && policy.enabled && config.enabled === true;
  const usesTokens = readsEnabled || writesEnabled;
  const secretRefs = {};
  // Off means no secret declarations/reads and no auth SDK construction.
  if (usesTokens && !getAccessToken && tokenConfigurationReady(config.oauth, writesEnabled) && typeof secretFactory === 'function') {
    for (const name of Object.values(SECRET_NAMES)) secretRefs[name] = secretFactory(name);
  }
  const tokenFor = getAccessToken || createGoogleCalendarTokenProvider({ config: usesTokens ? config.oauth : {}, writes: writesEnabled, readSecret: name => secretRefs[name]?.value(), OAuth2ClientFactory });
  const importer = createCalendarImporter({ db, config: { ...config, readEnabled: readsEnabled }, policy, fetchImpl, getAccessToken: tokenFor, now });
  return {
    policy, features, readsEnabled, writesEnabled, publicEnabled: features.publicAvailability === true && policy.enabled,
    adapterConfig: { ...config, enabled: writesEnabled }, getAccessToken: tokenFor,
    secretBindings: Object.values(secretRefs),
    async importUpcoming() { if (!readsEnabled) return { status: 'disabled', weeks: 0 }; return importer(calendarImportRange(now(), policy)); },
  };
}
module.exports = { DISABLED_CALENDAR_FEATURES, DISABLED_CALENDAR_CONFIG, loadCalendarConfiguration, createCalendarRuntime, upcomingThursdays, calendarImportRange };

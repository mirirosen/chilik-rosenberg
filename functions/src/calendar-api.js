'use strict';
const { FUNCTION_REGION, INTEGRATION_RUNTIME } = require('./deployment-config');
const { assertWeeklyAvailability, weekStartDate } = require('./weekly-availability');
const { upcomingThursdays } = require('./calendar-runtime');
const APP = 'artifacts/hilik-rosenberg-v1/public/data';
const validMax = n => Number.isInteger(n) && n >= 1 && n <= 100;
// Read Firestore only; public requests never refresh tokens or fetch Calendar.
async function publicAvailability(db, policy, nowMs = Date.now()) {
  const dates = upcomingThursdays(nowMs), unavailable = { available: false, availableSpots: 0, maxParticipants: 30, validUntilMs: nowMs + 30000 };
  const result = await db.runTransaction(async tx => {
    const settings = (await tx.get(db.doc(`${APP}/settings/global`))).data() || {};
    const globalMax = settings.globalMaxParticipants ?? 30;
    const rows = {};
    for (const date of dates) {
      const week = weekStartDate(date, policy);
      const [calendar, counter, tour] = await Promise.all([tx.get(db.doc(`calendarAvailability/${week}`)), tx.get(db.doc(`bookingWeeks/${week}`)), tx.get(db.doc(`${APP}/tourDates/${date}`))]);
      const td = tour.data() || {}, snapshot = calendar.data();
      const max = td.useGlobalMax === false ? td.customMax : globalMax;
      const publicMax = validMax(globalMax) && validMax(max) ? Math.min(globalMax, max) : 30;
      rows[date] = { ...unavailable, maxParticipants: publicMax };
      try {
        if ((settings.blocked || []).includes(date) || (settings.soldOut || []).includes(date) || !validMax(max)) continue;
        const weeklyCurrent = assertWeeklyAvailability(snapshot, counter.data(), { policy, weekStart: week, maxParticipants: globalMax, participants: 1, nowMs });
        const dailyCurrent = td.currentRegistrations ?? 0;
        if (!Number.isSafeInteger(dailyCurrent) || dailyCurrent < 0) continue;
        const spots = Math.max(0, Math.min(globalMax - weeklyCurrent, max - dailyCurrent));
        if (!spots) continue;
        rows[date] = { available: true, availableSpots: spots, maxParticipants: publicMax, validUntilMs: snapshot.validUntilMs };
      } catch { /* Generic unavailable row hides private block/reconciliation reasons. */ }
    }
    return rows;
  });
  return { availabilityStatus: 'ready', publicAvailability: result, validUntilMs: Math.min(...Object.values(result).map(r => r.validUntilMs)) };
}
function createCalendarApi({ db, onRequest, onSchedule, runtime, now = Date.now, logger = console }) {
  const region = FUNCTION_REGION;
  const api = {};
  const origins = new Set(['https://livechilik-tours.com', 'https://www.chilik-tours.com', 'https://chilik-tours.com', 'https://hilik-site.web.app', 'https://hilik-site.firebaseapp.com', 'http://localhost:3000', 'http://localhost:5173']);
  api.calendarAvailability = onRequest({ region, serviceAccount: INTEGRATION_RUNTIME, invoker: 'private', minInstances: 0, maxInstances: 1, concurrency: 1, memory: '256MiB', cpu: 1, timeoutSeconds: 60 }, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const origin = req.get('origin');
    if (origin && !origins.has(origin)) return res.status(403).json({ error: 'origin-not-allowed' });
    if (origin) res.set('Access-Control-Allow-Origin', origin).set('Vary', 'Origin');
    res.set('Access-Control-Allow-Methods', 'GET,OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'GET') return res.status(405).json({ error: 'method-not-allowed' });
    if (!runtime.publicEnabled) return res.status(503).json({ error: 'availability-unavailable' });
    try { return res.status(200).json(await publicAvailability(db, runtime.policy, now())); }
    catch { return res.status(503).json({ error: 'availability-unavailable' }); }
  });
  // No schedule export/registration at all while the feature is off.
  if (runtime.readsEnabled) {
    api.refreshCalendarAvailability = onSchedule({ region, serviceAccount: INTEGRATION_RUNTIME, schedule: 'every 2 minutes', timeZone: 'Asia/Jerusalem', retryCount: 3, minBackoffSeconds: 30, maxBackoffSeconds: 120, maxRetrySeconds: 240, ...(runtime.secretBindings.length ? { secrets: runtime.secretBindings } : {}) }, async () => {
      try { return await runtime.importUpcoming(); }
      catch { logger.error('calendar-import', { code: 'calendar-import-failed' }); throw new Error('calendar-import-failed'); }
    });
  }
  return api;
}
module.exports = { createCalendarApi, publicAvailability };

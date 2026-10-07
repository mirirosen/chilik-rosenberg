'use strict';
const crypto = require('node:crypto');
const { buildCalendarWeekSnapshots, validatePolicy, weekStartDate } = require('./weekly-availability');
const { normalizeManagedCount } = require('./calendar-count-sync');
const fail = (code, blocked = false) => Object.assign(new Error(code), { blocked });
function calendarReadConfigurationIssues(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['calendar-configuration-invalid'];
  const issues = [];
  if (config.readEnabled !== true) issues.push('calendar-import-disabled');
  if (config.provider !== 'google' || typeof config.calendarId !== 'string' || !config.calendarId || config.calendarId === 'primary') issues.push('calendar-target-unverified');
  // reader/freeBusyReader can conceal private titles. The server needs verified
  // access to business annotations even when an event is private/transparent.
  if (config.privateEventAccessVerified !== true || !['owner', 'writer'].includes(config.accessRole)) issues.push('calendar-private-access-unverified');
  return issues;
}
// Server-only, disabled by default, not connected to a scheduler or HTTP API.
function createCalendarImporter({ db, config = {}, policy, fetchImpl = globalThis.fetch, getAccessToken, now = Date.now }) {
  return async function importWeeks({ fromDate, toDate }) {
    if (calendarReadConfigurationIssues(config).length) throw fail('calendar-import-not-configured', true);
    validatePolicy(policy, true);
    // Reject partial weeks: a Thursday-only query cannot clear a Sunday block.
    const startedAtMs = now();
    const initial = buildCalendarWeekSnapshots([], { policy, fromDate, toDate, complete: true, nowMs: startedAtMs });
    if (weekStartDate(fromDate, policy) !== fromDate || weekStartDate(toDate, policy) !== toDate) throw fail('calendar-range-incomplete', true);
    const stateRef = db.doc('calendarSyncState/import');
    const lease = crypto.randomUUID();
    await db.runTransaction(async tx => { tx.set(stateRef, { lease, startedAtMs: now() }); });
    try {
      if (typeof getAccessToken !== 'function') throw fail('provider-token-unavailable', true);
      let token;
      try { token = await getAccessToken('google-calendar'); } catch { throw fail('provider-token-unavailable', true); }
      if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) throw fail('provider-token-unavailable', true);
      const offsetDate = (date, days) => new Date(Date.parse(`${date}T00:00:00Z`) + days * 86400000).toISOString();
      // Fetch a UTC superset and clip by local event dates. This covers Jerusalem
      // midnight/DST without guessing a fixed UTC offset for the entire range.
      const params = new URLSearchParams({ singleEvents: 'true', showDeleted: 'false', timeZone: policy.timeZone, timeMin: offsetDate(fromDate, -1), timeMax: offsetDate(toDate, 1), maxResults: '2500', fields: 'accessRole,nextPageToken,items(id,etag,status,summary,start,end,recurrence,recurringEventId,extendedProperties/private)' });
      const events = [], seenPages = new Set(), seenIds = new Set();
      for (let page = 0; page < 100; page++) {
        let response, data;
        try {
          response = await fetchImpl(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(config.calendarId)}/events?${params}`, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000), headers: { Authorization: `Bearer ${token}` } });
          data = await response.json();
        } catch { throw fail('calendar-list-unavailable'); }
        if (!response.ok) throw fail('calendar-list-unavailable', [400, 401, 403].includes(response.status));
        if (!['owner', 'writer'].includes(data?.accessRole) || !Array.isArray(data.items)) throw fail('calendar-list-incomplete', true);
        for (const event of data.items) {
          if (!event || typeof event.id !== 'string' || !event.id || seenIds.has(event.id)) throw fail('calendar-list-incomplete', true);
          seenIds.add(event.id);
          if (event.status === 'cancelled') continue;
          if (typeof event.summary !== 'string' || !event.summary.trim()) throw fail('calendar-list-incomplete', true);
          events.push(await normalizeManagedCount(db, event, config.calendarId));
        }
        if (data.nextPageToken === undefined) break;
        if (typeof data.nextPageToken !== 'string' || !data.nextPageToken || seenPages.has(data.nextPageToken) || page === 99) throw fail('calendar-list-incomplete', true);
        seenPages.add(data.nextPageToken); params.set('pageToken', data.nextPageToken);
      }
      if (now() < startedAtMs || now() - startedAtMs >= policy.maxAgeMs) throw fail('calendar-list-unavailable');
      const snapshots = buildCalendarWeekSnapshots(events, { policy, fromDate, toDate, complete: true, nowMs: startedAtMs });
      // Only this newest import can publish. A slow older list cannot overwrite
      // fresher results or invalidate them after its own eventual failure.
      const committed = await db.runTransaction(async tx => {
        if ((await tx.get(stateRef)).data()?.lease !== lease) return false;
        for (const [week, snapshot] of Object.entries(snapshots)) tx.set(db.doc(`calendarAvailability/${week}`), snapshot);
        tx.set(stateRef, { lease, status: 'complete', completedAtMs: now() });
        return true;
      });
      return { status: committed ? 'complete' : 'superseded', weeks: committed ? Object.keys(snapshots).length : 0 };
    } catch (error) {
      await db.runTransaction(async tx => {
        if ((await tx.get(stateRef)).data()?.lease !== lease) return;
        for (const week of Object.keys(initial)) tx.set(db.doc(`calendarAvailability/${week}`), { weekStart: week, complete: false, validUntilMs: now() });
        tx.set(stateRef, { lease, status: 'failed', completedAtMs: now() });
      });
      const codes = new Set(['provider-token-unavailable', 'calendar-list-unavailable', 'calendar-list-incomplete', 'calendar-data-invalid', 'calendar-event-conflict', 'calendar-count-requires-reconciliation', 'calendar-binding-unverified']);
      throw fail(codes.has(error?.message) ? error.message : 'calendar-import-failed', error?.blocked === true);
    }
  };
}
module.exports = { createCalendarImporter, calendarReadConfigurationIssues };

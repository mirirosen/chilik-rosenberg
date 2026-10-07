'use strict';
const crypto = require('node:crypto');
const fault = code => Object.assign(new Error(code), { code });
// Confirmed business policy. Runtime synchronization remains disabled.
const APPROVED_WEEK_POLICY = Object.freeze({ enabled: false, approved: true, timeZone: 'Asia/Jerusalem', weekStartsOn: 0, fullWhen: 'at-capacity', maxAgeMs: 300000 });
function realDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) throw fault('calendar-data-invalid');
  const ms = Date.parse(`${value}T00:00:00Z`);
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw fault('calendar-data-invalid');
  return ms;
}
function validatePolicy(policy, requireApproved = false) {
  if (!policy || typeof policy.timeZone !== 'string' || !policy.timeZone || !Number.isInteger(policy.weekStartsOn) || policy.weekStartsOn < 0 || policy.weekStartsOn > 6 || !['at-capacity', 'over-capacity'].includes(policy.fullWhen) || !Number.isInteger(policy.maxAgeMs) || policy.maxAgeMs < 1000 || policy.maxAgeMs > 3600000) throw fault('availability-policy-unconfirmed');
  try { new Intl.DateTimeFormat('en', { timeZone: policy.timeZone }).format(); } catch { throw fault('availability-policy-unconfirmed'); }
  if (requireApproved && (policy.enabled !== true || policy.approved !== true)) throw fault('availability-policy-unconfirmed');
  return policy;
}
function policyFingerprint(policy) {
  validatePolicy(policy);
  return crypto.createHash('sha256').update(JSON.stringify([policy.timeZone, policy.weekStartsOn, policy.fullWhen, policy.maxAgeMs])).digest('hex');
}
function localDateAt(instant, timeZone) {
  const parts = new Intl.DateTimeFormat('en', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function weekStartDate(date, policy) {
  validatePolicy(policy);
  const ms = realDate(date), weekday = new Date(ms).getUTCDay();
  return new Date(ms - ((weekday - policy.weekStartsOn + 7) % 7) * 86400000).toISOString().slice(0, 10);
}
function eventDateRange(event, policy) {
  if (event.start?.date && event.end?.date && !event.start.dateTime && !event.end.dateTime) {
    const start = realDate(event.start.date), end = realDate(event.end.date);
    if (end <= start) throw fault('calendar-data-invalid');
    return [event.start.date, new Date(end - 86400000).toISOString().slice(0, 10)];
  }
  const parse = value => {
    // Require an explicit offset/UTC from the authorized Calendar list query;
    // ambiguous local wall time is never guessed around a DST transition.
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})$/.test(value)) throw fault('calendar-data-invalid');
    realDate(value.slice(0, 10));
    const ms = Date.parse(value); if (!Number.isFinite(ms)) throw fault('calendar-data-invalid'); return ms;
  };
  const start = parse(event.start?.dateTime), end = parse(event.end?.dateTime);
  if (end <= start) throw fault('calendar-data-invalid');
  return [localDateAt(start, policy.timeZone), localDateAt(end - 1, policy.timeZone)];
}
function buildCalendarWeekSnapshots(events, { policy, fromDate, toDate, complete, nowMs = Date.now() }) {
  validatePolicy(policy);
  if (complete !== true || !Array.isArray(events) || !Number.isFinite(nowMs)) throw fault('calendar-unavailable');
  const from = realDate(fromDate), to = realDate(toDate);
  if (to <= from || to - from > 370 * 86400000) throw fault('calendar-data-invalid');
  const fingerprint = policyFingerprint(policy), weeks = {};
  for (let day = from; day < to; day += 86400000) {
    const key = weekStartDate(new Date(day).toISOString().slice(0, 10), policy);
    weeks[key] ||= { weekStart: key, blocked: false, complete: true, policyFingerprint: fingerprint, verifiedAtMs: nowMs, validUntilMs: nowMs + policy.maxAgeMs };
  }
  for (const event of events) {
    if (!event || typeof event !== 'object') throw fault('calendar-data-invalid');
    if (event.status === 'cancelled' || typeof event.summary !== 'string') continue;
    const summary = event.summary.trim().replace(/\s+/g, ' '), countMatch = /^(\d+) אנשים$/.exec(summary);
    if (countMatch && !Number.isSafeInteger(Number(countMatch[1]))) throw fault('calendar-data-invalid');
    const privateTour = summary.includes('סיור פרטי');
    if (!privateTour && !countMatch) continue;
    if (Array.isArray(event.recurrence) && event.recurrence.length) throw fault('calendar-data-invalid'); // Require expanded instances (singleEvents=true), including exceptions.
    const [start, last] = eventDateRange(event, policy), firstMs = Math.max(from, realDate(start)), lastMs = Math.min(to - 86400000, realDate(last));
    if (lastMs - firstMs > 370 * 86400000) throw fault('calendar-data-invalid');
    const countedWeeks = new Set();
    for (let day = firstMs; day <= lastMs; day += 86400000) {
      const key = weekStartDate(new Date(day).toISOString().slice(0, 10), policy);
      if (weeks[key]) {
        if (privateTour) weeks[key].blocked = true;
        // One annotation spanning multiple days belongs to its week once.
        if (countMatch && !countedWeeks.has(key)) { weeks[key].externalDeclaredCounts ||= []; weeks[key].externalDeclaredCounts.push(Number(countMatch[1])); countedWeeks.add(key); }
      }
    }
  }
  // Only flags, aggregate counts, range and freshness survive. Never retain a title,
  // description, attendee, source event ID or private customer's information.
  for (const week of Object.values(weeks)) {
    if (week.externalDeclaredCounts) {
      week.externalDeclaredCounts.sort((a,b) => a-b);
      week.externalCountFingerprint = crypto.createHash('sha256').update(JSON.stringify([week.weekStart, week.externalDeclaredCounts])).digest('hex');
      week.requiresCountReconciliation = true;
    }
  }
  return weeks;
}
function weekIsFull(current, max, policy) { validatePolicy(policy); return policy.fullWhen === 'at-capacity' ? current >= max : current > max; }
function assertWeeklyCounter(counter) {
  if (!counter || counter.reconciled !== true || ![counter.currentRegistrations,counter.heldParticipants,counter.confirmedParticipants].every(n=>Number.isInteger(n)&&n>=0) || counter.heldParticipants+counter.confirmedParticipants!==counter.currentRegistrations) throw fault('capacity-requires-reconciliation');
  return counter;
}
function assertWeeklyAvailability(snapshot, counter, { policy, weekStart, maxParticipants, participants, nowMs = Date.now() }) {
  validatePolicy(policy, true);
  if (!snapshot || snapshot.weekStart !== weekStart || snapshot.complete !== true || typeof snapshot.blocked !== 'boolean' || snapshot.policyFingerprint !== policyFingerprint(policy) || !Number.isFinite(snapshot.verifiedAtMs) || snapshot.verifiedAtMs > nowMs || nowMs - snapshot.verifiedAtMs > policy.maxAgeMs || !Number.isFinite(snapshot.validUntilMs) || snapshot.validUntilMs <= nowMs) throw fault('calendar-unavailable');
  if (snapshot.blocked) throw fault('tour-unavailable');
  // Calendar annotation may already include the same website participants.
  // Never add it to the quota automatically: an approved reconciliation must
  // bind this exact aggregate snapshot to an authoritative weekly counter.
  if (snapshot.requiresCountReconciliation && counter?.reconciledCalendarCountFingerprint !== snapshot.externalCountFingerprint) throw fault('capacity-requires-reconciliation');
  assertWeeklyCounter(counter);
  if (!Number.isInteger(maxParticipants) || maxParticipants < 1 || maxParticipants > 100) throw fault('capacity-requires-reconciliation');
  if (!Number.isInteger(participants) || participants < 1 || participants > 20) throw fault('invalid-participants');
  // Advertising policy may distinguish >= from >. Reservation safety always
  // forbids exceeding the actual quota, independently of the 20/order limit.
  if (counter.currentRegistrations + participants > maxParticipants) throw fault('capacity-exceeded');
  return counter.currentRegistrations;
}
module.exports = { APPROVED_WEEK_POLICY, validatePolicy, policyFingerprint, localDateAt, weekStartDate, eventDateRange, buildCalendarWeekSnapshots, weekIsFull, assertWeeklyCounter, assertWeeklyAvailability };

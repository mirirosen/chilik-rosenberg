import { readFileSync } from 'node:fs';
import { before, after, beforeEach, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Never connects to a real project. Run using npm run test:rules (demo project).
const projectId = 'demo-chilik-rules';
const root = 'artifacts/hilik-rosenberg-v1/public/data';
const settings = `${root}/settings/global`;
const tour = `${root}/tourDates/2026-10-08`;
let env;
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Firestore emulator required; use npm run test:rules');
  env = await initializeTestEnvironment({ projectId, firestore: { rules: readFileSync('../../security/booking/firestore.rules', 'utf8') } });
});
after(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, settings), { globalMaxParticipants: 30, blocked: [], soldOut: [] });
    await setDoc(doc(db, tour), { date: '2026-10-08', useGlobalMax: true, customMax: null, currentRegistrations: 2 });
    await setDoc(doc(db, 'bookings/b1'), { name: 'Private customer', status: 'pending', participants: 2 });
    await setDoc(doc(db, 'integrationJobs/j1'), { kind: 'email', status: 'failed' });
  });
});
const contexts = () => [env.unauthenticatedContext(), env.authenticatedContext('anonymous', { firebase: { sign_in_provider: 'anonymous' } }), env.authenticatedContext('customer')];
test('public and ordinary users can read availability, never customer details or jobs', async () => {
  for (const context of contexts()) {
    const db = context.firestore();
    await assertSucceeds(getDoc(doc(db, settings)));
    await assertSucceeds(getDocs(collection(db, `${root}/tourDates`)));
    await assertFails(getDoc(doc(db, 'bookings/b1')));
    await assertFails(getDocs(collection(db, 'bookings')));
    await assertFails(getDoc(doc(db, 'integrationJobs/j1')));
  }
});
test('ordinary clients cannot mutate bookings, capacity or settings', async () => {
  for (const context of contexts()) {
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'bookings/new'), { status: 'confirmed', paymentStatus: 'paid' }));
    await assertFails(updateDoc(doc(db, 'bookings/b1'), { status: 'confirmed' }));
    await assertFails(updateDoc(doc(db, tour), { currentRegistrations: 0 }));
    await assertFails(updateDoc(doc(db, settings), { globalMaxParticipants: 99 }));
  }
});
test('admin can read operational data and edit configuration only', async () => {
  const db = env.authenticatedContext('admin', { admin: true }).firestore();
  await assertSucceeds(getDocs(collection(db, 'bookings')));
  await assertSucceeds(getDoc(doc(db, 'integrationJobs/j1')));
  await assertSucceeds(updateDoc(doc(db, settings), { globalMaxParticipants: 40, blocked: ['2026-10-15'] }));
  await assertSucceeds(updateDoc(doc(db, tour), { useGlobalMax: false, customMax: 20 }));
  await assertSucceeds(setDoc(doc(db, `${root}/tourDates/2026-10-15`), { date: '2026-10-15', useGlobalMax: true, customMax: null }));
});
test('even admin cannot directly change booking/payment/count/outbox ownership', async () => {
  const db = env.authenticatedContext('admin', { admin: true }).firestore();
  await assertFails(updateDoc(doc(db, 'bookings/b1'), { status: 'confirmed', paymentStatus: 'paid' }));
  await assertFails(deleteDoc(doc(db, 'bookings/b1')));
  await assertFails(updateDoc(doc(db, tour), { currentRegistrations: 999 }));
  await assertFails(setDoc(doc(db, tour), { date: '2026-10-08', useGlobalMax: true, customMax: null }));
  await assertFails(deleteDoc(doc(db, tour)));
  await assertFails(setDoc(doc(db, `${root}/tourDates/2026-10-15`), { date: '2026-10-15', useGlobalMax: true, customMax: null, currentRegistrations: 0 }));
  await assertFails(updateDoc(doc(db, 'integrationJobs/j1'), { status: 'sent' }));
});
test('configuration schema rejects invalid maxima, unexpected fields and forged claims', async () => {
  const db = env.authenticatedContext('admin', { admin: true }).firestore();
  await assertFails(updateDoc(doc(db, settings), { globalMaxParticipants: 0 }));
  await assertFails(updateDoc(doc(db, settings), { globalMaxParticipants: 30.5 }));
  await assertFails(updateDoc(doc(db, settings), { tourDates: {} }));
  await assertFails(updateDoc(doc(db, settings), { blocked: 'all' }));
  await assertFails(updateDoc(doc(db, tour), { useGlobalMax: false, customMax: 101 }));
  await assertFails(updateDoc(doc(db, tour), { date: 'different-date' }));
  const fake = env.authenticatedContext('fake', { admin: 'true' }).firestore();
  await assertFails(getDoc(doc(fake, 'bookings/b1')));
  await assertFails(setDoc(doc(db, 'users/admin'), { admin: true }));
});

test('an anonymous identity cannot use a forged admin claim to read private data or edit configuration', async () => {
  const db = env.authenticatedContext('anonymous-admin', { admin: true, firebase: { sign_in_provider: 'anonymous' } }).firestore();
  await assertFails(getDoc(doc(db, 'bookings/b1')));
  await assertFails(getDoc(doc(db, 'integrationJobs/j1')));
  await assertFails(updateDoc(doc(db, settings), { globalMaxParticipants: 40 }));
});

test('private reconciliation, cancellation, capacity and provider records remain server-only for every client', async () => {
  const privatePaths = ['paymentReconciliation/p1', 'cancellationPreparations/c1', 'calendarCapacity/c1', 'whatsappDeliveryReceipts/w1'];
  await env.withSecurityRulesDisabled(async context => {
    for (const path of privatePaths) await setDoc(doc(context.firestore(), path), { synthetic: true });
  });
  for (const context of [...contexts(), env.authenticatedContext('admin', { admin: true })]) {
    for (const path of privatePaths) {
      const ref = doc(context.firestore(), path);
      await assertFails(getDoc(ref));
      await assertFails(setDoc(ref, { synthetic: false }));
    }
  }
});

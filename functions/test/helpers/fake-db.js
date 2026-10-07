'use strict';
const Timestamp = { fromMillis: ms => ({ toMillis: () => ms }) };
// Serial transactions simulate atomic commits and assert Firestore read-before-write.
// Emulator rules tests separately exercise real Firestore permissions.
function fakeDb() {
  const data = new Map(); let queue = Promise.resolve();
  const snapshot = value => ({ exists: value !== undefined, data: () => value });
  const doc = path => ({ path, id: path.split('/').at(-1), get: async () => snapshot(data.get(path)) });
  const collection = name => {
    const query = filters => ({
      where: (key, op, value) => { if (op !== '==') throw new Error('unsupported-query'); return query([...filters, [key, value]]); },
      get: async () => ({ docs: [...data.entries()].filter(([path, value]) => path.startsWith(`${name}/`) && path.split('/').length === 2 && filters.every(([key, expected]) => value[key] === expected)).map(([path, value]) => ({ ...snapshot(value), id: path.split('/').at(-1), ref: doc(path) })) }),
    });
    return query([]);
  };
  const db = { data, doc, collection, runTransaction(fn) {
    const run = queue.then(async () => {
      const writes = []; let writing = false;
      const tx = {
        async get(ref) { if (writing) throw new Error('read-after-write'); return ref.path ? snapshot(data.get(ref.path)) : ref.get(); },
        create(ref, value) { writing = true; if (data.has(ref.path)) throw new Error('already-exists'); writes.push(() => data.set(ref.path, value)); },
        set(ref, value, opts) { writing = true; writes.push(() => data.set(ref.path, opts?.merge ? { ...data.get(ref.path), ...value } : value)); },
        update(ref, value) { writing = true; writes.push(() => data.set(ref.path, { ...data.get(ref.path), ...value })); },
      };
      const result = await fn(tx); writes.forEach(w => w()); return result;
    });
    queue = run.catch(() => {}); return run;
  } }; return db;
}
module.exports = { fakeDb, Timestamp };

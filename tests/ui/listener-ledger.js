// Listener ledger (GSAP plan §8.8): counts event listeners the application registers and proves every one of
// them is removed. It mirrors DOM semantics so it neither double-counts nor misses removals:
//   - identity is (target, type, original listener, capture); re-adding the same key is a no-op, as in the DOM;
//   - `once`: a wrapper is registered; the registration is marked removed BEFORE the callback runs, and a
//     re-registration from inside the callback is a new registration;
//   - `signal`: an already-aborted signal registers nothing; otherwise aborting removes that registration;
//   - every registration has a generation, and a removal only marks its own generation, so a late removal
//     never "kills" a newer registration with the same key.
// Scope: only registrations whose call stack (normalised to forward slashes) has an application frame.
// By default an application frame is one under /src/ that is not in node_modules or /tests/; a registration
// made directly by the test environment (jsdom/nwsapi as immediate caller) is excluded.
// Targets: EventTarget.prototype (every DOM node, AbortSignal, MediaQueryList mocks) and, because the test
// environment's global window carries its own bound add/remove functions, the window object as well.

export const defaultIsAppFrame = frame => frame.includes('/src/') && !frame.includes('/node_modules/') && !frame.includes('/tests/');
// The test environment's own listeners (jsdom and its selector engine registering on first use) stand in for
// browser internals: a registration whose immediate caller is jsdom or nwsapi is not the application's.
export const isEnvironmentFrame = frame => /\/node_modules\/(jsdom|nwsapi)\//.test(frame);

const captureOf = options => (typeof options === 'boolean' ? options : Boolean(options?.capture));

export function installLedger({ isAppFrame = defaultIsAppFrame } = {}) {
  const proto = EventTarget.prototype;
  const protoAdd = proto.addEventListener;
  const protoRemove = proto.removeEventListener;
  const previousLimit = Error.stackTraceLimit;
  Error.stackTraceLimit = 100;
  const records = [];
  let generation = 0;

  const find = (target, type, listener, capture) => records.find(r => r.active && r.target === target && r.type === type && r.listener === listener && r.capture === capture);

  // Builds an add/remove pair around the original pair; `fixedTarget` is used where `this` is not reliable.
  const wrap = (originalAdd, originalRemove, fixedTarget) => ({
    add: function addEventListener(type, listener, options) {
      const target = fixedTarget ?? this;
      if (!listener) return originalAdd.call(target, type, listener, options);
      const capture = captureOf(options);
      const signal = typeof options === 'object' && options ? options.signal : undefined;
      if (signal?.aborted) return undefined; // the DOM registers nothing
      if (find(target, type, listener, capture)) return undefined; // same key: no-op, as in the DOM
      const frames = (new Error().stack || '').replaceAll('\\', '/').split('\n').slice(2);
      const record = { target, type, listener, capture, generation: ++generation, active: true, tracked: frames.some(isAppFrame) && !isEnvironmentFrame(frames[0] ?? ''), stack: frames.join('\n') };
      const call = (self, event) => (typeof listener === 'function' ? listener.call(self, event) : listener.handleEvent(event));
      let registered = listener;
      if (typeof options === 'object' && options?.once) {
        registered = function onceWrapper(event) {
          record.active = false; // removed before the callback, as in the DOM
          return call(this, event);
        };
      }
      record.registered = registered;
      if (signal) protoAdd.call(signal, 'abort', () => { record.active = false; }, { once: true }); // harness-internal, not counted
      records.push(record);
      return originalAdd.call(target, type, registered, options);
    },
    remove: function removeEventListener(type, listener, options) {
      const target = fixedTarget ?? this;
      const capture = captureOf(options);
      const record = listener ? find(target, type, listener, capture) : null;
      if (!record) return originalRemove.call(target, type, listener, options);
      record.active = false; // only this generation
      return originalRemove.call(target, type, record.registered, options);
    },
  });

  const protoPair = wrap(protoAdd, protoRemove);
  proto.addEventListener = protoPair.add;
  proto.removeEventListener = protoPair.remove;

  const win = typeof window === 'undefined' ? null : window;
  const ownWindow = win && Object.prototype.hasOwnProperty.call(win, 'addEventListener')
    ? { add: win.addEventListener, remove: win.removeEventListener } : null;
  if (ownWindow) {
    const pair = wrap(ownWindow.add, ownWindow.remove, win);
    win.addEventListener = pair.add;
    win.removeEventListener = pair.remove;
  }

  return {
    records,
    tracked: () => records.filter(r => r.tracked),
    leaks: () => records.filter(r => r.tracked && r.active),
    assertNoLeaks() {
      const leaks = records.filter(r => r.tracked && r.active);
      if (leaks.length) {
        const describe = r => `${r.target === win ? 'window' : r.target?.constructor?.name ?? 'target'}:${r.type} (generation ${r.generation})\n${r.stack.split('\n').filter(isAppFrame).slice(0, 3).join('\n')}`;
        throw new Error(`${leaks.length} leak${leaks.length === 1 ? '' : 's'}:\n${leaks.map(describe).join('\n')}`);
      }
    },
    uninstall() {
      proto.addEventListener = protoAdd;
      proto.removeEventListener = protoRemove;
      if (ownWindow) { win.addEventListener = ownWindow.add; win.removeEventListener = ownWindow.remove; }
      Error.stackTraceLimit = previousLimit;
    },
  };
}

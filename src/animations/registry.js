import { gsap } from 'gsap';

// Entrance tweens (hero lines, reveals, the CTA sheen and the arrival ring) are registered here with the
// properties they own, so navigation, bfcache and teardown can settle them without touching the reusable
// press/hover tweens. Nothing is ever pre-hidden: settling only clears what an entrance set inline.
let entrances = new Map(); // Element -> { tweens: Tween[], props: Set<string> }
let settled = new WeakSet();
let motionActive = false;

export function setMotionActive(active) { motionActive = active; }
export function isMotionActive() { return motionActive; }

export function registerEntrance(element, tween, props) {
  const entry = entrances.get(element) ?? { tweens: [], props: new Set() };
  entry.tweens.push(tween);
  props.split(',').forEach(prop => entry.props.add(prop.trim()));
  entrances.set(element, entry);
  return tween;
}

export function isSettled(element) { return settled.has(element); }

function settleElement(element) {
  const entry = entrances.get(element);
  if (!entry) return;
  entrances.delete(element);
  entry.tweens.forEach(tween => tween.kill());
  // clearProps also resets GSAP's cached transform state for this element (unlike style.removeProperty).
  gsap.set(element, { clearProps: [...entry.props].join(',') });
}

// Synchronously puts a navigation or focus destination (and its marked descendants) in its natural state.
// Under reduced motion there are no entrances, so this only records the targets as settled.
export function settle(target) {
  if (!target) return;
  const targets = [target, ...target.querySelectorAll('[data-motion]')];
  targets.forEach(element => settled.add(element));
  if (!motionActive) return;
  targets.forEach(settleElement);
}

export function settleAll() { [...entrances.keys()].forEach(settleElement); }

export function resetRegistry() {
  entrances = new Map();
  settled = new WeakSet();
}

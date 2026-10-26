// Bit via the Tranzila checkout ships OFF: it appears only in a build with
// VITE_BIT_TRANZILA_ENABLED=true (never set in deploy/booking-hosting.env), and then
// only works once the functions runtime flag TRANZILA_BIT_ENABLED is on too.
// Bank transfer and the old unverified manual Bit option are no longer offered.
export const BIT_TRANZILA_ENABLED = import.meta.env.VITE_BIT_TRANZILA_ENABLED === 'true';
export const PAYMENT_METHODS = Object.freeze(BIT_TRANZILA_ENABLED ? ['credit', 'bit'] : ['credit']);
export const DEFAULT_PAYMENT_METHOD = 'credit';

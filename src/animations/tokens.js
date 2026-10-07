// Motion tokens for the contact-only site: short distances, calm easing, no loops.
export const DUR = { xs: 0.12, s: 0.24, m: 0.42, l: 0.7 };
export const EASE = { out: 'power2.out', soft: 'power3.out', settle: 'expo.out' };
export const DIST = { s: 6, m: 10, l: 16 };
export const STAGGER = { tight: 0.04, base: 0.06 };

// Physical x offset for an entrance from the inline-start edge:
// RTL starts on the right (positive x), LTR on the left (negative x).
export const fromInlineStart = (distance) => (document.documentElement.dir === 'rtl' ? distance : -distance);

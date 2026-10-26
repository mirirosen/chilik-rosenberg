import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Step 2 (personal details) must stay on the light card. The step-1 picker CSS
// is lazy-loaded after site-design.css, so a same-specificity dark background
// there won the cascade and left the labels and step names at 1.2:1.
const css = readFileSync('src/site-design.css', 'utf8');
const picker = readFileSync('apps/protected-booking/src/components/BookingSection.css', 'utf8');
const token = name => css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))[1];
const luminance = hex => {
  const [r, g, b] = hex.slice(1).match(/../g).map(part => {
    const value = parseInt(part, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
describe('booking step 2 contrast', () => {
  it('never lets the lazily loaded picker CSS repaint the details card', () => {
    const rules = picker.match(/\.booking-details-shell[^{]*\{[^}]*\}/g);
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) expect(rule).not.toMatch(/background/);
    expect(css).toContain('.booking-details-shell .bg-brand-dark-lighter { background: #fffdf8; }');
  });
  it('keeps labels, step names and the title at WCAG AA (4.5:1) on the card', () => {
    const card = '#fffdf8';
    expect(css).toContain(`.booking-details-shell>.booking-form-card, .booking-details-shell>.booking-status-card { background: ${card};`);
    expect(css).toMatch(/\.booking-flow-steps \{[^}]*color: var\(--target-muted\); \}/);
    expect(css).toMatch(/\.booking-flow-steps \[aria-current\] \{ color: var\(--target-ink\); font-weight: 700; \}/);
    for (const name of ['target-ink', 'target-muted', 'target-gold-text']) expect(contrast(token(name), card)).toBeGreaterThanOrEqual(4.5);
    // The active step reads strongest: darker than the other step names.
    expect(contrast(token('target-ink'), card)).toBeGreaterThan(contrast(token('target-muted'), card));
  });
});

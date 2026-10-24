import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Pins the October 2026 design review fixes for the light booking card (design/FINDINGS.md P0-1..P2-3).
const css = readFileSync('src/site-design.css', 'utf8');
const form = readFileSync('apps/protected-booking/src/components/BookingForm.jsx', 'utf8');
const confirmation = readFileSync('apps/protected-booking/src/components/BookingConfirmation.jsx', 'utf8');
const rule = selector => css.split('\n').find(line => line.startsWith(selector + ' {')) || '';
describe('booking design review', () => {
  it('keeps the no-seat-without-payment notice dark on light (AA contrast)', () => {
    expect(rule('.booking-details-shell .booking-no-hold-notice')).toMatch(/color: #6b4708; background: #fff1cc;/);
    expect(form).toMatch(/className="booking-no-hold-notice[^"]*" role="note" data-testid="no-hold-notice">\{t\('booking\.noHoldNotice'\)\}/);
  });
  it('centres the booking and confirmation card on wide screens', () => {
    expect(rule('.booking-details-shell')).toMatch(/margin-inline: auto/);
  });
  it('shows invalid fields and the payment group with a red frame', () => {
    expect(css).toMatch(/\[aria-invalid=true\] \{ border-color: #a12e25;/);
    expect(css).toMatch(/\.booking-payment-options\[aria-invalid=true\] label \{ border-color: #a12e25; \}/);
  });
  it('uses logical spacing so label icons never touch RTL text', () => {
    expect(form).not.toMatch(/\b(mr|ml)-\d/);
    expect(form.match(/className="inline me-2"/g)).toHaveLength(5);
  });
  it('isolates a Latin customer name inside the Hebrew thank-you line', () => {
    expect(confirmation).toContain('<bdi>{bookingData.name}</bdi>!');
  });
});

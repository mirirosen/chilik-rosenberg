import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// Pins the visual-only fixes of design round 2 (design2/FINDINGS.md). No copy or DOM changed.
const css = readFileSync('src/site-design.css', 'utf8');
const picker = readFileSync('apps/protected-booking/src/components/BookingSection.css', 'utf8');
const organic = readFileSync('src/organic-seo.css', 'utf8');
const form = readFileSync('apps/protected-booking/src/components/BookingForm.jsx', 'utf8');
const admin = readFileSync('apps/protected-booking/src/components/Admin.jsx', 'utf8');
describe('design round 2', () => {
  it('gives booking and admin fields a 3:1 boundary', () => {
    expect(css).toMatch(/select,textarea\), \.site-admin-login form :is\(input,select,textarea\) \{ border-color: #8f826c; \}/);
  });
  it('draws the select arrow inside the field with room on both directions', () => {
    expect(css).toMatch(/appearance: none; background-image: url\("data:image\/svg\+xml[^"]+"\); background-repeat: no-repeat; background-size: 16px; background-position: left 16px center; padding-inline-end: 44px;/);
    expect(css).toMatch(/:dir\(ltr\)[^{]*\{ background-position: right 16px center; \}/);
  });
  it('keeps a visible focus ring on admin fields that set outline-none', () => {
    expect(css).toMatch(/\.site-admin-login form :is\(input,select,textarea\):focus-visible \{ outline: 3px solid #1373e6;/);
    expect(admin).toContain('הגדרת סיסמה / שכחתי סיסמה');
  });
  it('pads the no-hold notice on the payment status card without touching its text or testid', () => {
    expect(css).toMatch(/\.booking-status-card \.booking-no-hold-notice \{ padding: 12px 16px; border-radius: 12px;/);
    expect(form).toMatch(/className="booking-no-hold-notice text-amber-300 font-bold mb-6" data-testid="no-hold-notice">\{t\('booking\.noHoldNotice'\)\}/);
    expect(form).toMatch(/role="note" data-testid="no-hold-notice">\{t\('booking\.noHoldNotice'\)\}/);
  });
  it('makes the date-card status and step labels readable', () => {
    expect(picker).toMatch(/\.booking-screen__date small\{font-size:12px;/);
    expect(picker).toMatch(/\.booking-screen__date:disabled small\{color:#5f5446\}/);
    expect(picker).toMatch(/\.booking-screen__continue:disabled\{background:#e6ddcb;color:#5a4f40;/);
    expect(picker).toMatch(/color:#6c6255;font-size:12px;line-height:1.4\}/);
  });
  it('limits guide and overview line length', () => {
    expect(organic).toContain('main.organic-overview{max-width:52rem;font-size:1.0625rem}.organic-overview p{max-width:48rem}');
    expect(organic).toContain('.target-site .organic-overview ul{padding-inline-start:0}');
  });
});

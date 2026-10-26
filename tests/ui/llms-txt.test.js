import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = readFileSync('public/llms.txt', 'utf8');
const serverPrice = Number(readFileSync('functions/src/booking-core.js', 'utf8').match(/const PRICE_PER_PERSON = (\d+);/)[1]);

describe('public/llms.txt', () => {
  it('states only published facts: price, duration, usual Thursday evening, booking flow and contact', () => {
    expect(text).toContain(`ILS ${serverPrice}`);
    expect(text).toContain('2.5–3 hours');
    expect(text).toMatch(/usually take place on Thursday evenings/);
    expect(text).toContain('does not reserve a place');
    expect(text).toContain('https://wa.me/972506724312');
    expect(text).toContain('https://www.chilik-tours.com/terms');
  });
  it('does not publish unconfirmed start time, meeting point, tour languages, group size or ratings', () => {
    expect(text).not.toMatch(/\b\d{1,2}:\d{2}\b|\b\d{1,2}\s?(?:am|pm)\b/i);
    expect(text).not.toMatch(/meet(?:ing)? (?:at|point is)|address of the meeting|Lehi|לחי/i);
    expect(text).not.toMatch(/(?:guided|tours?|available) in (?:English|Hebrew)|languages?:/i);
    expect(text).not.toMatch(/up to \d+|max(?:imum)? (?:of )?\d+|group size|guests? max/i);
    expect(text).not.toMatch(/rating|review|\d\.\d\s*\/\s*5/i);
  });
  it('is plain UTF-8 without a BOM', () => {
    expect(readFileSync('public/llms.txt')[0]).not.toBe(0xef);
  });
});

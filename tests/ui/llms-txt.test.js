import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const text = readFileSync('public/llms.txt', 'utf8');
const serverPrice = Number(readFileSync('functions/src/booking-core.js', 'utf8').match(/const PRICE_PER_PERSON = (\d+);/)[1]);

describe('public/llms.txt', () => {
  it('states the published and owner-confirmed facts', () => {
    expect(text).toContain(`ILS ${serverPrice}`);
    expect(text).toContain('2.5–3 hours');
    expect(text).toMatch(/Thursday evenings and start at 20:00/);
    expect(text).toMatch(/Meeting point: in Bnei Brak\. The exact address is sent during the week of the tour\./);
    expect(text).toMatch(/guided in Hebrew and English/);
    expect(text).toContain('does not reserve a place');
    expect(text).toContain('https://wa.me/972506724312');
    expect(text).toContain('https://www.chilik-tours.com/terms');
  });
  it('uses Hilik Rozenberg as the English name and keeps the Hebrew name', () => {
    expect(text).toMatch(/^# Hilik Rozenberg Tours/);
    expect(text).toContain('חיליק רוזנברג');
  });
  it('never presents the footer business address as the meeting point, nor a group size, other times or ratings', () => {
    expect(text).not.toMatch(/Lehi|Lechi|רחוב לחי|לחי 11/i);
    expect([...text.matchAll(/\b\d{1,2}:\d{2}\b/g)].map(m => m[0])).toEqual(['20:00']);
    expect(text).not.toMatch(/up to \d+|max(?:imum)? (?:of )?\d+|group size|\d+ (?:guests|participants) (?:max|maximum)/i);
    expect(text).not.toMatch(/rating|review|\d\.\d\s*\/\s*5/i);
  });
  it('is plain UTF-8 without a BOM', () => {
    expect(readFileSync('public/llms.txt')[0]).not.toBe(0xef);
  });
});

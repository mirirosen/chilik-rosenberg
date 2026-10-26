import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// No review/rating claims without a verified source (growth audit S2/C6).
const files = ['src/locales/he.json', 'src/locales/en.json', 'apps/protected-booking/src/locales/he.json', 'apps/protected-booking/src/locales/en.json', 'src/data/organicContent.js'];

describe('unsourced ratings', () => {
  it.each(files)('%s carries no rating score or review count', file => {
    const text = readFileSync(file, 'utf8');
    expect(text).not.toMatch(/5\.0\s*\/\s*5|28 (verified )?reviews|ביקורות מאומתות|AggregateRating|"stars"/);
  });
});

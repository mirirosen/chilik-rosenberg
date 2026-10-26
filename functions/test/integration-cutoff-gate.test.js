'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..', '..');
const gatePath = path.join(root, 'scripts', 'assert-integration-cutoff.cjs');
const { checkCutoff, PLACEHOLDER } = require(gatePath);
const NOW = Date.parse('2026-10-27T08:00:00Z');
const on = cutoff => ({ CHILIK_INTEGRATION_SCHEDULER_ENABLED: 'true', CHILIK_INTEGRATION_CUTOFF_ISO: cutoff });

test('scheduler on: placeholder, missing or invalid cutoff blocks the deploy', () => {
  for (const cutoff of [PLACEHOLDER, undefined, '', '2026-10-27', '2026-10-27 08:00:00Z', '2026-10-27T08:00:00+03:00', '2026-02-30T08:00:00Z', '2026-10-27T25:00:00Z', 'not-a-date']) {
    const result = checkCutoff(on(cutoff), NOW);
    assert.equal(result.ok, false, String(cutoff));
    assert.match(result.message, /CHILIK_INTEGRATION_CUTOFF_ISO/);
  }
  assert.match(checkCutoff(on(PLACEHOLDER), NOW).message, /placeholder/);
});

test('scheduler on: a valid UTC cutoff passes; one more than an hour ahead is refused', () => {
  for (const cutoff of ['2026-10-27T08:00:00Z', '2026-10-27T07:59:59.500Z', '2026-10-20T00:00:00Z', '2026-10-27T08:59:00Z']) assert.deepEqual(checkCutoff(on(cutoff), NOW), { ok: true }, cutoff);
  assert.equal(checkCutoff(on('2026-10-28T08:00:00Z'), NOW).ok, false);
});

test('scheduler off: no cutoff is required', () => {
  for (const flag of ['false', undefined, 'TRUE']) assert.deepEqual(checkCutoff({ CHILIK_INTEGRATION_SCHEDULER_ENABLED: flag, CHILIK_INTEGRATION_CUTOFF_ISO: PLACEHOLDER }, NOW), { ok: true });
});

test('gate script exits non-zero against the shipped placeholder settings', () => {
  const settings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'booking-deployment-settings.json'), 'utf8'));
  // Run a copy of the script next to a temporary settings file, so the repo file is never touched.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cutoff-gate-'));
  try {
    fs.mkdirSync(path.join(dir, 'scripts')); fs.mkdirSync(path.join(dir, 'functions'));
    fs.copyFileSync(gatePath, path.join(dir, 'scripts', 'assert-integration-cutoff.cjs'));
    const run = values => {
      fs.writeFileSync(path.join(dir, 'functions', 'booking-deployment-settings.json'), JSON.stringify({ ...settings, ...values }));
      return spawnSync(process.execPath, [path.join(dir, 'scripts', 'assert-integration-cutoff.cjs')], { cwd: dir }).status;
    };
    assert.equal(run({ CHILIK_INTEGRATION_SCHEDULER_ENABLED: 'true', CHILIK_INTEGRATION_CUTOFF_ISO: PLACEHOLDER }), 1);
    assert.equal(run({ CHILIK_INTEGRATION_SCHEDULER_ENABLED: 'true', CHILIK_INTEGRATION_CUTOFF_ISO: new Date().toISOString().slice(0, 19) + 'Z' }), 0);
    assert.equal(run({ CHILIK_INTEGRATION_SCHEDULER_ENABLED: 'false', CHILIK_INTEGRATION_CUTOFF_ISO: PLACEHOLDER }), 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

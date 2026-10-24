#!/usr/bin/env node
'use strict';
// Predeploy check for firebase.hosting.booking.json.
// `npm run build:booking` succeeds even without the live build configuration, but then Firebase,
// the booking API and the admin login are compiled out and the deployed site cannot take bookings.
// Refuse to deploy a dist-booking that was not built with deploy/booking-hosting.env
// (copied to .env.booking.local), or that is a preprod/demo build.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

function readEnv(file) {
  const values = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) values[match[1]] = match[2];
  }
  return values;
}

function checkBuild(dist = path.join(root, 'dist-booking'), envFile = path.join(root, 'deploy', 'booking-hosting.env')) {
  const env = readEnv(envFile);
  const assets = path.join(dist, 'assets');
  if (!fs.existsSync(assets)) return { ok: false, problems: [`${dist} has no assets: run npm run build:booking first`] };
  const js = fs.readdirSync(assets).filter(file => file.endsWith('.js')).map(file => fs.readFileSync(path.join(assets, file), 'utf8')).join('\n');
  const required = {
    'Firebase project id': `projectId:"${env.VITE_BOOKING_FIREBASE_PROJECT_ID}"`,
    'Firebase API key': `apiKey:"${env.VITE_BOOKING_FIREBASE_API_KEY}"`,
    'Firebase auth domain': `authDomain:"${env.VITE_BOOKING_FIREBASE_AUTH_DOMAIN}"`,
    'Firebase app id': `appId:"${env.VITE_BOOKING_FIREBASE_APP_ID}"`,
    'booking API base': `"${env.VITE_PAYMENT_API_BASE}"`,
  };
  const problems = Object.entries(required).filter(([, needle]) => !js.includes(needle)).map(([name]) => `missing ${name}`);
  const home = path.join(dist, 'index.html');
  if (fs.existsSync(home) && fs.readFileSync(home, 'utf8').includes("connect-src 'none'")) problems.push('index.html is a preprod/demo build');
  return { ok: problems.length === 0, problems };
}

module.exports = { checkBuild, readEnv };

if (require.main === module) {
  const result = checkBuild();
  if (!result.ok) {
    console.error([
      'BLOCKED: dist-booking was not built with the live booking configuration.',
      ...result.problems.map(problem => ' - ' + problem),
      'Copy deploy/booking-hosting.env to .env.booking.local and rerun npm run build:booking.',
      'חסום: ה-build של האתר נבנה בלי הגדרות Firebase/API של האתר החי. העתיקו את deploy/booking-hosting.env ל-.env.booking.local ובנו מחדש.',
    ].join('\n'));
    process.exit(1);
  }
  console.log('booking hosting build carries the live Firebase/API configuration.');
}

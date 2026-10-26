#!/usr/bin/env node
'use strict';
// Predeploy guard for the root firebase.json. Its "dist" output is the old default
// `vite build`, not the live site. A bare `firebase deploy` must never publish it.
console.error([
  'BLOCKED: the default firebase.json is not a deploy target.',
  'Live booking site: npm run build:booking, then',
  '  firebase deploy --only hosting --project hilik-site --config firebase.hosting.booking.json',
  'חסום: firebase.json ברירת המחדל אינו יעד להעלאה. האתר החי נבנה ב-npm run build:booking ומועלה רק עם --config firebase.hosting.booking.json --project hilik-site.',
].join('\n'));
process.exit(1);

'use strict';
const settings = require('./calendar-deployment-settings.json');
for (const [key,value] of Object.entries(settings)) if (process.env[key] === undefined) process.env[key] = value;
module.exports = require('./src/index.js');

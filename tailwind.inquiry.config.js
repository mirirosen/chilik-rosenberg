import fs from 'node:fs';
import base from './tailwind.config.js';

// Keep the published CSS utilities while excluding unrelated booking/admin
// source from this entry's scanner. Class names contain no legacy runtime code.
export default {
  ...base,
  content: [
    './src/InquiryApp.jsx',
    './src/inquiry*.{js,jsx}',
    './src/components/{Bio,FAQ,Footer,Header,Hero,InquirySection,Journey,LanguageSwitcher,Lectures,MediaSection,Menu,RatingBar,Terms,TourInclusions,TourVideos}.jsx',
    { raw: fs.readFileSync(new URL('./scripts/inquiry-published-utilities.txt', import.meta.url), 'utf8'), extension: 'html' },
  ],
};

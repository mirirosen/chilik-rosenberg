import base from './tailwind.config.js';
export default { ...base, content: [...base.content, './booking-index.html', './apps/protected-booking/src/**/*.{js,jsx}'] };

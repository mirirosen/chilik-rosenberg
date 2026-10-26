'use strict';
// Writes the customer emails with sample data to a folder for visual review.
// Usage: node scripts/render-preview.js <out-dir>   (npm run preview -- <out-dir>)
// No network, no Firestore, no mail.
const fs = require('fs');
const path = require('path');
const { customerReceivedEmail, customerConfirmedEmail } = require('../src/customer-render');

const out = path.resolve(process.argv[2] || 'email-preview');
fs.mkdirSync(out, { recursive: true });
const NOW = Date.parse('2026-11-01T10:00:00Z');
const at = ms => ({ toMillis: () => ms });
const sample = {
  name: 'ישראל ישראלי', email: 'customer@example.com', phone: '0501234567', tourDate: '2026-11-05', participants: 3,
  totalPrice: 540, language: 'he', paymentMethod: 'credit', status: 'payment_pending', paymentStatus: 'awaiting_payment',
  paymentUrl: 'https://directng.tranzila.com/example/iframenew.php?sample=1', holdExpiresAt: at(NOW + 10 * 60000),
};
const paid = { ...sample, status: 'confirmed', paymentStatus: 'paid' };
const withPoint = { meetingPoint: 'רחוב רבי עקיבא 100, בני ברק (דוגמה)', tourTime: '11:00' };
const files = {
  'received-with-link-no-meeting-point': customerReceivedEmail('BK-SAMPLE1', sample, NOW),
  'received-no-link-with-meeting-point': customerReceivedEmail('BK-SAMPLE2', { ...sample, ...withPoint, paymentUrl: null }, NOW),
  'confirmed-no-meeting-point': customerConfirmedEmail('BK-SAMPLE1', paid),
  'confirmed-with-meeting-point': customerConfirmedEmail('BK-SAMPLE2', { ...paid, ...withPoint }),
};
for (const [name, m] of Object.entries(files)) {
  fs.writeFileSync(path.join(out, `${name}.html`), m.html);
  fs.writeFileSync(path.join(out, `${name}.txt`), `Subject: ${m.subject}\n\n${m.text}\n`);
}
console.log(`wrote ${Object.keys(files).length * 2} files to ${out}`);

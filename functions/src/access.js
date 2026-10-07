'use strict';
async function authenticate(req, verifyIdToken, needsAdmin = false) {
  const token = /^Bearer (.+)$/.exec(req.get('authorization') || '')?.[1];
  if (!token) throw Object.assign(new Error('authentication-required'), { status: 401 });
  let user;
  try { user = await verifyIdToken(token, true); }
  catch { throw Object.assign(new Error('authentication-required'), { status: 401 }); }
  if (needsAdmin && (user.admin !== true || user.firebase?.sign_in_provider === 'anonymous')) throw Object.assign(new Error('admin-required'), { status: 403 });
  return user;
}
function canReadStatus(booking, user) { return booking && (booking.ownerUid === user.uid || (user.admin === true && user.firebase?.sign_in_provider !== 'anonymous')); }
module.exports = { authenticate, canReadStatus };

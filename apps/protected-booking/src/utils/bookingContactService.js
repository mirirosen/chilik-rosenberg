const validId = id => typeof id === 'string' && /^BK-[a-f0-9]{24}$/.test(id);
async function abortable(promise, signal) {
  if (!signal) return promise;
  signal.throwIfAborted();
  let abort;
  const stopped = new Promise((_, reject) => { abort = () => reject(new Error('contact-aborted')); signal.addEventListener('abort', abort, { once: true }); });
  try { return await Promise.race([promise, stopped]); } finally { signal.removeEventListener('abort', abort); }
}
export function contactIdFromHash(hash) {
  if (!hash.startsWith('#contact=')) return null;
  const id = hash.slice('#contact='.length);
  return validId(id) ? id : 'invalid';
}
// Transport is injected for offline fixtures; credentials only enter a header.
export function createContactDownloader({ auth, base, isPreprod = false, allowEmulator = false, fetchImpl = globalThis.fetch }) {
  return async function downloadContact(bookingId, signal) {
    let url;
    try { url = new URL(base); } catch { throw new Error('contact-service-unavailable'); }
    if (isPreprod || !validId(bookingId) || url.username || url.password || url.search || url.hash || !(url.protocol === 'https:' || (allowEmulator && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('contact-service-unavailable');
    const user = auth?.currentUser;
    if (!user?.uid || user.isAnonymous) throw new Error('admin-required');
    const currentSession = () => {
      signal?.throwIfAborted();
      if (auth.currentUser !== user || auth.currentUser?.uid !== user.uid) throw new Error('admin-session-changed');
    };
    signal?.throwIfAborted();
    const result = await abortable(user.getIdTokenResult(true), signal);
    currentSession();
    if (result.claims?.admin !== true || typeof result.token !== 'string' || !result.token || /[\r\n]/.test(result.token)) throw new Error('admin-required');
    const response = await abortable(fetchImpl(`${base.replace(/\/$/, '')}/adminBookingContactCard?id=${bookingId}`, {
      method: 'GET', signal, cache: 'no-store', credentials: 'omit', redirect: 'error',
      referrerPolicy: 'no-referrer', headers: { Authorization: `Bearer ${result.token}` },
    }), signal);
    currentSession();
    // Server errors and provider bodies never reach the UI or logs.
    if (!response.ok) throw new Error([401, 403].includes(response.status) ? 'admin-required' : 'contact-unavailable');
    if (!/^text\/vcard(?:;|$)/i.test(response.headers.get('Content-Type') || '')) throw new Error('invalid-contact-response');
    const blob = await abortable(response.blob(), signal);
    currentSession();
    if (!blob.size || blob.size > 4096) throw new Error('invalid-contact-response');
    return blob;
  };
}

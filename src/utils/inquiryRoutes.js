export function inquiryRoute(pathname, search = '') {
  try { pathname = decodeURIComponent(pathname); } catch { return 'not-found'; }
  if (pathname === '/' || pathname === '/index.html') return 'home';
  if (pathname === '/terms' || pathname === '/תקנון') return 'terms';
  if (pathname === '/confirmation') return 'confirmation';
  if (pathname === '/booking') {
    const params = new URLSearchParams(search);
    return [...params.keys()].some(key => /^(id|bookingId|payment|paymentStatus|status|success|cancel|cancelled|result|payment_return|paymentReturn)$/i.test(key)) ? 'confirmation' : 'booking';
  }
  return 'not-found';
}

export function inquiryReference(search) {
  const params = new URLSearchParams(search);
  const reference = params.get('bookingId') || params.get('id');
  return /^BK-[a-f0-9]{20,24}$/.test(reference || '') ? reference : null;
}

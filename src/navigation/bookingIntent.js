// The booking picker is loaded on visibility. A deliberate CTA must also
// request it, and wait for its real heading before measuring/focusing it.
export const BOOKING_INTENT = 'chilik:booking-intent';
export function waitForInquiryHeading(signal, timeoutMs = 10000) {
  const existing = document.getElementById('inquiry-title');
  if (existing) return Promise.resolve(existing);
  if (signal.aborted) return Promise.resolve(null);
  return new Promise(resolve => {
    let timer;
    const finish = heading => {
      observer.disconnect(); clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      resolve(heading);
    };
    const check = () => {
      const heading = document.getElementById('inquiry-title');
      if (heading) finish(heading);
    };
    const abort = () => finish(null);
    const observer = new MutationObserver(check);
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
    signal.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => finish(null), timeoutMs);
    window.dispatchEvent(new Event(BOOKING_INTENT));
    check();
  });
}

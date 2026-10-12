import { afterEach, expect, it, vi } from 'vitest';
import { BOOKING_INTENT, waitForInquiryHeading } from '../../src/navigation/bookingIntent';
afterEach(() => { document.body.innerHTML = ''; vi.useRealTimers(); });
it('waits for the real heading when the lazy calendar replaces its placeholder', async () => {
  document.body.innerHTML = '<div id="root"><div id="date-selection">Loading</div></div>';
  const request = vi.fn(() => queueMicrotask(() => {
    document.getElementById('date-selection').outerHTML = '<section id="date-selection"><h2 id="inquiry-title" tabindex="-1">Choose a tour</h2></section>';
  }));
  window.addEventListener(BOOKING_INTENT, request, { once: true });
  expect(await waitForInquiryHeading(new AbortController().signal)).toBe(document.getElementById('inquiry-title'));
  expect(request).toHaveBeenCalledOnce();
});
it('cancels a pending heading wait when the visitor navigates elsewhere', async () => {
  document.body.innerHTML = '<div id="root"></div>';
  const controller = new AbortController(), result = waitForInquiryHeading(controller.signal);
  controller.abort();
  expect(await result).toBeNull();
});
it('bounds an unsuccessful calendar load without moving focus', async () => {
  vi.useFakeTimers(); document.body.innerHTML = '<div id="root"></div>';
  const result = waitForInquiryHeading(new AbortController().signal, 100);
  await vi.advanceTimersByTimeAsync(100);
  expect(await result).toBeNull();
});

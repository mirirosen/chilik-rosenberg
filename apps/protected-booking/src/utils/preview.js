// Build-time only: a preprod build cannot be enabled or disabled by a URL.
export const IS_PREPROD = import.meta.env.MODE === 'preprod';
export const PREVIEW_NOTICE = 'תצוגת דמו • תשלום מדומה • ללא הזמנות אמיתיות או הודעות | Design preview • Simulated payments • No real bookings or messages';
export const previewAvailability = Object.freeze({
  availabilityStatus: 'ready', blocked: [], soldOut: [], globalMaxParticipants: 30, tourDates: {},
});
export function isContactLink(href) {
  try {
    const url = new URL(href, window.location.origin);
    return ['tel:', 'mailto:', 'whatsapp:'].includes(url.protocol) || ['wa.me', 'api.whatsapp.com', 'web.whatsapp.com'].includes(url.hostname);
  } catch { return false; }
}
// Remove the destinations as well as cancelling clicks: middle-click, keyboard,
// and context-menu navigation must not open a real customer contact flow.
export function disablePreviewContacts(root = document) {
  const disable = () => root.querySelectorAll('a[href]').forEach(link => {
    if (isContactLink(link.getAttribute('href'))) {
      link.removeAttribute('href');
      link.setAttribute('aria-disabled', 'true');
      link.setAttribute('title', PREVIEW_NOTICE);
    }
  });
  disable();
  const observer = new MutationObserver(disable);
  observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['href'] });
  const block = event => {
    const link = event.target.closest?.('a');
    if (link && (link.getAttribute('aria-disabled') === 'true' || isContactLink(link.getAttribute('href') || ''))) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  };
  root.addEventListener('click', block, true);
  root.addEventListener('auxclick', block, true);
  return () => { observer.disconnect(); root.removeEventListener('click', block, true); root.removeEventListener('auxclick', block, true); };
}

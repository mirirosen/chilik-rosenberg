import { JSDOM } from 'jsdom';

export function assertPublicInquiryHtml(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  try {
    const staged = doc.querySelector('.preprod-banner')
      || [...doc.querySelectorAll('meta[name="robots"]')].some(meta => /noindex/i.test(meta.content))
      || [...doc.querySelectorAll('meta[http-equiv="Content-Security-Policy"]')].some(meta => /connect-src\s+'none'/i.test(meta.content));
    const inquiryEntry = [...doc.querySelectorAll('script[type="module"][src]')]
      .some(script => /^\/assets\/inquiry-index-[^/]+\.js$/.test(script.getAttribute('src')));
    if (staged || !inquiryEntry) throw Error('Preprod or non-inquiry HTML was used instead of public inquiry HTML');
  } finally { dom.window.close(); }
}

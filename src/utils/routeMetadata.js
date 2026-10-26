import { buildHomeSchema, organicCopy, siteOrigin as publicOrigin } from '../data/organicContent';

export function routeFromPath(pathname) {
  if (pathname === '/') return 'home';
  if (pathname === '/terms' || pathname === '/תנאים') return 'terms';
  if (pathname === '/admin') return 'admin';
  if (pathname === '/booking') return 'booking';
  if (pathname === '/confirmation') return 'confirmation';
  return 'not-found';
}

// Only public content pages belong in search/share URLs. Booking references,
// payment query parameters and personal data must never enter metadata.
export function applyRouteMetadata({ route, language, isPreprod = ['preprod', 'booking-demo'].includes(import.meta.env.MODE), t, document: doc = document, englishHome = false }) {
  const indexed = !isPreprod && ['home', 'terms'].includes(route);
  // The booking site has an indexable English homepage (/en); its canonical follows the language.
  const homePath = englishHome && language?.startsWith('en') ? '/en' : '/';
  const key = ['home', 'terms', 'admin', 'booking', 'confirmation'].includes(route) ? route : 'notFound';
  const homeCopy = organicCopy[language?.startsWith('en') ? 'en' : 'he'];
  const title = route === 'home' ? homeCopy.title : t(`seo.${key}.title`);
  const description = route === 'home' ? homeCopy.description : t(`seo.${key}.description`);
  doc.title = title;
  const setMeta = (attribute, name, content) => {
    let meta = doc.querySelector(`meta[${attribute}="${name}"]`);
    if (!meta) { meta = doc.createElement('meta'); meta.setAttribute(attribute, name); doc.head.append(meta); }
    meta.content = content;
  };
  setMeta('name', 'robots', indexed ? 'index, follow, max-image-preview:large' : 'noindex, nofollow');
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:locale', language === 'he' ? 'he_IL' : 'en_GB');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  setMeta('name', 'twitter:card', 'summary_large_image');
  setMeta('property', 'og:type', 'website');
  const imageUrl = `${publicOrigin}/media/hero/bnei-brak-sequence-poster.webp`;
  setMeta('property', 'og:image', imageUrl);
  setMeta('property', 'og:image:alt', organicCopy[language?.startsWith('en') ? 'en' : 'he'].title);
  setMeta('name', 'twitter:image', imageUrl);
  doc.querySelector('#organic-schema')?.remove();
  if (indexed && route === 'home') {
    const schema = doc.createElement('script');
    schema.id = 'organic-schema'; schema.type = 'application/ld+json';
    schema.textContent = JSON.stringify(buildHomeSchema({ language, description, faqs: t('faqs', { returnObjects: true }), path: homePath })).replace(/</g, '\\u003c');
    doc.head.append(schema);
  }
  if (!indexed) {
    doc.querySelectorAll('link[rel="canonical"], meta[property="og:url"]').forEach(node => node.remove());
    return;
  }
  const url = route === 'terms' ? `${publicOrigin}/terms` : publicOrigin + homePath;
  let canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = doc.createElement('link'); canonical.rel = 'canonical'; doc.head.append(canonical); }
  canonical.href = url;
  setMeta('property', 'og:url', url);
}

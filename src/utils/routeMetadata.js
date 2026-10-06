const publicOrigin = 'https://www.chilik-tours.com';

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
export function applyRouteMetadata({ route, language, isPreprod = false, t, document: doc = document }) {
  const indexed = !isPreprod && ['home', 'terms'].includes(route);
  const key = ['home', 'terms', 'admin', 'booking', 'confirmation'].includes(route) ? route : 'notFound';
  const title = t(`seo.${key}.title`);
  const description = t(`seo.${key}.description`);
  doc.title = title;
  const setMeta = (attribute, name, content) => {
    let meta = doc.querySelector(`meta[${attribute}="${name}"]`);
    if (!meta) { meta = doc.createElement('meta'); meta.setAttribute(attribute, name); doc.head.append(meta); }
    meta.content = content;
  };
  setMeta('name', 'robots', indexed ? 'index, follow' : 'noindex, nofollow');
  setMeta('name', 'description', description);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', description);
  setMeta('property', 'og:locale', language === 'he' ? 'he_IL' : 'en_GB');
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', description);
  if (!indexed) {
    doc.querySelectorAll('link[rel="canonical"], meta[property="og:url"]').forEach(node => node.remove());
    return;
  }
  const url = `${publicOrigin}/${route === 'terms' ? 'terms' : ''}`;
  let canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) { canonical = doc.createElement('link'); canonical.rel = 'canonical'; doc.head.append(canonical); }
  canonical.href = url;
  setMeta('property', 'og:url', url);
}

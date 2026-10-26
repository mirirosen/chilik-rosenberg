import ReactDOM from 'react-dom/client';
import { flushSync } from 'react-dom';

// Hydrate only an actual prerendered homepage in its matching initial language.
// Explicit saved English and all isolated/private/demo shells keep client render.
export function mountPublicSite(element, language) {
  const root = document.getElementById('root');
  if (root.dataset.prerender === language && ['/', '/index.html', '/en'].includes(window.location.pathname)) {
    return ReactDOM.hydrateRoot(root, element);
  }
  const client = ReactDOM.createRoot(root);
  if (root.dataset.prerender && root.dataset.prerender !== language) {
    // No frame may mirror the old Hebrew DOM before the English commit.
    flushSync(() => {
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
      client.render(element);
    });
    return client;
  }
  client.render(element);
  return client;
}

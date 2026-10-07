import { IS_PREPROD, PREVIEW_NOTICE, disablePreviewContacts } from './utils/preview';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import i18n from './i18n';
import { applyRouteMetadata, routeFromPath } from './utils/routeMetadata';


if (IS_PREPROD) {
  disablePreviewContacts();
  document.body.classList.add('preprod');
}

applyRouteMetadata({ route: routeFromPath(window.location.pathname), language: i18n.language, isPreprod: IS_PREPROD, t: i18n.t.bind(i18n) });

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    {IS_PREPROD && <aside className="preprod-banner" role="status">{PREVIEW_NOTICE}</aside>}
  </React.StrictMode>,
);

import React from 'react';
import ReactDOM from 'react-dom/client';
import i18n from './inquiry-i18n';
import InquiryApp from './InquiryApp';
import './index.css';
import './inquiry.css';
import { inquiryRoute } from './utils/inquiryRoutes';
import { applyRouteMetadata } from './utils/routeMetadata';

applyRouteMetadata({ route: inquiryRoute(window.location.pathname, window.location.search), language: i18n.language, t: i18n.t.bind(i18n) });

ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><InquiryApp /></React.StrictMode>);

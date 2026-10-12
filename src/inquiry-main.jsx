import './utils/paymentReturnBootstrap';
import React from 'react';
import { mountPublicSite } from './utils/mountPublicSite';
import i18n from './inquiry-i18n';
import InquiryApp from './InquiryApp';
import './index.css';
import './inquiry.css';
import './site-design.css';
import { inquiryRoute } from './utils/inquiryRoutes';
import { applyRouteMetadata } from './utils/routeMetadata';

applyRouteMetadata({ route: inquiryRoute(window.location.pathname, window.location.search), language: i18n.language, t: i18n.t.bind(i18n) });

mountPublicSite(<React.StrictMode><InquiryApp /></React.StrictMode>, i18n.language);

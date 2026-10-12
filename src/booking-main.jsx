import './utils/paymentReturnBootstrap';
import React from 'react';
import { mountPublicSite } from './utils/mountPublicSite';
import BookingSiteApp from './BookingSiteApp';
import i18n from './booking-i18n';
import './index.css';
import './inquiry.css';
import './site-design.css';

mountPublicSite(<React.StrictMode><BookingSiteApp /></React.StrictMode>, i18n.language);

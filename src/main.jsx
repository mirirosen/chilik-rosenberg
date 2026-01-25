import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n'; // Initialize i18n
import { initEmailJS } from './utils/emailService';

// Initialize EmailJS
initEmailJS();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

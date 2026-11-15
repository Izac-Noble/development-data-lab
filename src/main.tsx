import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { DEFAULT_COMPARE_COUNTRIES } from './data/countries';
import { DEFAULT_INDICATOR } from './data/indicators';
import { fetchIndicatorSeriesBatch } from './services/api';
import './styles.css';

// Start the first (slow) World Bank request before React renders; the app reuses it.
fetchIndicatorSeriesBatch(DEFAULT_COMPARE_COUNTRIES, DEFAULT_INDICATOR).catch(() => undefined);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { initAnalyticsAfterConsent } from './lib/consent';
import './index.css';

// Tracking (GA4 + Meta Pixel) starts only for visitors who already granted
// consent on a previous visit; first-time visitors are asked via the banner.
initAnalyticsAfterConsent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
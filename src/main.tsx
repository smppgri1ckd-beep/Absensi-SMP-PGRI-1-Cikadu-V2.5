import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { registerServiceWorker } from './serviceWorkerRegistration';

// Register PWA Service Worker
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

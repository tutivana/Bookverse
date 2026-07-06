import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent HMR WebSocket connection failures from causing visible unhandled rejection alerts or overlays
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reasonStr = event.reason ? String(event.reason) : '';
    const messageStr = event.reason?.message || '';
    if (
      reasonStr.toLowerCase().includes('websocket') ||
      messageStr.toLowerCase().includes('websocket')
    ) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Benign development WebSocket error suppressed:', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    const messageStr = event.message || '';
    if (messageStr.toLowerCase().includes('websocket')) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('Benign development WebSocket error suppressed:', event.message);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);


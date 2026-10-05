import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './fonts';
import './styles/index.css';
import App from './App';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);

// Production only: in dev it would cache module graph responses and shadow every edit.
// See public/sw.js for what it does and why the venue needs it.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Unregisterable (file:// , an insecure origin, or a locked-down browser). The app
      // works; it just will not survive a reload with no network.
    });
  });
}

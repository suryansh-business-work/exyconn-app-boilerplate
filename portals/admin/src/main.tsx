import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app';
import { loadConfig } from './config';

const container = document.getElementById('root');
if (!container) {
  throw new Error('The #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App config={loadConfig(import.meta.env)} />
    </BrowserRouter>
  </StrictMode>,
);

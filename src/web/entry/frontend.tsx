/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import './polyfill';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './Main';
import { PageProvider } from '../contexts/page';
import { ServerProvider } from '../contexts/servers';
import { OpenServerPanelProvider } from '../contexts/addServerPanel';
import { WebSocketProvider } from '../contexts/websocket';
import { NotificationProvider } from '../contexts/notification';
import { isPreviewMode } from '@/utils/config';

async function enableMocking() {
  if (!isPreviewMode) return;

  const { worker } = await import('../preview/browser');

  return worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: './mockServiceWorker.js',
    },
  });
}

const elem = document.getElementById('root')!;
const app = (
  <StrictMode>
    <NotificationProvider>
      <WebSocketProvider>
        <PageProvider>
          <ServerProvider>
            <OpenServerPanelProvider>
              <App />
            </OpenServerPanelProvider>
          </ServerProvider>
        </PageProvider>
      </WebSocketProvider>
    </NotificationProvider>
  </StrictMode>
);

enableMocking().then(() => {
  if (import.meta.hot) {
    // With hot module reloading, `import.meta.hot.data` is persisted.
    const root = (import.meta.hot.data.root ??= createRoot(elem));
    root.render(app);
  } else {
    // The hot module reloading API is not available in production.
    createRoot(elem).render(app);
  }
});

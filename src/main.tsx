import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/react';

import App from './App';
import { CLERK_KEY } from './components/ClerkGate';
import './index.css';

if (!CLERK_KEY) console.warn('[auth] VITE_CLERK_PUBLISHABLE_KEY is not set: running in guest mode (device id, no sign-in).');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {CLERK_KEY ? (
      <ClerkProvider publishableKey={CLERK_KEY} afterSignOutUrl={import.meta.env.BASE_URL}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
);

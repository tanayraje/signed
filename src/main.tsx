import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { StoreProvider } from './lib/store';
import App from './App';
import './styles.css';

registerSW({ immediate: true });

// An invite link is remembered straight away, so signing in and setting up a seal can't lose it.
const inviteMatch = window.location.hash.match(/^#\/?invite\/([A-Za-z0-9]+)/);
if (inviteMatch) { try { localStorage.setItem('signed.pendingInvite', inviteMatch[1]); } catch { /* storage blocked */ } }

// Opening the app always starts on the Wall. Links that bring you somewhere on purpose
// (an invite, a landed letter from a notification, the 11:11 alarm) are kept.
const KEEP = ['invite', 'friend', 'wish', 'open', 'read', 'setup'];
const first = window.location.hash.replace(/^#\/?/, '').split('/')[0];
if (first && !KEEP.includes(first)) history.replaceState(null, '', `${window.location.pathname}#/wall`);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>
);

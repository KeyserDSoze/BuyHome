import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { ThemeModeProvider } from './context/ThemeModeContext';

// Use a placeholder when the env var is missing so GoogleOAuthProvider doesn't crash.
// The AuthContext checks driveConfigured (!!CLIENT_ID) before ever calling signIn.
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 'not-configured';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ThemeModeProvider>
        <App />
      </ThemeModeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => {
      console.error('Service worker registration failed', error);
    });
  });
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import theme from './theme';
import App from './App';

// Use a placeholder when the env var is missing so GoogleOAuthProvider doesn't crash.
// The AuthContext checks driveConfigured (!!CLIENT_ID) before ever calling signIn.
const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || 'not-configured';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);

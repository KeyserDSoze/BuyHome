/**
 * AuthContext.tsx
 * Google OAuth 2.0 (implicit flow) + Google Drive sync state.
 * Requires <GoogleOAuthProvider clientId={...}> as an ancestor.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { Project } from '../models/types';
import {
  findOrCreateFolder,
  findBackupFile,
  uploadBackup,
  downloadBackup,
  DriveBackup,
} from '../storage/driveSync';
import { mergeProjects, getAllProjects } from '../storage/projectsStore';

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GoogleUser {
  name: string;
  email: string;
  picture: string;
}

interface StoredAuth {
  accessToken: string;
  expiry: number;
  grantedScopes?: string;
  user: GoogleUser;
  driveFolderId: string | null;
  driveFileId: string | null;
}

function hasGrantedDriveScope(grantedScopes?: string): boolean {
  return grantedScopes?.split(' ').includes(DRIVE_SCOPE) ?? false;
}

export interface AuthContextValue {
  user: GoogleUser | null;
  isTokenValid: boolean;
  /** true if VITE_GOOGLE_CLIENT_ID env var is set */
  driveConfigured: boolean;
  /** Open the Google sign-in popup */
  signIn: () => void;
  signOut: () => void;
  /**
   * Upload all current local projects to Drive.
   * Resolves silently on error (logs to console).
   */
  syncToDrive: () => Promise<void>;
  /**
   * Download Drive backup and merge into local storage.
   * Returns the list of newly merged Project objects (or null on error / not authed).
   */
  syncFromDrive: () => Promise<Project[] | null>;
  isSyncing: boolean;
  lastSync: Date | null;
  syncError: string | null;
}

// ── Storage key ───────────────────────────────────────────────────────────────

const AUTH_KEY = 'rcc_auth_v1';

function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const auth = JSON.parse(raw) as StoredAuth;
    // Discard expired tokens
    if (Date.now() > auth.expiry) {
      localStorage.removeItem(AUTH_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [storedAuth, setStoredAuth] = useState<StoredAuth | null>(loadStoredAuth);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const driveConfigured = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID as string);
  const isTokenValid = storedAuth !== null && Date.now() < storedAuth.expiry;

  function persistAuth(auth: StoredAuth) {
    setStoredAuth(auth);
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  }

  // ── Google login ────────────────────────────────────────────────────────────

  const openGoogleLogin = useGoogleLogin({
    onSuccess: async tokenResponse => {
      const { access_token, expires_in, scope } = tokenResponse;
      // 60-second buffer before actual expiry
      const expiry = Date.now() + (expires_in - 60) * 1000;

      // Fetch user profile
      let user: GoogleUser = { name: '', email: '', picture: '' };
      try {
        const info = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        }).then(r => r.json());
        user = { name: info.name ?? '', email: info.email ?? '', picture: info.picture ?? '' };
      } catch {
        // non-fatal
      }

      const grantedScopes = scope ?? '';
      if (!hasGrantedDriveScope(grantedScopes)) {
        setSyncError('Google non ha concesso l\'accesso a Drive. Controlla il consenso OAuth e riprova.');
      }

      persistAuth({
        accessToken: access_token,
        expiry,
        grantedScopes,
        user,
        driveFolderId: storedAuth?.driveFolderId ?? null,
        driveFileId: storedAuth?.driveFileId ?? null,
      });
    },
    onError: err => {
      console.error('Google login error', err);
      setSyncError('Accesso Google non riuscito.');
    },
    prompt: 'consent',
    scope: GOOGLE_OAUTH_SCOPES,
  });

  const signIn = useCallback(() => {
    if (!driveConfigured) {
      setSyncError('VITE_GOOGLE_CLIENT_ID non configurato nel file .env');
      return;
    }
    setSyncError(null);
    openGoogleLogin();
  }, [driveConfigured, openGoogleLogin]);

  const signOut = useCallback(() => {
    googleLogout();
    setStoredAuth(null);
    localStorage.removeItem(AUTH_KEY);
    setLastSync(null);
    setSyncError(null);
  }, []);

  // ── Silent token refresh ────────────────────────────────────────────────────
  //
  // Google OAuth implicit flow has no refresh token: the access token lasts 1h.
  // We can ask for a new one silently (no popup) using prompt:'none' as long as
  // the user still has an active Google session in the browser.
  // We schedule a setTimeout to fire 10 min before the stored token expires;
  // on success we extend seamlessly, on failure we do nothing (native expiry
  // handling then shows the "Accedi" button when needed).

  const openSilentRefresh = useGoogleLogin({
    onSuccess: tokenResponse => {
      const { access_token, expires_in, scope } = tokenResponse;
      const expiry = Date.now() + (expires_in - 60) * 1000;
      // Reuse the existing user profile — no need for another /userinfo call
      persistAuth({
        accessToken: access_token,
        expiry,
        grantedScopes: scope ?? storedAuth?.grantedScopes ?? '',
        user: storedAuth!.user,
        driveFolderId: storedAuth?.driveFolderId ?? null,
        driveFileId: storedAuth?.driveFileId ?? null,
      });
    },
    onError: err => {
      // Non-fatal: the user will be prompted to re-login when the token expires
      console.warn('Silent token refresh failed', err);
    },
    prompt: 'none',
    scope: GOOGLE_OAUTH_SCOPES,
  });

  // Keep a ref so the setTimeout closure always sees the latest function
  const silentRefreshRef = useRef(openSilentRefresh);
  silentRefreshRef.current = openSilentRefresh;

  useEffect(() => {
    if (!storedAuth || Date.now() >= storedAuth.expiry) return;

    // Fire 10 min before the token expires (minimum 0ms so it always fires)
    const msUntilRefresh = Math.max(0, storedAuth.expiry - Date.now() - 10 * 60 * 1000);
    const timer = setTimeout(() => {
      silentRefreshRef.current();
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  // Re-schedule every time a new token is stored (expiry changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedAuth?.expiry]);

  // ── Drive helpers ───────────────────────────────────────────────────────────

  async function resolveDriveIds(token: string): Promise<{ folderId: string; fileId: string | null; auth: StoredAuth }> {
    let folderId = storedAuth?.driveFolderId ?? null;
    let fileId = storedAuth?.driveFileId ?? null;

    if (!folderId) folderId = await findOrCreateFolder(token);
    if (!fileId) fileId = await findBackupFile(token, folderId);

    const updatedAuth: StoredAuth = {
      ...storedAuth!,
      accessToken: token,
      driveFolderId: folderId,
      driveFileId: fileId,
    };
    return { folderId, fileId, auth: updatedAuth };
  }

  // ── syncToDrive ─────────────────────────────────────────────────────────────

  const syncToDrive = useCallback(async () => {
    if (!isTokenValid || !storedAuth) return;
    if (storedAuth.grantedScopes && !hasGrantedDriveScope(storedAuth.grantedScopes)) {
      setSyncError('Il token corrente non include i permessi Google Drive. Rientra con Google e conferma l\'accesso a Drive.');
      return;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const token = storedAuth.accessToken;
      const { folderId, fileId, auth } = await resolveDriveIds(token);
      const projects = getAllProjects();
      const backup: DriveBackup = {
        version: 1,
        projects,
        savedAt: new Date().toISOString(),
      };
      const newFileId = await uploadBackup(token, folderId, fileId, backup);
      persistAuth({ ...auth, driveFileId: newFileId });
      setLastSync(new Date());
    } catch (e) {
      console.error('syncToDrive error', e);
      setSyncError('Sincronizzazione Drive non riuscita.');
    } finally {
      setIsSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenValid, storedAuth]);

  // ── syncFromDrive ───────────────────────────────────────────────────────────

  const syncFromDrive = useCallback(async (): Promise<Project[] | null> => {
    if (!isTokenValid || !storedAuth) return null;
    if (storedAuth.grantedScopes && !hasGrantedDriveScope(storedAuth.grantedScopes)) {
      setSyncError('Il token corrente non include i permessi Google Drive. Rientra con Google e conferma l\'accesso a Drive.');
      return null;
    }
    setIsSyncing(true);
    setSyncError(null);
    try {
      const token = storedAuth.accessToken;
      const { folderId, fileId, auth } = await resolveDriveIds(token);
      if (!fileId) {
        persistAuth(auth);
        return null; // no backup on Drive yet
      }
      const backup = await downloadBackup(token, fileId);
      if (!backup?.projects) return null;

      mergeProjects(backup.projects);
      persistAuth({ ...auth, driveFileId: fileId });
      setLastSync(new Date());
      return backup.projects;
    } catch (e) {
      console.error('syncFromDrive error', e);
      setSyncError('Download da Drive non riuscito.');
      return null;
    } finally {
      setIsSyncing(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTokenValid, storedAuth]);

  // ── Value ───────────────────────────────────────────────────────────────────

  return (
    <AuthContext.Provider
      value={{
        user: isTokenValid ? (storedAuth?.user ?? null) : null,
        isTokenValid,
        driveConfigured,
        signIn,
        signOut,
        syncToDrive,
        syncFromDrive,
        isSyncing,
        lastSync,
        syncError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

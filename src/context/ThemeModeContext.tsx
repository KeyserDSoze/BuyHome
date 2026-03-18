import React, { createContext, useContext, useMemo, useState } from 'react';
import { CssBaseline, PaletteMode, ThemeProvider } from '@mui/material';
import { createAppTheme } from '../theme';

const THEME_MODE_KEY = 'buyhome_theme_mode_v1';

interface ThemeModeContextValue {
  mode: PaletteMode;
  toggleMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

function loadInitialMode(): PaletteMode {
  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(loadInitialMode);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    toggleMode: () => {
      setMode(prev => {
        const next = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_MODE_KEY, next);
        return next;
      });
    },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error('useThemeMode must be used inside ThemeModeProvider');
  }
  return context;
}
import { createTheme } from '@mui/material/styles';
import { PaletteMode } from '@mui/material';

export function createAppTheme(mode: PaletteMode) {
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#2E7D32' : '#1B5E20',
        light: '#4CAF50',
        dark: '#123A15',
        contrastText: '#fff',
      },
      secondary: {
        main: '#F9A825',
        contrastText: '#000',
      },
      background: {
        default: isDark ? '#101411' : '#F5F5F0',
        paper: isDark ? '#17201A' : '#FFFFFF',
      },
      text: {
        primary: isDark ? '#EDF5EE' : '#17201A',
        secondary: isDark ? '#B9C8BC' : '#4E5D52',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { borderRadius: 10 },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: { borderRadius: 0 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600 },
        },
      },
    },
  });
}

const theme = createAppTheme('light');

export default theme;

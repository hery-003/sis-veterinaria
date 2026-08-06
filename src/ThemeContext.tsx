import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { ThemeProvider, createTheme, alpha, type Theme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { GlobalStyles } from '@mui/material';

interface ThemeModeContextType {
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextType | null>(null);

const globalStyles = (theme: Theme) => ({
  '*': {
    scrollbarWidth: 'thin',
    scrollbarColor: `${alpha(theme.palette.primary.main, 0.3)} transparent`,
  },
  '*::-webkit-scrollbar': { width: 6, height: 6 },
  '*::-webkit-scrollbar-track': { background: 'transparent' },
  '*::-webkit-scrollbar-thumb': {
    background: alpha(theme.palette.primary.main, 0.3),
    borderRadius: 3,
    boxShadow: `0 0 6px ${alpha(theme.palette.primary.main, 0.2)}`,
    '&:hover': { background: alpha(theme.palette.primary.main, 0.5) },
  },
  '::selection': {
    background: alpha(theme.palette.primary.main, 0.35),
    color: '#fff',
  },
  '@keyframes shimmer': {
    '0%': { backgroundPosition: '-200% 0' },
    '100%': { backgroundPosition: '200% 0' },
  },
  '@keyframes float': {
    '0%, 100%': { transform: 'translateY(0)' },
    '50%': { transform: 'translateY(-10px)' },
  },
  '@keyframes gradientShift': {
    '0%': { backgroundPosition: '0% 50%' },
    '50%': { backgroundPosition: '100% 50%' },
    '100%': { backgroundPosition: '0% 50%' },
  },
  '@keyframes fadeSlideUp': {
    from: { opacity: 0, transform: 'translateY(16px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
  '@keyframes scaleIn': {
    from: { opacity: 0, transform: 'scale(0.97)' },
    to: { opacity: 1, transform: 'scale(1)' },
  },
});

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('themeMode') as 'light' | 'dark') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('themeMode', next);
      return next;
    });
  }, []);

  const themeContextValue = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme]);

  const theme = useMemo(() => createTheme({
    shape: { borderRadius: 16 },
    typography: {
      fontFamily: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.04em', fontSize: '2rem' },
      h5: { fontWeight: 700, letterSpacing: '-0.03em', fontSize: '1.5rem' },
      h6: { fontWeight: 700, fontSize: '1.1rem' },
      subtitle1: { fontWeight: 600, fontSize: '1rem' },
      subtitle2: { fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.01em' },
      body1: { fontSize: '0.95rem', lineHeight: 1.6 },
      body2: { fontSize: '0.875rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', fontWeight: 600 },
      overline: { fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.15em' },
      button: { textTransform: 'none', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '0.02em' },
    },
    palette: {
      mode,
      ...(mode === 'light'
        ? {
            primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#fff' },
            secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2', contrastText: '#fff' },
            error: { main: '#f43f5e', light: '#fb7185', dark: '#e11d48' },
            warning: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706' },
            info: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb' },
            success: { main: '#10b981', light: '#34d399', dark: '#059669' },
            background: { default: '#f8fafc', paper: '#ffffff' },
            text: { primary: '#0f172a', secondary: '#475569', disabled: '#94a3b8' },
            divider: alpha('#6366f1', 0.08),
          }
        : {
            primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#fff' },
            secondary: { main: '#22d3ee', light: '#67e8f9', dark: '#06b6d4', contrastText: '#fff' },
            error: { main: '#fb7185', light: '#fda4af', dark: '#f43f5e' },
            warning: { main: '#fbbf24', light: '#fcd34d', dark: '#f59e0b' },
            info: { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6' },
            success: { main: '#34d399', light: '#6ee7b7', dark: '#10b981' },
            background: { default: '#020617', paper: '#0f172a' },
            text: { primary: '#f8fafc', secondary: '#94a3b8', disabled: '#475569' },
            divider: alpha('#818cf8', 0.12),
          }
      ),
    },
    shadows: [
      'none',
      `0 1px 2px ${alpha('#000', 0.05)}`,
      `0 4px 6px -1px ${alpha('#000', 0.1)}, 0 2px 4px -1px ${alpha('#000', 0.06)}`,
      `0 10px 15px -3px ${alpha('#000', 0.1)}, 0 4px 6px -2px ${alpha('#000', 0.05)}`,
      `0 20px 25px -5px ${alpha('#000', 0.1)}, 0 10px 10px -5px ${alpha('#000', 0.04)}`,
      `0 25px 50px -12px ${alpha('#000', 0.25)}`,
      ...Array(19).fill(`0 0 0 ${alpha('#818cf8', 0.05)}`),
    ] as [
      'none',
      string, string, string, string, string,
      string, string, string, string, string,
      string, string, string, string, string,
      string, string, string, string, string,
      string, string, string, string
    ],
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.3s ease, color 0.3s ease',
            backgroundColor: mode === 'light' ? '#f8fafc' : '#020617',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: '8px 20px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-1px)',
            },
          },
          contained: {
            boxShadow: `0 4px 14px 0 ${alpha('#6366f1', 0.35)}`,
            '&:hover': {
              boxShadow: `0 6px 20px 0 ${alpha('#6366f1', 0.45)}`,
              transform: 'translateY(-2px)',
            },
          },
          outlined: {
            borderWidth: '1.5px !important',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backdropFilter: 'blur(12px)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 20,
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 24,
            boxShadow: `0 25px 50px -12px ${alpha('#000', 0.5)}`,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 12,
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: alpha('#6366f1', 0.4),
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            fontWeight: 700,
          },
        },
      },
    },
  }), [mode]);

  return (
    <ThemeModeContext.Provider value={themeContextValue}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <GlobalStyles styles={globalStyles} />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextType | null {
  return useContext(ThemeModeContext);
}

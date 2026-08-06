import React from 'react';
import { Box, Typography, Button, Paper, alpha, useTheme } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import HomeIcon from '@mui/icons-material/Home';

interface ErrorFallbackProps {
  error: Error | null;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', p: 4,
      background: isDark
        ? 'linear-gradient(135deg, #020617 0%, #0f172a 50%, #1a0a2e 100%)'
        : 'linear-gradient(135deg, #f4f0fa 0%, #ede4f5 100%)',
    }}>
      <Paper sx={{
        p: 6, maxWidth: 460, textAlign: 'center', borderRadius: 4,
        border: (t) => `1px solid ${alpha(t.palette.error.main, 0.15)}`,
        boxShadow: isDark ? '0 30px 80px rgba(0,0,0,0.4)' : '0 30px 80px rgba(0,0,0,0.06)',
        animation: 'shake 0.5s ease-in-out',
        '@keyframes shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      }}>
        <Box sx={{
          width: 80, height: 80, borderRadius: '50%', mx: 'auto', mb: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(theme.palette.error.main, isDark ? 0.15 : 0.1),
          boxShadow: `0 0 24px ${alpha(theme.palette.error.main, 0.15)}`,
        }}>
          <ErrorOutlineIcon sx={{ fontSize: 48, color: 'error.main' }} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          Algo salió mal
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360, mx: 'auto' }}>
          {error?.message || 'Ha ocurrido un error inesperado en la aplicación. Puede intentar recargar o volver al inicio.'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center' }}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={onReset}>
            Reintentar
          </Button>
          <Button variant="contained" startIcon={<HomeIcon />} onClick={() => window.location.hash = '#/dashboard'} sx={{
            background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
            '&:hover': { background: 'linear-gradient(135deg, #c084fc, #a855f7)' },
          }}>
            Ir al Inicio
          </Button>
        </Box>
      </Paper>
    </Box>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

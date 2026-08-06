import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

export default function EmptyState({ icon, title, action, search }: {
  icon: React.ReactElement;
  title: string;
  action?: React.ReactNode;
  search?: string;
}) {
  const theme = useTheme();
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2.5,
      py: 10,
      px: 4,
      animation: 'fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      textAlign: 'center',
    }}>
      <Box sx={{ position: 'relative', width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(theme.palette.primary.main, 0.08)}, transparent 70%)`,
        }} />
        <Box sx={{
          position: 'absolute',
          inset: 8,
          borderRadius: '50%',
          border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
          animation: 'spin 24s linear infinite',
        }} />
        <Box sx={{
          width: 88, height: 88,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.6),
          border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
          color: 'primary.main',
          boxShadow: (t) => `0 20px 40px -16px ${alpha(t.palette.primary.main, 0.25)}`,
          transition: 'all 0.4s ease',
          '&:hover': {
            transform: 'translateY(-4px) scale(1.04)',
            boxShadow: (t) => `0 28px 48px -16px ${alpha(t.palette.primary.main, 0.35)}`,
          },
        }}>
          {React.cloneElement(icon as React.ReactElement<{ sx?: React.CSSProperties }>, { sx: { fontSize: 42, opacity: 0.85 } })}
        </Box>
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 340, fontWeight: 600, opacity: 0.7 }}>
          {search || 'No hay información disponible para mostrar en este momento.'}
        </Typography>
      </Box>
      {action && (
        <Box sx={{ mt: 1 }}>
          {action}
        </Box>
      )}
    </Box>
  );
}

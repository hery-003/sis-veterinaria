import React from 'react';
import { Box, Typography, alpha } from '@mui/material';

export type HeaderGradient = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

interface PageHeaderProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient?: HeaderGradient;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
}

export default function PageHeader({ icon, title, subtitle, gradient = 'primary', badge, actions, compact = false }: PageHeaderProps) {
  const size = compact ? 44 : 52;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5 }}>
        <Box sx={{
          width: size, height: size, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: (t) => `linear-gradient(135deg, ${t.palette[gradient].main}, ${t.palette[gradient].dark})`,
          color: 'white',
          boxShadow: (t) => `0 8px 20px -6px ${alpha(t.palette[gradient].main, 0.4)}`,
          flexShrink: 0,
        }}>
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<{ sx?: object }>, { sx: { fontSize: compact ? 24 : 28 } })
            : icon}
        </Box>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.04em', fontSize: compact ? '1.5rem' : undefined }}>
              {title}
            </Typography>
            {badge}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {subtitle}
          </Typography>
        </Box>
      </Box>
      {actions && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </Box>
      )}
    </Box>
  );
}

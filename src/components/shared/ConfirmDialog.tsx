import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button, Grow, Box, Typography, alpha, useTheme } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { forwardRef } from 'react';

const Transition = forwardRef(function Transition(props: any, ref: React.Ref<unknown>) {
  return <Grow ref={ref} timeout={200} {...props} />;
});

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', confirmColor = 'error', onConfirm, onCancel }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: 'error' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Dialog 
      open={open} 
      onClose={onCancel} 
      maxWidth="xs" 
      fullWidth
      slots={{ transition: Transition }}
      slotProps={{
        paper: {
          sx: { borderRadius: 3, p: 1 }
        }
      }}
    >
      <DialogTitle component="div" sx={{ textAlign: 'center', pt: 3, pb: 0 }}>
        <Box sx={{
          width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 1.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: confirmColor === 'error'
            ? alpha(theme.palette.error.main, isDark ? 0.15 : 0.1)
            : alpha(theme.palette.warning.main, isDark ? 0.15 : 0.1),
          boxShadow: confirmColor === 'error'
            ? `0 0 16px ${alpha(theme.palette.error.main, 0.2)}`
            : `0 0 16px ${alpha(theme.palette.warning.main, 0.2)}`,
        }}>
          {confirmColor === 'error' ? (
            <ErrorOutlineIcon sx={{ fontSize: 28, color: 'error.main' }} />
          ) : (
            <WarningAmberIcon sx={{ fontSize: 28, color: 'warning.main' }} />
          )}
        </Box>
        <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>{title}</Typography>
      </DialogTitle>
      <DialogContent sx={{ py: 1 }}>
        <DialogContentText sx={{ textAlign: 'center', color: 'text.secondary', fontSize: '0.875rem' }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 1.5, pb: 3, px: 3 }}>
        <Button onClick={onCancel} variant="outlined" sx={{ minWidth: 110 }}>
          {cancelLabel}
        </Button>
        <Button variant="contained" color={confirmColor} onClick={onConfirm} autoFocus sx={{ minWidth: 110 }}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

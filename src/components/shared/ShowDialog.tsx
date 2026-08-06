import React from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, IconButton, alpha, type Breakpoint, Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EditIcon from '@mui/icons-material/Edit';

export interface ShowField {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
  type?: 'text' | 'date' | 'chip' | 'avatar' | 'image' | 'section';
  color?: string;
  hidden?: boolean;
}

interface ShowDialogProps {
  open: boolean;
  onClose: () => void;
  onEdit?: () => void;
  title: string;
  fields: ShowField[];
  maxWidth?: Breakpoint;
  headerExtra?: React.ReactNode;
}

export default function ShowDialog({
  open,
  onClose,
  onEdit,
  title,
  fields,
  maxWidth = 'sm',
  headerExtra,
}: ShowDialogProps) {
  const visibleFields = fields.filter((f) => !f.hidden);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: 3, p: 1 } } }}
    >
      <DialogTitle sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pb: 1, pt: 2, px: 3,
      }}>
        <Typography component="span" variant="h5" sx={{ letterSpacing: '-0.03em', fontWeight: 800 }}>
          {title}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {headerExtra}
          {onEdit && (
            <IconButton
              size="small" onClick={() => { onClose(); onEdit(); }}
              aria-label="Editar"
              sx={{ bgcolor: (theme: any) => alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton
            size="small" onClick={onClose} aria-label="Cerrar"
            sx={{ bgcolor: (theme: any) => alpha(theme.palette.divider, 0.05) }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, py: 2 }}>
        <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visibleFields.map((field, idx) => {
            if (field.type === 'section') {
              return (
                <Box key={idx} sx={{ mt: 1 }}>
                  <Typography variant="overline" sx={{ fontWeight: 700, color: 'text.secondary', letterSpacing: 1 }}>
                    {field.label}
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>{field.value}</Box>
                </Box>
              );
            }
            return (
              <Box
                key={idx}
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 0.5,
                  py: 1,
                  borderBottom: (theme: any) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: 'text.secondary',
                    minWidth: { sm: 140 },
                    flexShrink: 0,
                  }}
                >
                  {field.label}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  {field.type === 'image' ? (
                    <Avatar src={field.value as string} variant="rounded" sx={{ width: 120, height: 120 }} />
                  ) : field.type === 'date' ? (
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', wordBreak: 'break-word' }}>
                      {field.value ? new Date(field.value as any).toLocaleDateString() : <Typography component="span" variant="body2" color="text.disabled">—</Typography>}
                    </Typography>
                  ) : field.type === 'chip' ? (
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {field.value}
                    </Box>
                  ) : field.type === 'avatar' ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      {field.value}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary', wordBreak: 'break-word' }}>
                      {field.value || <Typography component="span" variant="body2" color="text.disabled">—</Typography>}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button onClick={onClose} variant="text" sx={{ fontWeight: 700, color: 'text.secondary' }}>
          Cerrar
        </Button>
        {onEdit && (
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={() => { onClose(); onEdit(); }}
            sx={{ fontWeight: 700 }}
          >
            Editar
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

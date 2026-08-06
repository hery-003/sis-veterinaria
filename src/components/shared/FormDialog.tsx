import React, { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, CircularProgress, Box, Typography, IconButton, alpha,
  Grow, LinearProgress,
  type Breakpoint,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmDialog from './ConfirmDialog';
import { autoFormat } from '../../utils/validation';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (form: Record<string, any>, setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>) => Promise<void> | void;
  title: string;
  children: ReactNode | ((props: {
    form: Record<string, any>;
    setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>;
    handleChange: (field: string) => (event: any) => void;
    errors: Record<string, string>;
    setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  }) => ReactNode);
  saving?: boolean;
  initialValues?: Record<string, any>;
  validate?: (form: Record<string, any>) => Record<string, string>;
  confirmDirty?: boolean;
  maxWidth?: Breakpoint;
  submitLabel?: string;
}

export default function FormDialog({
  open,
  onClose,
  onSave,
  title,
  children,
  saving = false,
  initialValues = {},
  validate = () => ({}),
  confirmDirty = true,
  maxWidth = 'sm',
  submitLabel = 'Guardar',
}: FormDialogProps) {
  const [form, setForm] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initialRef = useRef(initialValues);

  useEffect(() => {
    if (open) {
      setForm(initialValues);
      setErrors({});
      initialRef.current = initialValues;
    }
  }, [open, initialValues]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialRef.current);

  const handleChange = (field: string) => (event: any) => {
    const value = event?.target?.value ?? event;
    const formatted = autoFormat(value, field);
    setForm((prev) => ({ ...prev, [field]: formatted }));
    if (errors[field]) {
      setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
    }
  };

  const handleSave = async () => {
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    await onSave(form, setForm);
  };

  const handleClose = () => {
    if (confirmDirty && isDirty) {
      setConfirmOpen(true);
    } else {
      onClose();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth={maxWidth}
        fullWidth
        slots={{ transition: Grow }}
        slotProps={{
          paper: {
            sx: { borderRadius: 3, p: 1 }
          }
        }}
      >
        <DialogTitle sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1, pt: 2, px: 3
        }}>
          <Typography variant="h5" sx={{ letterSpacing: '-0.03em', fontWeight: 800 }}>
            {title}
          </Typography>
          <IconButton size="small" onClick={handleClose} aria-label="Cerrar" sx={{ bgcolor: (theme: any) => alpha(theme.palette.divider, 0.05) }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 2, position: 'relative', pt: saving ? 3 : 2 }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && e.target instanceof HTMLElement && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.closest('.MuiAutocomplete-popper, [role="listbox"], [role="option"]')) { e.preventDefault(); handleSave(); } }}>
          {saving && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0, borderRadius: 3 }} />}
          <Box sx={{ mt: 1 }}>
            {typeof children === 'function'
              ? children({ form, setForm, handleChange, errors, setErrors })
              : children}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1, gap: 1.5 }}>
          <Button
            onClick={handleClose}
            disabled={saving}
            variant="text"
            sx={{ fontWeight: 700, color: 'text.secondary' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              minWidth: 120,
              fontWeight: 700,
            }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : submitLabel}
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        title="Cambios sin guardar"
        message="¿Estás seguro de que deseas salir? Los cambios realizados se perderán."
        onConfirm={() => { setConfirmOpen(false); onClose(); }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

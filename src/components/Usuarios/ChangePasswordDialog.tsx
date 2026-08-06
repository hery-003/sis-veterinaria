import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, CircularProgress, Box, Typography, IconButton,
  InputAdornment, LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useNotification } from '../shared/NotificationContext';
import { useAuth } from '../../AuthContext';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
  selectedUserId?: number | null;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function ChangePasswordDialog({ open, onClose, selectedUserId }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const notif = useNotification();
  const auth = useAuth();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getPasswordStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strength = getPasswordStrength(newPassword);
  const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte', 'Muy fuerte', 'Excelente'];
  const strengthColors = ['error', 'error', 'warning', 'warning', 'info', 'success', 'success'] as const;

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let pwd = '';
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    for (let i = 0; i < 16; i++) pwd += chars[array[i] % chars.length];
    if (!/[A-Z]/.test(pwd)) pwd = 'A' + pwd.slice(1);
    if (!/[a-z]/.test(pwd)) pwd = pwd.slice(0, 1) + 'a' + pwd.slice(2);
    if (!/[0-9]/.test(pwd)) pwd = pwd.slice(0, 2) + '1' + pwd.slice(3);
    if (!/[^A-Za-z0-9]/.test(pwd)) pwd = pwd.slice(0, 3) + '!' + pwd.slice(4);
    return pwd;
  };

  const handleSave = async () => {
    const errs: FormErrors = {};
    const isSelf = auth?.user?.id === selectedUserId;
    if (isSelf && !currentPassword) errs.currentPassword = 'Requerida';
    if (!newPassword || newPassword.length < 6) errs.newPassword = 'Mínimo 6 caracteres';
    if (newPassword !== confirmPassword) errs.confirmPassword = 'No coinciden';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (!selectedUserId) return;

    setSaving(true);
    try {
      await window.api.changePassword({ id: selectedUserId, currentPassword, newPassword });
      notif?.notify('Contraseña cambiada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err: any) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      notif?.notify(err.message || String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LockResetIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>Cambiar Contraseña</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ borderRadius: 2, color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <TextField label="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} error={!!errors.currentPassword} helperText={errors.currentPassword} fullWidth required={auth?.user?.id === selectedUserId} aria-label="Contraseña actual" type={showCurrent ? 'text' : 'password'} slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end" size="small">{showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) } }} />
          <Box>
            <TextField label="Nueva contraseña" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={!!errors.newPassword} helperText={errors.newPassword} fullWidth aria-label="Nueva contraseña" type={showNew ? 'text' : 'password'} slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowNew(!showNew)} edge="end" size="small">{showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) } }} />
            {newPassword && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress variant="determinate" value={(strength / 6) * 100} color={strengthColors[strength]} sx={{ height: 6, borderRadius: 3 }} />
                <Typography variant="caption" color={strengthColors[strength] + '.main'} sx={{ mt: 0.5, display: 'block' }}>
                  Fortaleza: {strengthLabels[strength]}
                </Typography>
              </Box>
            )}
            <Button size="small" variant="outlined" sx={{ mt: 1 }} onClick={() => { const pwd = generatePassword(); setNewPassword(pwd); setConfirmPassword(pwd); }}>
              Generar contraseña segura
            </Button>
          </Box>
          <TextField label="Confirmar contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} error={!!errors.confirmPassword} helperText={errors.confirmPassword} fullWidth aria-label="Confirmar contraseña" type={showConfirm ? 'text' : 'password'} slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small">{showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) } }} />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} variant="outlined">Cancelar</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Cambiar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

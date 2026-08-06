import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Alert, CircularProgress, InputAdornment, IconButton, LinearProgress } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../../AuthContext';
import { useNotification } from './NotificationContext';

interface ForceChangePasswordProps {
  open: boolean;
  onComplete: () => void;
}

export default function ForceChangePassword({ open, onComplete }: ForceChangePasswordProps) {
  const auth = useAuth();
  const notif = useNotification();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!auth?.user) return;
    setSaving(true);
    try {
      await window.api.changePassword({
        id: auth.user.id,
        currentPassword,
        newPassword,
      });
      notif?.notify('Contraseña cambiada exitosamente');
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'warning.main', color: '#fff' }}>
          <LockResetIcon sx={{ fontSize: 28 }} />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>Cambio de contraseña requerido</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Por seguridad, debes cambiar tu contraseña antes de continuar.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>}
          <TextField label="Contraseña actual" fullWidth value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} aria-label="Contraseña actual" type={showCurrent ? 'text' : 'password'} slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowCurrent(!showCurrent)} edge="end" size="small">{showCurrent ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) } }} />
          <Box>
            <TextField label="Nueva contraseña" fullWidth value={newPassword} onChange={(e) => setNewPassword(e.target.value)} helperText="Mínimo 6 caracteres" aria-label="Nueva contraseña" type={showNew ? 'text' : 'password'} slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowNew(!showNew)} edge="end" size="small">{showNew ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) } }} />
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
          <TextField label="Confirmar contraseña" fullWidth value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} aria-label="Confirmar contraseña" type={showConfirm ? 'text' : 'password'} slotProps={{ input: { endAdornment: (<InputAdornment position="end"><IconButton onClick={() => setShowConfirm(!showConfirm)} edge="end" size="small">{showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment>) } }} />
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3, flexDirection: 'column', gap: 1 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ minWidth: 150 }} fullWidth>
          {saving ? <CircularProgress size={20} /> : 'Cambiar contraseña'}
        </Button>
        <Button variant="text" color="error" onClick={() => auth?.logout()} disabled={saving} size="small">
          Cerrar sesión
        </Button>
      </DialogActions>
    </Dialog>
  );
}

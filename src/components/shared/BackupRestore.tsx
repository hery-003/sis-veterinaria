import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, CircularProgress, Alert,
} from '@mui/material';
import BackupIcon from '@mui/icons-material/Backup';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningIcon from '@mui/icons-material/Warning';
import { useNotification } from './NotificationContext';
import ConfirmDialog from './ConfirmDialog';

export default function BackupRestore({ open, onClose }: {
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ severity: 'success' | 'error'; message: string } | null>(null);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const notif = useNotification();
  const notify = notif?.notify ?? (() => {});

  const handleExport = async () => {
    setLoading(true);
    setResult(null);
    try {
      const filePath = await window.api.saveFile('backup_' + new Date().toISOString().split('T')[0] + '.sql');
      if (!filePath) { setLoading(false); return; }
      await window.api.exportBackup(filePath);
      setResult({ severity: 'success', message: `Backup guardado en: ${filePath}` });
      notify('Backup exportado correctamente');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setResult({ severity: 'error', message: errMsg });
      notify(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleImportSelect = async () => {
    const filePath = await window.api.selectFile(['sql']);
    if (filePath) setPendingImport(filePath);
  };

  const handleImportConfirm = async () => {
    if (!pendingImport) return;
    setLoading(true);
    setResult(null);
    try {
      await window.api.importBackup(pendingImport);
      setResult({ severity: 'success', message: 'Base de datos restaurada correctamente' });
      notify('Base de datos restaurada');
      setPendingImport(null);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setResult({ severity: 'error', message: errMsg });
      notify(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Backup y Restauración</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Exporte una copia de seguridad de toda la base de datos o restaure desde una copia existente.
            </Typography>
            {result && (
              <Alert severity={result.severity} onClose={() => setResult(null)}>
                {result.message}
              </Alert>
            )}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button variant="contained" startIcon={<BackupIcon />} onClick={handleExport} disabled={loading} fullWidth sx={{ py: 2 }}>
                {loading ? <CircularProgress size={24} /> : 'Exportar'}
              </Button>
              <Button variant="outlined" startIcon={<RestoreIcon />} onClick={handleImportSelect} disabled={loading} fullWidth sx={{ py: 2 }} color="warning">
                Restaurar
              </Button>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={!!pendingImport}
        title="Confirmar Restauración"
        message={`⚠️ ADVERTENCIA: Esto reemplazará TODOS los datos actuales. ¿Está seguro de restaurar desde "${pendingImport?.split(/[/\\]/).pop()}"?`}
        confirmLabel="Restaurar"
        confirmColor="warning"
        onConfirm={handleImportConfirm}
        onCancel={() => setPendingImport(null)}
      />
    </>
  );
}

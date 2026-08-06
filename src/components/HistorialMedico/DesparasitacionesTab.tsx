import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Button, TextField, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Chip, alpha, useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useNotification } from '../shared/NotificationContext';
import ConfirmDialog from '../shared/ConfirmDialog';
import FormDialog from '../shared/FormDialog';
import SkeletonTable from '../shared/SkeletonTable';
import EmptyState from '../shared/EmptyState';
import { toISODate } from '../../utils/date';

const emptyForm = { producto: '', fecha: toISODate(), proxima_dosis: '', dosis: '', notas: '' };

export default function DesparasitacionesTab({ mascotaId }: { mascotaId: number }) {
  const theme = useTheme();
  const notifCtx = useNotification();
  const notify = notifCtx?.notify ?? (() => {});
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getDesparasitaciones(mascotaId);
      setItems(data || []);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [mascotaId, notify]);

  useEffect(() => { load(); }, [load]);

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.producto?.trim()) errs.producto = 'El producto es obligatorio';
    if (!f.fecha) errs.fecha = 'La fecha es obligatoria';
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...f, mascota_id: mascotaId };
      if (editing) {
        await window.api.updateDesparasitacion({ id: editing, ...payload });
        notify('Desparasitación actualizada correctamente');
      } else {
        await window.api.createDesparasitacion(payload);
        notify('Desparasitación registrada correctamente');
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setErrors({});
      load();
    } catch (err: any) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (v: any) => {
    setEditing(v.id);
    setForm({
      producto: v.producto,
      fecha: toISODate(new Date(v.fecha)),
      proxima_dosis: v.proxima_dosis ? toISODate(new Date(v.proxima_dosis)) : '',
      dosis: v.dosis || '',
      notas: v.notas || '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deleteDesparasitacion(deleteTarget.id);
      notify('Desparasitación eliminada correctamente');
      setDeleteTarget(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const FormContent = ({ form: f, handleChange, errors: errs }: { form: Record<string, any>; handleChange: any; errors: Record<string, string> }) => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <TextField fullWidth label="Producto" value={f.producto || ''} onChange={handleChange('producto')} placeholder="Ej. Drontal Plus, Bravecto, Stronghold" error={!!errs.producto} helperText={errs.producto} required autoFocus={!editing} />
      <TextField fullWidth label="Fecha de Aplicación" type="date" value={f.fecha || ''} onChange={handleChange('fecha')} error={!!errs.fecha} helperText={errs.fecha} required slotProps={{ inputLabel: { shrink: true } }} />
      <TextField fullWidth label="Fecha Próxima Dosis" type="date" value={f.proxima_dosis || ''} onChange={handleChange('proxima_dosis')} slotProps={{ inputLabel: { shrink: true } }} helperText="Se usará para recordatorios" />
      <TextField fullWidth label="Dosis" value={f.dosis || ''} onChange={handleChange('dosis')} placeholder="Ej. 1 comprimido" />
      <TextField fullWidth label="Notas" multiline rows={2} value={f.notas || ''} onChange={handleChange('notas')} />
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setForm(emptyForm); setErrors({}); setOpen(true); }} sx={{ px: 3, fontWeight: 700 }}>
          Registrar Desparasitación
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Producto</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Próx. Dosis</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Dosis</TableCell>
              <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Notas</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTable rows={4} cols={6} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 8 }}>
                  <EmptyState
                    icon={<BugReportIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
                    title="Sin desparasitaciones"
                    search="Este paciente no tiene desparasitaciones registradas."
                    action={<Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>Registrar primera desparasitación</Button>}
                  />
                </TableCell>
              </TableRow>
            ) : items.map((v) => {
              const vencida = v.proxima_dosis && new Date(v.proxima_dosis) < new Date();
              return (
                <TableRow key={v.id} hover sx={{ '& td': { py: 2.5 } }}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>{v.producto}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</Typography>
                  </TableCell>
                  <TableCell>
                    {v.proxima_dosis ? (
                      <Chip
                        label={new Date(v.proxima_dosis).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          color: vencida ? 'error.main' : 'success.main',
                          bgcolor: vencida ? alpha(theme.palette.error.main, 0.08) : alpha(theme.palette.success.main, 0.08),
                          borderRadius: 1.5,
                        }}
                      />
                    ) : '-'}
                  </TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{v.dosis || '-'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary" sx={{ maxWidth: 250 }}>{v.notas || '-'}</Typography></TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleEdit(v)} aria-label="Editar" sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(v)} aria-label="Eliminar" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <FormDialog
        open={open}
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); }}
        onSave={handleSave}
        title={editing ? 'Actualizar Desparasitación' : 'Registrar Desparasitación'}
        saving={saving}
        initialValues={form}
        validate={validate}
        submitLabel={editing ? 'Actualizar' : 'Registrar'}
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Eliminar Desparasitación"
        message={`¿Estás seguro de que deseas eliminar "${deleteTarget?.producto}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}

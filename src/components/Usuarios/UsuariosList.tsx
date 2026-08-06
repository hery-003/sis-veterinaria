import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, MenuItem, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Tooltip, Chip, CircularProgress,
  InputAdornment, TablePagination, Alert, Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import LockResetIcon from '@mui/icons-material/LockReset';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNotification } from '../shared/NotificationContext';
import { useUndoDelete } from '../shared/useUndoDelete';
import ConfirmDialog from '../shared/ConfirmDialog';
import ShowDialog from '../shared/ShowDialog';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import FormDialog from '../shared/FormDialog';
import SkeletonTable from '../shared/SkeletonTable';
import ChangePasswordDialog from './ChangePasswordDialog';
import { useDebounce, useSort } from '../../hooks';
import { ROLES, PAGE_SIZES } from '../../constants';
import { alpha } from '@mui/material';
import PageHeader from '../shared/PageHeader';

interface Usuario {
  id: number;
  username: string;
  nombre: string;
  rol: 'admin' | 'veterinario' | 'recepcionista';
  activo: boolean;
  created_at?: string;
}

const rolConfig: Record<string, { color: 'error' | 'primary' | 'warning' }> = {
  admin: { color: 'error' },
  veterinario: { color: 'primary' },
  recepcionista: { color: 'warning' },
};

const emptyForm = { username: '', password: '', nombre: '', rol: 'veterinario' };

export default function UsuariosList() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Usuario | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [changePwdTarget, setChangePwdTarget] = useState<Usuario | null>(null);
  const notif = useNotification();
  const { confirmUndo } = useUndoDelete();
  const { orderBy, order, handleSort, sortedItems } = useSort(usuarios);
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getUsuarios({
        page: pagination.page,
        limit: pagination.limit,
        search,
        soloActivos: false,
      });
      setUsuarios(data.data);
      setPagination((p) => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, notif]);

  useEffect(() => { load(); }, [load]);

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.nombre?.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!f.username?.trim()) errs.username = 'El usuario es obligatorio';
    if (f.username?.trim().length < 3) errs.username = 'Mínimo 3 caracteres';
    if (!editing && (!f.password || f.password.length < 6)) errs.password = 'Mínimo 6 caracteres';
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editing) {
        await window.api.updateUsuario({ id: editing, nombre: f.nombre, username: f.username, rol: f.rol });
        notif?.notify('Usuario actualizado correctamente');
      } else {
        await window.api.createUsuario({ username: f.username, password: f.password, nombre: f.nombre, rol: f.rol });
        notif?.notify('Usuario creado correctamente');
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setErrors({});
      load();
    } catch (err: any) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      notif?.notify(err.message || String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (u: Usuario) => {
    setEditing(u.id);
    setForm({ username: u.username, nombre: u.nombre, rol: u.rol, password: '' });
    setErrors({});
    setOpen(true);
  };

  const handleDuplicate = (u: any) => {
    setEditing(null);
    setForm({
      nombre: u.nombre + ' (copia)', rol: u.rol,
      username: u.username + '_copia', password: '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deleteUsuario(deleteTarget.id);
      setDeleteTarget(null);
      load();
      confirmUndo({
        onUndo: async () => {
          await window.api.restoreUsuario(deleteTarget.id);
          load();
          notif?.notify('Usuario restaurado', 'success');
        },
        message: `Usuario "${deleteTarget.username}" eliminado`,
      });
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

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

  const FormContent = ({ form: f, handleChange, errors: errs }: {
    form: Record<string, any>;
    handleChange: (field: string) => (event: any) => void;
    errors: Record<string, string>;
  }) => (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField fullWidth label="Nombre Completo" value={f.nombre || ''} onChange={handleChange('nombre')} error={!!errs.nombre} helperText={errs.nombre} required autoComplete="name" autoFocus={!editing} aria-label="Nombre completo del usuario" slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth select label="Rol en el Sistema" value={f.rol || 'veterinario'} onChange={handleChange('rol')} aria-label="Rol del usuario en el sistema">
          {ROLES.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: editing ? 12 : 6 }}>
        <TextField fullWidth label="Nombre de Usuario" value={f.username || ''} onChange={handleChange('username')} error={!!errs.username} helperText={errs.username} required autoComplete="username" aria-label="Nombre de usuario para acceso" slotProps={{ htmlInput: { maxLength: 50 } }} />
      </Grid>
      {!editing && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label="Contraseña Inicial" type="password" value={f.password || ''} onChange={handleChange('password')} error={!!errs.password} helperText={errs.password} required autoComplete="new-password" aria-label="Contraseña inicial del usuario" />
          {f.password && (
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                {[1,2,3,4,5,6].map((i) => (
                  <Box key={i} sx={{ flex: 1, height: 4, borderRadius: 2, bgcolor: getPasswordStrength(f.password) >= i
                    ? (getPasswordStrength(f.password) <= 2 ? 'error.main' : getPasswordStrength(f.password) <= 4 ? 'warning.main' : 'success.main')
                    : 'grey.300' }} />
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {getPasswordStrength(f.password) <= 2 ? 'Débil' : getPasswordStrength(f.password) <= 4 ? 'Media' : 'Fuerte'}
              </Typography>
            </Box>
          )}
        </Grid>
      )}
      {editing && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
            Para cambiar la contraseña, use la opción "Restablecer Contraseña" en la tabla.
          </Alert>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box>
      <PageHeader
        icon={<PersonIcon />}
        title="Usuarios"
        subtitle="Gestión de accesos y roles"
        gradient="error"
        badge={
          <Chip
            label={`${pagination.total} usuario${pagination.total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.error.main, 0.12), color: 'error.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <TextField
              size="small"
              placeholder="Buscar usuario..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ borderRadius: 3, width: { xs: '100%', sm: 260 }, bgcolor: (t: any) => alpha(t.palette.divider, 0.02), '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment>,
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditing(null); setForm(emptyForm); setErrors({}); setOpen(true); }}
              sx={{ px: 3, fontWeight: 700 }}
            >
              Nuevo Usuario
            </Button>
          </>
        }
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t: any) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'avatar-col', label: '' },
              { key: 'username', label: 'Usuario' },
              { key: 'nombre', label: 'Nombre Completo' },
              { key: 'rol', label: 'Rol' },
              { key: 'activo', label: 'Estado' },
              { key: 'created_at', label: 'Fecha Alta' },
              { key: 'acciones-col', label: 'Acciones' },
            ]}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
          />
          <TableBody>
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 10 }}>
                  <EmptyState
                    icon={<PersonIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
                    title="Sin usuarios registrados"
                    search={search ? `No hay resultados para "${search}"` : "Comienza agregando un nuevo usuario al sistema"}
                    action={!search ? (
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                        Registrar primer usuario
                      </Button>
                    ) : undefined}
                  />
                </TableCell>
              </TableRow>
            ) : sortedItems.map((u) => {
              const rol = rolConfig[u.rol] || rolConfig.veterinario;
              const rolLabel = ROLES.find((r) => r.value === u.rol)?.label || u.rol;
              return (
                <TableRow key={u.id} hover sx={{ transition: 'background-color 0.2s' }}>
                  <TableCell sx={{ pl: 3 }}>
                    <Avatar
                      sx={{
                        width: 44, height: 44,
                        bgcolor: (t: any) => alpha(t.palette[rol.color].main, 0.1),
                        color: (t: any) => t.palette[rol.color].main,
                        fontWeight: 800, fontSize: '0.9rem',
                        border: (t: any) => `2px solid ${alpha(t.palette[rol.color].main, 0.2)}`
                      }}
                    >
                      {u.nombre?.[0]?.toUpperCase()}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>{u.username}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{u.nombre}</TableCell>
                  <TableCell>
                    <Chip
                      label={rolLabel}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: (t: any) => alpha(t.palette[rol.color].main, 0.12),
                        color: (t: any) => t.palette[rol.color].main,
                        borderRadius: 1.5,
                        minWidth: 90
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.activo ? 'Activo' : 'Inactivo'}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontWeight: 700,
                        borderColor: u.activo ? 'success.main' : 'divider',
                        color: u.activo ? 'success.main' : 'text.disabled',
                        borderRadius: 1.5
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ pr: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="Ver Detalle">
                        <IconButton size="small" onClick={() => { setShowTarget(u); setShowOpen(true); }} aria-label="Ver Detalle" sx={{ color: 'info.main', bgcolor: (t: any) => alpha(t.palette.info.main, 0.05) }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicar">
                        <IconButton size="small" onClick={() => handleDuplicate(u)} aria-label="Duplicar" sx={{ color: 'success.main', bgcolor: (t: any) => alpha(t.palette.success.main, 0.05) }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Restablecer Contraseña">
                        <IconButton size="small" onClick={() => { setChangePwdTarget(u); setChangePwdOpen(true); }} aria-label="Restablecer Contraseña" sx={{ color: 'warning.main', bgcolor: (t: any) => alpha(t.palette.warning.main, 0.05) }}>
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar Datos">
                        <IconButton size="small" onClick={() => handleEdit(u)} aria-label="Editar Datos" sx={{ color: 'primary.main', bgcolor: (t: any) => alpha(t.palette.primary.main, 0.05) }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar Usuario">
                        <IconButton size="small" onClick={() => setDeleteTarget(u)} aria-label="Eliminar Usuario" sx={{ color: 'error.main', bgcolor: (t: any) => alpha(t.palette.error.main, 0.05) }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <TablePagination
          component={Paper}
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, p) => setPagination((prev) => ({ ...prev, page: p + 1 }))}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }))}
          rowsPerPageOptions={PAGE_SIZES}
          labelRowsPerPage="Usuarios por página"
          sx={{ borderRadius: 3, border: (t: any) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}
        />
      </Box>

      <FormDialog
        open={open}
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); }}
        onSave={handleSave}
        title={editing ? 'Actualizar Usuario' : 'Nuevo Usuario del Sistema'}
        submitLabel={editing ? 'Actualizar Usuario' : 'Crear Usuario'}
        saving={saving}
        initialValues={form}
        validate={validate}
        maxWidth="md"
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Baja de Usuario"
        message={`¿Estás seguro de que deseas eliminar al usuario "${deleteTarget?.nombre}" (${deleteTarget?.username})? Esta acción le impedirá el acceso al sistema.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ChangePasswordDialog open={changePwdOpen} onClose={() => { setChangePwdOpen(false); setChangePwdTarget(null); }} selectedUserId={changePwdTarget?.id ?? null} />
      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        onEdit={() => { if (showTarget) handleEdit(showTarget); }}
        title="Detalle del Usuario"
        fields={[
          { label: 'Username', value: showTarget?.username },
          { label: 'Nombre', value: showTarget?.nombre },
          { label: 'Rol', value: ROLES.find((r) => r.value === showTarget?.rol)?.label ?? showTarget?.rol },
          { label: 'Estado', value: showTarget?.activo ? 'Activo' : 'Inactivo' },
          { label: 'Fecha Alta', value: showTarget?.created_at },
        ]}
      />
    </Box>
  );
}

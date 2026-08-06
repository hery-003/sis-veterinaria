import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Tooltip, Chip,
  InputAdornment, TablePagination, alpha, useTheme, Grid, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PetsIcon from '@mui/icons-material/Pets';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import { useNotification } from '../shared/NotificationContext';
import { useUndoDelete } from '../shared/useUndoDelete';
import ConfirmDialog from '../shared/ConfirmDialog';
import ShowDialog from '../shared/ShowDialog';
import SkeletonTable from '../shared/SkeletonTable';
import EmptyState from '../shared/EmptyState';
import FormDialog from '../shared/FormDialog';
import { useDebounce, useSort, useFilterPersistence, useKeyboardShortcuts } from '../../hooks';
import { PAGE_SIZES } from '../../constants';
import SortableTableHead from '../shared/SortableTableHead';
import PageHeader from '../shared/PageHeader';

const emptyForm = { ci: '', nombre: '', telefono: '', direccion: '', email: '' };

export default function PropietariosList() {
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const filterPersist = useFilterPersistence('propietarios');
  const savedFilters = filterPersist.load();
  const [searchInput, setSearchInput] = useState(savedFilters.search || '');
  const search = useDebounce(searchInput, 400);
  useEffect(() => { setPagination((prev) => ({ ...prev, page: 1 })); }, [search]);
  useEffect(() => { filterPersist.save({ search: searchInput }); }, [searchInput, filterPersist]);
  const notif = useNotification();
  const { confirmUndo } = useUndoDelete();
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { orderBy, order, handleSort, sortedItems } = useSort(propietarios);
  const openNewForm = useCallback(() => { setEditing(null); setForm(emptyForm); setErrors({}); setOpen(true); }, []);

  useKeyboardShortcuts(useMemo(() => ({
    'ctrl+n': openNewForm,
    'escape': () => { if (open) { setOpen(false); setEditing(null); } },
  }), [openNewForm, open]));
  const [ciWarning, setCiWarning] = useState('');
  const ciTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  const load = useCallback(async (params: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const data = await window.api.getPropietarios({
        page: pagination.page,
        limit: pagination.limit,
        search,
        soloActivos: true,
        ...params,
      });
      setPropietarios(data.data);
      setPagination((p) => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, notif]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (ciTimerRef.current) clearTimeout(ciTimerRef.current);
    const ciValue = form.ci || '';
    if (!ciValue.trim()) { setCiWarning(''); return; }
    ciTimerRef.current = setTimeout(async () => {
      try {
        const result = await window.api.checkCiDuplicate(ciValue, editing || undefined);
        if (result.exists) setCiWarning(`Ya existe: ${result.nombre}`);
        else setCiWarning('');
      } catch { setCiWarning(''); }
    }, 500);
    return () => { if (ciTimerRef.current) clearTimeout(ciTimerRef.current); };
  }, [form.ci, editing]);

  const handlePageChange = (_: any, p: number) => setPagination((prev) => ({ ...prev, page: p + 1 }));
  const handleRowsChange = (e: any) => {
    const limit = parseInt(e.target.value, 10);
    setPagination((prev) => ({ ...prev, limit, page: 1 }));
  };

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.nombre?.trim()) errs.nombre = 'El nombre es obligatorio';
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errs.email = 'Email inválido';
    if (f.ci && !/^[a-zA-Z0-9-]+$/.test(f.ci)) errs.ci = 'Cédula inválida';
    if (f.telefono && !/^[\d\s\-+()]{7,}$/.test(f.telefono)) errs.telefono = 'Teléfono inválido (mínimo 7 dígitos)';
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editing) {
        await window.api.updatePropietario({ id: editing, ...f });
        notif?.notify('Propietario actualizado correctamente');
      } else {
        await window.api.createPropietario(f);
        notif?.notify('Propietario creado correctamente');
      }
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setErrors({});
      load();
    } catch (err) {
      if (err && typeof err === 'object' && 'fieldErrors' in err) setErrors((err as any).fieldErrors);
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (p: any) => {
    setEditing(p.id);
    setForm({ ci: p.ci || '', nombre: p.nombre, telefono: p.telefono || '', direccion: p.direccion || '', email: p.email || '' });
    setErrors({});
    setCiWarning('');
    setOpen(true);
  };

  const handleDuplicate = (p: any) => {
    setEditing(null);
    setForm({ ci: '', nombre: p.nombre + ' (copia)', telefono: p.telefono || '', direccion: p.direccion || '', email: '' });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deletePropietario(deleteTarget.id);
      setDeleteTarget(null);
      load();
      confirmUndo({
        onUndo: async () => {
          await window.api.restorePropietario(deleteTarget.id);
          load();
          notif?.notify('Propietario restaurado', 'success');
        },
        message: `"${deleteTarget.nombre}" eliminado`,
      });
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const FormContent = ({ form: f, handleChange, errors: errs }: any) => (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField
          fullWidth
          label="CI / Documento"
          value={f.ci || ''}
          onChange={handleChange('ci')}
          error={!!errs.ci}
          helperText={
            errs.ci ? errs.ci : ciWarning ? (
              <Typography component="span" variant="caption" sx={{ color: 'warning.main' }}>
                {ciWarning}
              </Typography>
            ) : 'Formato: 1234567'
          }
          placeholder="Ej: 1234567"
          slotProps={{ htmlInput: { maxLength: 20, inputMode: 'text' } }}
          autoComplete="off"
          aria-label="Cédula o documento de identidad"
          autoFocus={!editing}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField fullWidth label="Nombre Completo" value={f.nombre || ''} onChange={handleChange('nombre')} error={!!errs.nombre} helperText={errs.nombre} required autoComplete="name" aria-label="Nombre Completo" slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Teléfono de Contacto" value={f.telefono || ''} onChange={handleChange('telefono')} placeholder="Ej: 0981 123 456" error={!!errs.telefono} helperText={errs.telefono} inputMode="tel" autoComplete="tel" aria-label="Teléfono de Contacto" slotProps={{ htmlInput: { maxLength: 20 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Correo Electrónico" type="email" value={f.email || ''} onChange={handleChange('email')} error={!!errs.email} helperText={errs.email || (f.email ? '' : 'Formato: ejemplo@correo.com')} placeholder="ejemplo@correo.com" autoComplete="email" aria-label="Correo Electrónico" slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Dirección Particular" multiline rows={3} value={f.direccion || ''} onChange={handleChange('direccion')} placeholder="Calle, Nro de casa, Ciudad..." autoComplete="street-address" aria-label="Dirección Particular" slotProps={{ htmlInput: { maxLength: 255 } }} />
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <PageHeader
        icon={<GroupIcon />}
        title="Clientes"
        subtitle="Base de datos de propietarios"
        badge={
          <Chip
            label={`${pagination.total} registro${pagination.total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <TextField
              size="small"
              placeholder="Buscar por nombre o CI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ borderRadius: 3, width: { xs: '100%', sm: 280 }, bgcolor: (t) => alpha(t.palette.divider, 0.02), '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment>,
                }
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setEditing(null); setForm(emptyForm); setErrors({}); setCiWarning(''); setOpen(true); }}
              sx={{ px: 3, fontWeight: 700 }}
              title="Ctrl+N"
            >
              Nuevo Cliente
            </Button>
          </>
        }
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'avatar-col', label: '' },
              { key: 'ci', label: 'Documento' },
              { key: 'nombre', label: 'Propietario' },
              { key: 'telefono', label: 'Teléfono' },
              { key: 'email', label: 'Email' },
              { key: 'direccion', label: 'Dirección' },
              { key: 'acciones-col', label: 'Acciones', align: 'center' },
            ]}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
          />
          <TableBody>
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : propietarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 10 }}>
                  <EmptyState
                    icon={<GroupIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
                    title="Sin clientes registrados"
                    search={search ? `No hay resultados para "${search}"` : "Comienza registrando un nuevo propietario"}
                    action={!search && (
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                        Registrar primer cliente
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : sortedItems.map((p) => (
              <TableRow key={p.id} hover sx={{ transition: 'background-color 0.2s' }}>
                <TableCell sx={{ pl: 3 }}>
                  <Avatar 
                    sx={{ 
                      width: 44, height: 44, 
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.1), 
                      color: 'primary.main',
                      fontWeight: 800, fontSize: '0.9rem',
                      border: (t) => `2px solid ${alpha(t.palette.primary.main, 0.2)}`
                    }}
                  >
                    {p.nombre?.[0]?.toUpperCase()}
                  </Avatar>
                </TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{p.ci || '-'}</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{p.telefono || '-'}</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 500 }}>{p.email || '-'}</TableCell>
                <TableCell sx={{ maxWidth: 200 }}>
                  <Typography variant="body2" noWrap color="text.secondary" sx={{ fontWeight: 500 }}>{p.direccion || '-'}</Typography>
                </TableCell>
                <TableCell align="center" sx={{ pr: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                    <Tooltip title="Ver Detalle">
                      <IconButton size="small" onClick={() => { setShowTarget(p); setShowOpen(true); }} aria-label="Ver Detalle" sx={{ color: 'info.main', bgcolor: (t) => alpha(t.palette.info.main, 0.05) }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ver Mascotas">
                      <IconButton size="small" onClick={() => navigate(`/mascotas/${p.id}`)} aria-label="Ver Mascotas" sx={{ color: 'secondary.main', bgcolor: (t) => alpha(t.palette.secondary.main, 0.05) }}>
                        <PetsIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Duplicar">
                      <IconButton size="small" onClick={() => handleDuplicate(p)} aria-label="Duplicar" sx={{ color: 'success.main', bgcolor: (t) => alpha(t.palette.success.main, 0.05) }}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Editar Perfil">
                      <IconButton size="small" onClick={() => handleEdit(p)} aria-label="Editar Perfil" sx={{ color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.05) }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Dar de Baja">
                      <IconButton size="small" onClick={() => setDeleteTarget(p)} aria-label="Dar de Baja" sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.05) }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <TablePagination
          component={Paper}
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsChange}
          rowsPerPageOptions={PAGE_SIZES}
          labelRowsPerPage="Clientes por página"
          sx={{ borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}
        />
      </Box>

      <FormDialog
        open={open}
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); setCiWarning(''); }}
        onSave={handleSave}
        title={editing ? 'Actualizar Perfil de Cliente' : 'Nuevo Registro de Cliente'}
        submitLabel={editing ? 'Actualizar Cliente' : 'Crear Cliente'}
        saving={saving}
        initialValues={form}
        validate={validate}
        maxWidth="md"
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Baja de Cliente"
        message={`¿Estás seguro de que deseas eliminar a "${deleteTarget?.nombre}"? Nota: También se ocultarán sus mascotas del sistema activo.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        onEdit={() => { if (showTarget) handleEdit(showTarget); }}
        title="Detalle del Cliente"
        fields={[
          { label: 'CI / Documento', value: showTarget?.ci },
          { label: 'Nombre', value: showTarget?.nombre },
          { label: 'Teléfono', value: showTarget?.telefono },
          { label: 'Email', value: showTarget?.email },
          { label: 'Dirección', value: showTarget?.direccion },
          { label: 'Mascotas', value: `${showTarget?.total_mascotas ?? 0} registrada(s)` },
        ]}
      />
    </Box>
  );
}

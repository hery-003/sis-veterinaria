import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, MenuItem, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Tooltip, Chip,
  InputAdornment, Avatar, Badge, TablePagination, alpha, useTheme, Grid,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import PetsIcon from '@mui/icons-material/Pets';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useNotification } from '../shared/NotificationContext';
import { useUndoDelete } from '../shared/useUndoDelete';
import ConfirmDialog from '../shared/ConfirmDialog';
import ShowDialog from '../shared/ShowDialog';
import SkeletonTable from '../shared/SkeletonTable';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import FormDialog from '../shared/FormDialog';
import { useDebounce, useSort, useFilterPersistence, useKeyboardShortcuts } from '../../hooks';
import { ESPECIES, ESPECIE_CONFIG, PAGE_SIZES, RAZAS_POR_ESPECIE } from '../../constants';
import { getPhotoDataUrl } from '../../utils/photoCache';
import PageHeader from '../shared/PageHeader';

const emptyForm = { nombre: '', especie: 'Perro', raza: '', edad_anios: '', edad_meses: '', peso: '', propietario_id: '', foto: '', fotoPreview: '' };

export default function MascotasList() {
  const { propietarioId } = useParams();
  const navigate = useNavigate();
  const [mascotas, setMascotas] = useState<any[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [propietarios, setPropietarios] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const filterPersist = useFilterPersistence('mascotas');
  const savedFilters = filterPersist.load();
  const [searchInput, setSearchInput] = useState(savedFilters.search || '');
  const search = useDebounce(searchInput, 400);
  useEffect(() => { setPagination((prev) => ({ ...prev, page: 1 })); }, [search]);
  useEffect(() => { filterPersist.save({ search: searchInput }); }, [searchInput, filterPersist]);
  const openNewForm = useCallback(() => { setEditing(null); setForm({ ...emptyForm, propietario_id: propietarioId || '' }); setErrors({}); setOpen(true); }, [propietarioId]);
  useKeyboardShortcuts(useMemo(() => ({
    'ctrl+n': openNewForm,
    'escape': () => { if (open) { setOpen(false); setEditing(null); } },
  }), [openNewForm, open]));
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const notif = useNotification();
  const { confirmUndo } = useUndoDelete();
  const theme = useTheme();
  const { orderBy, order, handleSort, sortedItems } = useSort(mascotas);
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  const loadPhotos = useCallback(async (items: any[]) => {
    const withPhoto = items.filter((m) => m.foto);
    const results = await Promise.all(
      withPhoto.map((m) =>
        getPhotoDataUrl(m.foto).then((url) => ({ id: m.id, url })).catch(() => null)
      )
    );
    const urls: Record<string, string> = {};
    results.forEach((r) => { if (r?.url) urls[r.id] = r.url; });
    setPhotoUrls(urls);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pagination.page, limit: pagination.limit, search, soloActivos: true };
      if (propietarioId) params.propietarioId = propietarioId;
      const [data, props] = await Promise.all([
        window.api.getMascotas(params),
        window.api.getPropietarios({ soloActivos: true }),
      ]);
      setMascotas(data.data);
      setPagination((p) => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
      setPropietarios(props.data);
      await loadPhotos(data.data);
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, propietarioId, notif, loadPhotos]);

  useEffect(() => { load(); }, [load]);

  const handlePageChange = (_: any, p: number) => setPagination((prev) => ({ ...prev, page: p + 1 }));
  const handleRowsChange = (e: any) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }));

  const handleSelectPhoto = async () => {
    try {
      const path = await window.api.selectPhoto();
      if (path) {
        const url = await window.api.getPhotoDataUrl(path);
        setForm((prev) => ({ ...prev, foto: path, fotoPreview: url || '' }));
      }
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.nombre?.trim()) errs.nombre = 'El nombre es obligatorio';
    if (!f.propietario_id && !propietarioId) errs.propietario_id = 'Debe seleccionar un propietario';
    if (f.edad_anios && (isNaN(f.edad_anios) || parseInt(f.edad_anios) < 0)) errs.edad_anios = 'Años inválidos';
    if (f.edad_meses && (isNaN(f.edad_meses) || parseInt(f.edad_meses) < 0 || parseInt(f.edad_meses) > 11)) errs.edad_meses = 'Meses (0-11)';
    if (f.peso && (isNaN(f.peso) || parseFloat(f.peso) < 0 || parseFloat(f.peso) > 500)) errs.peso = 'Peso inválido (0-500 kg)';
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = {
        nombre: f.nombre, especie: f.especie, raza: f.raza,
        edad: (f.edad_anios !== '' || f.edad_meses !== '') ? ((parseInt(f.edad_anios) || 0) * 12 + (parseInt(f.edad_meses) || 0)) : null,
        peso: f.peso ? parseFloat(f.peso) : null,
        propietario_id: f.propietario_id || propietarioId,
        foto: f.foto || null,
      };
      if (editing) {
        await window.api.updateMascota({ id: editing, ...payload });
        notif?.notify('Mascota actualizada correctamente');
      } else {
        await window.api.createMascota(payload);
        notif?.notify('Mascota creada correctamente');
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

  const handleEdit = (m: Record<string, any>) => {
    const totalMeses = m.edad || 0;
    setEditing(m.id);
    setForm({
      nombre: m.nombre, especie: m.especie, raza: m.raza || '',
      edad_anios: String(Math.floor(totalMeses / 12) || ''),
      edad_meses: String(totalMeses % 12 || ''),
      peso: String(m.peso || ''),
      propietario_id: m.propietario_id, foto: m.foto || '', fotoPreview: photoUrls[m.id] || '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDuplicate = (m: Record<string, any>) => {
    const totalMeses = m.edad || 0;
    setEditing(null);
    setForm({
      nombre: m.nombre + ' (copia)', especie: m.especie, raza: m.raza || '',
      edad_anios: '', edad_meses: '', peso: String(m.peso || ''),
      propietario_id: m.propietario_id, foto: '', fotoPreview: '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deleteMascota(deleteTarget.id);
      setDeleteTarget(null);
      load();
      confirmUndo({
        onUndo: async () => {
          await window.api.restoreMascota(deleteTarget.id);
          load();
          notif?.notify('Mascota restaurada', 'success');
        },
        message: `"${deleteTarget.nombre}" eliminada`,
      });
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const FormContent = ({ form: f, handleChange, errors: errs }: any) => (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1, p: 2, bgcolor: (t) => alpha(t.palette.divider, 0.03), borderRadius: 4 }}>
        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={
          <IconButton size="small" aria-label="Seleccionar foto" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, boxShadow: 2 }} onClick={handleSelectPhoto}>
            <PhotoCameraIcon sx={{ fontSize: 16 }} />
          </IconButton>
        }>
          <Avatar src={f.fotoPreview} sx={{ width: 90, height: 90, fontSize: 32, fontWeight: 800, bgcolor: 'primary.main', boxShadow: (t) => `0 8px 20px -4px ${alpha(t.palette.primary.main, 0.3)}` }}>
            {f.nombre?.[0]?.toUpperCase() || '?'}
          </Avatar>
        </Badge>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Foto del Paciente</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>Formatos soportados: JPG, PNG</Typography>
          <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={handleSelectPhoto}>
            {f.foto ? 'Actualizar Imagen' : 'Subir Imagen'}
          </Button>
        </Box>
      </Grid>
      
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Nombre de la Mascota" value={f.nombre || ''} onChange={handleChange('nombre')} error={!!errs.nombre} helperText={errs.nombre} required autoComplete="off" inputMode="text" aria-label="Nombre de la Mascota" autoFocus={!editing} slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth select label="Especie" value={f.especie || 'Perro'} onChange={handleChange('especie')}>
          {ESPECIES.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Raza / Variedad" value={f.raza || ''} onChange={handleChange('raza')} autoComplete="off" aria-label="Raza o Variedad" slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      {(RAZAS_POR_ESPECIE[f.especie] || []).length > 0 && !f.raza && (
        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>Sugerencias:</Typography>
            {(RAZAS_POR_ESPECIE[f.especie] || []).slice(0, 6).map((r) => (
              <Chip key={r} label={r} size="small" onClick={() => setForm((prev) => ({ ...prev, raza: r }))} sx={{ cursor: 'pointer', fontSize: '0.7rem' }} />
            ))}
          </Box>
        </Grid>
      )}
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Edad (Años)" type="number" value={f.edad_anios || ''} onChange={handleChange('edad_anios')} error={!!errs.edad_anios} helperText={errs.edad_anios} slotProps={{ htmlInput: { min: 0 } }} inputMode="numeric" aria-label="Edad en años" />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Edad (Meses)" type="number" value={f.edad_meses || ''} onChange={handleChange('edad_meses')} error={!!errs.edad_meses} helperText={errs.edad_meses} slotProps={{ htmlInput: { min: 0, max: 11 } }} inputMode="numeric" aria-label="Edad en meses" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        {(f.edad_anios || f.edad_meses) ? (
          <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Edad: {f.edad_anios ? `${f.edad_anios} año${parseInt(f.edad_anios) !== 1 ? 's' : ''}` : ''}{f.edad_anios && f.edad_meses ? ', ' : ''}{f.edad_meses ? `${f.edad_meses} mes${parseInt(f.edad_meses) !== 1 ? 'es' : ''}` : ''}
          </Typography>
        ) : null}
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Peso Actual (kg)" type="number" value={f.peso || ''} onChange={handleChange('peso')} error={!!errs.peso} helperText={errs.peso} slotProps={{ htmlInput: { min: 0, step: 0.1 } }} inputMode="numeric" aria-label="Peso en kilogramos" />
      </Grid>
      
      {!propietarioId && (
        <Grid size={{ xs: 12 }}>
          <TextField fullWidth select label="Asignar Propietario" value={f.propietario_id || ''} onChange={handleChange('propietario_id')} error={!!errs.propietario_id} helperText={errs.propietario_id} required aria-label="Seleccionar propietario">
            {propietarios.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">{p.ci || ''}</Typography>
                </Box>
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      )}
    </Grid>
  );

  return (
    <Box>
      <PageHeader
        icon={<PetsIcon />}
        title="Pacientes"
        subtitle="Gestión de mascotas registradas"
        gradient="secondary"
        badge={
          <Chip
            label={`${pagination.total} paciente${pagination.total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.secondary.main, 0.1), color: 'secondary.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            {propietarioId && (
              <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/propietarios')} sx={{ fontWeight: 700 }}>
                Volver a clientes
              </Button>
            )}
            <TextField
              size="small"
              placeholder="Buscar por nombre o raza..."
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
              onClick={openNewForm}
              sx={{ px: 3, fontWeight: 700 }}
              title="Ctrl+N"
            >
              Registrar Paciente
            </Button>
          </>
        }
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'avatar-col', label: '' },
              { key: 'nombre', label: 'Nombre' },
              { key: 'especie', label: 'Especie' },
              { key: 'raza', label: 'Raza' },
              { key: 'edad', label: 'Edad' },
              { key: 'peso', label: 'Peso' },
              ...(!propietarioId ? [{ key: 'propietario_nombre', label: 'Propietario' }] : []),
              { key: 'acciones-col', label: 'Acciones', align: 'center' },
            ]}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
          />
          <TableBody>
            {loading ? (
              <SkeletonTable rows={5} cols={propietarioId ? 7 : 8} />
            ) : mascotas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={propietarioId ? 7 : 8} sx={{ py: 10 }}>
                  <EmptyState 
                    icon={<PetsIcon sx={{ fontSize: 48, opacity: 0.2 }} />} 
                    title="No se encontraron registros"
                    search={search ? `No hay resultados para "${search}"` : "Comienza registrando un nuevo paciente"}
                    action={!search && (
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                        Agregar mi primer paciente
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : sortedItems.map((m) => {
              const espConf = (ESPECIE_CONFIG as Record<string, any>)[m.especie] || ESPECIE_CONFIG.Otro;
              const totalMeses = m.edad || 0;
              const years = Math.floor(totalMeses / 12);
              const months = totalMeses % 12;
              const edadStr = totalMeses ? `${years ? years + 'a' : ''}${years && months ? ' ' : ''}${months ? months + 'm' : ''}` : '-';
              return (
                <TableRow key={m.id} hover sx={{ transition: 'background-color 0.2s' }}>
                  <TableCell sx={{ pl: 3 }}>
                    <Avatar 
                      src={photoUrls[m.id]} 
                      sx={{ 
                        width: 48, height: 48, 
                        bgcolor: alpha(espConf.color, 0.1), 
                        color: espConf.color,
                        border: `2px solid ${alpha(espConf.color, 0.2)}`,
                        fontSize: 20, fontWeight: 800
                      }}
                    >
                      {espConf.icon}
                    </Avatar>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{m.nombre}</TableCell>
                  <TableCell>
                    <Chip 
                      icon={<Typography sx={{ fontSize: 14 }}>{espConf.icon}</Typography>} 
                      label={m.especie} 
                      size="small" 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: alpha(espConf.color, 0.1), 
                        color: espConf.color,
                        borderRadius: 2,
                        border: 'none'
                      }} 
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>{m.raza || '-'}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{edadStr}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{m.peso ? `${m.peso} kg` : '-'}</Typography>
                  </TableCell>
                  {!propietarioId && <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>{m.propietario_nombre}</TableCell>}
                  <TableCell align="center" sx={{ pr: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="Ver Detalle">
                        <IconButton size="small" onClick={() => { setShowTarget(m); setShowOpen(true); }} aria-label="Ver Detalle" sx={{ color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Historial Clínico">
                        <IconButton size="small" onClick={() => navigate(`/historial/${m.id}`)} aria-label="Historial Clínico" sx={{ color: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.secondary.main, 0.1) } }}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Duplicar">
                        <IconButton size="small" onClick={() => handleDuplicate(m)} aria-label="Duplicar" sx={{ color: 'success.main', bgcolor: alpha(theme.palette.success.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.success.main, 0.1) } }}>
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Editar Datos">
                        <IconButton size="small" onClick={() => handleEdit(m)} aria-label="Editar Datos" sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Dar de Baja">
                        <IconButton size="small" onClick={() => setDeleteTarget(m)} aria-label="Dar de Baja" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05), '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.1) } }}>
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
          onPageChange={handlePageChange}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={handleRowsChange}
          rowsPerPageOptions={PAGE_SIZES}
          labelRowsPerPage="Pacientes por página"
          sx={{ borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}
        />
      </Box>

      <FormDialog 
        open={open} 
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); }} 
        onSave={handleSave}
        title={editing ? 'Actualizar Ficha de Paciente' : 'Nuevo Registro de Paciente'} 
        submitLabel={editing ? 'Actualizar Paciente' : 'Crear Paciente'}
        saving={saving} 
        initialValues={form} 
        validate={validate}
        maxWidth="md"
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <ConfirmDialog 
        open={!!deleteTarget} 
        title="Dar de Baja Paciente" 
        message={`¿Estás seguro de que deseas dar de baja a "${deleteTarget?.nombre}"? Podrás deshacer la acción en los próximos segundos si te equivocas.`}
        onConfirm={handleDelete} 
        onCancel={() => setDeleteTarget(null)} 
      />
      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        onEdit={() => { if (showTarget) handleEdit(showTarget); }}
        title="Ficha del Paciente"
        fields={[
          ...(showTarget?.foto && photoUrls[showTarget.id] ? [{ label: 'Foto', value: photoUrls[showTarget.id], type: 'image' as const }] : []),
          { label: 'Nombre', value: showTarget?.nombre },
          { label: 'Especie', value: showTarget?.especie, type: 'chip' },
          { label: 'Raza', value: showTarget?.raza },
          { label: 'Edad', value: showTarget?.edad ? `${Math.floor(showTarget.edad / 12)}a ${showTarget.edad % 12}m` : null },
          { label: 'Peso', value: showTarget?.peso ? `${showTarget.peso} kg` : null },
          { label: 'Propietario', value: showTarget?.propietario_nombre },
        ]}
      />
    </Box>
  );
}

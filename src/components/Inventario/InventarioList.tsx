import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, TextField, MenuItem, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Tooltip, Chip,
  CircularProgress, Avatar, Badge, InputAdornment, TablePagination, useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import InventoryIcon from '@mui/icons-material/Inventory';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { generateInventarioPDF } from '../../utils/pdfGenerator';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNotification } from '../shared/NotificationContext';
import { useUndoDelete } from '../shared/useUndoDelete';
import ConfirmDialog from '../shared/ConfirmDialog';
import ShowDialog from '../shared/ShowDialog';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import SkeletonTable from '../shared/SkeletonTable';
import FormDialog from '../shared/FormDialog';
import { useDebounce, useSort } from '../../hooks';
import { TIPOS_INVENTARIO, PAGE_SIZES } from '../../constants';
import { getPhotoDataUrl } from '../../utils/photoCache';
import { toISODate } from '../../utils/date';
import { alpha } from '@mui/material';
import PageHeader from '../shared/PageHeader';

const emptyForm = { nombre: '', tipo: 'medicamento', cantidad: 0, precio: '', proveedor: '', lote: '', fecha_vencimiento: '', descripcion: '', foto: '', fotoPreview: '' };

function StockBadge({ cantidad }: { cantidad: number }) {
  const theme = useTheme();
  const color = cantidad <= 0 ? 'error' : cantidad <= 5 ? 'warning' : 'success';
  return (
    <Chip 
      label={cantidad} 
      size="small" 
      sx={{ 
        fontWeight: 800, 
        minWidth: 48,
        bgcolor: alpha((theme.palette as any)[color].main, 0.12),
        color: (theme.palette as any)[color].main,
        borderRadius: 2
      }} 
    />
  );
}

export default function InventarioList() {
  const [items, setItems] = useState<any[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [movimientoOpen, setMovimientoOpen] = useState<any>(null);
  const [availableStock, setAvailableStock] = useState(0);
  const [movForm, setMovForm] = useState({ tipo: 'entrada', cantidad: 1, motivo: '' });
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [filtroTipo, setFiltroTipo] = useState('');
  const notifCtx = useNotification();
  const notify = notifCtx?.notify ?? (() => {});
  const { confirmUndo } = useUndoDelete();
  const { orderBy, order, handleSort, sortedItems } = useSort(items);
  const theme = useTheme();
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  const loadPhotos = useCallback(async (data: any[]) => {
    const withPhoto = data.filter((m: any) => m.foto);
    const results = await Promise.all(
      withPhoto.map((m: any) =>
        getPhotoDataUrl(m.foto).then((url: string | null) => ({ id: m.id, url })).catch(() => null)
      )
    );
    const urls: Record<string, string> = {};
    results.forEach((r: any) => { if (r?.url) urls[r.id] = r.url; });
    setPhotoUrls(urls);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: pagination.page, limit: pagination.limit, search, soloActivos: true };
      if (filtroTipo) params.tipo = filtroTipo;
      const data = await window.api.getInventario(params);
      setItems(data.data);
      setPagination((p) => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
      await loadPhotos(data.data);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, filtroTipo, notify, loadPhotos]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (movimientoOpen) {
      window.api.getInventarioStock(movimientoOpen.id).then(setAvailableStock).catch(() => setAvailableStock(0));
    }
  }, [movimientoOpen]);

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
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.nombre?.trim()) errs.nombre = 'El nombre es obligatorio';
    if (f.cantidad && (isNaN(f.cantidad) || parseInt(f.cantidad) < 0)) errs.cantidad = 'Cantidad inválida';
    if (f.cantidad && (isNaN(f.cantidad) || parseInt(f.cantidad) > 99999)) errs.cantidad = 'Cantidad máxima: 99,999';
    if (f.precio && (isNaN(f.precio) || parseFloat(f.precio) < 0)) errs.precio = 'Precio inválido';
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...f, cantidad: parseInt(f.cantidad) || 0, precio: f.precio ? parseFloat(f.precio) : null, foto: f.foto || null };
      if (editing) {
        await window.api.updateInventarioItem({ id: editing, ...payload });
        notify('Producto actualizado');
      } else {
        await window.api.createInventarioItem(payload);
        notify('Producto creado');
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

  const handleEdit = (item: any) => {
    setEditing(item.id);
    setForm({
      nombre: item.nombre, tipo: item.tipo, cantidad: item.cantidad,
      precio: item.precio ? String(item.precio) : '',
      proveedor: item.proveedor || '', lote: item.lote || '',
      fecha_vencimiento: item.fecha_vencimiento || '',
      descripcion: item.descripcion || '', foto: item.foto || '', fotoPreview: photoUrls[item.id] || '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDuplicate = (item: any) => {
    setEditing(null);
    setForm({
      nombre: item.nombre + ' (copia)', tipo: item.tipo, cantidad: 0,
      precio: String(item.precio || ''), proveedor: item.proveedor || '',
      lote: '', fecha_vencimiento: '', descripcion: item.descripcion || '',
      foto: '', fotoPreview: '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deleteInventarioItem(deleteTarget.id);
      setDeleteTarget(null);
      load();
      confirmUndo({
        onUndo: async () => {
          await window.api.restoreInventarioItem(deleteTarget.id);
          load();
          notify('Producto restaurado', 'success');
        },
        message: `"${deleteTarget.nombre}" eliminado`,
      });
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const handleMovimiento = async (f: Record<string, any>) => {
    if (!f.cantidad || f.cantidad < 1) { notify('Cantidad inválida', 'error'); return; }
    try {
      await window.api.registrarMovimientoInventario({ producto_id: movimientoOpen?.id, tipo: f.tipo, cantidad: parseInt(f.cantidad), motivo: f.motivo });
      notify('Movimiento registrado');
      setMovimientoOpen(null);
      setMovForm({ tipo: 'entrada', cantidad: 1, motivo: '' });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const FormContent = ({ form: f, handleChange, errors: errs }: { form: Record<string, any>; handleChange: any; errors: Record<string, string> }) => (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12 }} sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 1, p: 2, bgcolor: (t) => alpha(t.palette.divider, 0.03), borderRadius: 4 }}>
        <Badge overlap="circular" anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} badgeContent={
          <IconButton size="small" aria-label="Seleccionar foto" sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' }, boxShadow: 2 }} onClick={handleSelectPhoto}>
            <PhotoCameraIcon sx={{ fontSize: 16 }} />
          </IconButton>
        }>
          <Avatar src={f.fotoPreview} variant="rounded" sx={{ width: 80, height: 80, fontSize: 32, fontWeight: 800, bgcolor: 'primary.main', borderRadius: 3 }}>
            <InventoryIcon />
          </Avatar>
        </Badge>
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Imagen del Producto</Typography>
          <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={handleSelectPhoto} sx={{ mt: 1 }}>
            {f.foto ? 'Cambiar Imagen' : 'Subir Imagen'}
          </Button>
        </Box>
      </Grid>
      <Grid size={{ xs: 12, sm: 8 }}>
        <TextField fullWidth label="Nombre del Producto" value={f.nombre || ''} onChange={handleChange('nombre')} error={!!errs.nombre} helperText={errs.nombre} required autoComplete="off" aria-label="Nombre del Producto" slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth select label="Categoría" value={f.tipo || 'medicamento'} onChange={handleChange('tipo')}>
          {TIPOS_INVENTARIO.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label={editing ? "Stock Actual" : "Stock Inicial"} type="number" value={f.cantidad || 0} onChange={handleChange('cantidad')} error={!!errs.cantidad} helperText={errs.cantidad} slotProps={{ htmlInput: { min: 0, max: 99999 } }} inputMode="numeric" aria-label="Cantidad en stock" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Precio Unitario ($)" type="number" value={f.precio || ''} onChange={handleChange('precio')} error={!!errs.precio} helperText={errs.precio} slotProps={{ htmlInput: { min: 0, step: 0.01 } }} inputMode="decimal" aria-label="Precio unitario" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Proveedor Principal" value={f.proveedor || ''} onChange={handleChange('proveedor')} autoComplete="organization" aria-label="Proveedor" slotProps={{ htmlInput: { maxLength: 100 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Lote / Referencia" value={f.lote || ''} onChange={handleChange('lote')} aria-label="Lote" slotProps={{ htmlInput: { maxLength: 50 } }} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Fecha de Vencimiento" type="date" value={f.fecha_vencimiento || ''} onChange={handleChange('fecha_vencimiento')} slotProps={{ inputLabel: { shrink: true } }} error={!!(f.fecha_vencimiento && f.fecha_vencimiento < toISODate())} helperText={f.fecha_vencimiento && f.fecha_vencimiento < toISODate() ? 'Producto vencido' : ''} aria-label="Fecha de vencimiento" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Descripción / Observaciones" multiline rows={3} value={f.descripcion || ''} onChange={handleChange('descripcion')} aria-label="Descripción" slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <PageHeader
        icon={<InventoryIcon />}
        title="Suministros"
        subtitle="Gestión de stock e inventario"
        gradient="warning"
        badge={
          <Chip
            label={`${pagination.total} producto${pagination.total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.warning.main, 0.12), color: 'warning.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <TextField
              size="small"
              placeholder="Buscar por nombre..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ borderRadius: 3, width: { xs: '100%', sm: 260 }, bgcolor: (t) => alpha(t.palette.divider, 0.02), '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
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
              Nuevo Producto
            </Button>
            <Tooltip title="Exportar Inventario">
              <IconButton onClick={() => {
                generateInventarioPDF(items)
                  .then((saved) => { if (saved) notify('Inventario PDF generado'); })
                  .catch((err) => notify('Error al generar PDF: ' + (err instanceof Error ? err.message : String(err)), 'error'));
              }} aria-label="Exportar Inventario" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'avatar-col', label: '' },
              { key: 'nombre', label: 'Producto' },
              { key: 'tipo', label: 'Categoría' },
              { key: 'precio', label: 'Precio' },
              { key: 'cantidad', label: 'Stock', align: 'center' },
              { key: 'fecha_vencimiento', label: 'Vencimiento' },
              { key: 'movimientos-col', label: 'Movimientos', align: 'center' },
              { key: 'acciones-col', label: 'Acciones', align: 'center' },
            ]}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
          />
          <TableBody>
            {loading ? (
              <SkeletonTable rows={5} cols={8} />
            ) : sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ py: 10 }}>
                  <EmptyState 
                    icon={<InventoryIcon sx={{ fontSize: 48, opacity: 0.2 }} />} 
                    title="No se encontraron productos"
                    search={search ? `Sin resultados para "${search}"` : "Comienza agregando suministros al inventario"}
                    action={!search && (
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                        Agregar primer producto
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : sortedItems.map((item) => {
              const tipo = TIPOS_INVENTARIO.find((t) => t.value === item.tipo) || TIPOS_INVENTARIO[3];
              const vencido = item.fecha_vencimiento && new Date(item.fecha_vencimiento) < new Date();
              return (
                <TableRow key={item.id} hover sx={{ transition: 'background-color 0.2s' }}>
                  <TableCell sx={{ pl: 3 }}>
                    <Avatar 
                      src={photoUrls[item.id]} 
                      variant="rounded"
                      sx={{ 
                        width: 44, height: 44, 
                        bgcolor: alpha((theme.palette as any)[tipo.color || 'primary'].main, 0.1), 
                        color: (theme.palette as any)[tipo.color || 'primary'].main,
                        borderRadius: 2,
                        fontSize: 18, fontWeight: 800
                      }}
                    >
                      <InventoryIcon sx={{ fontSize: 20 }} />
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{item.proveedor || 'Sin proveedor'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={tipo.label} 
                      size="small" 
                      sx={{ 
                        fontWeight: 700, 
                        bgcolor: alpha((theme.palette as any)[tipo.color || 'primary'].main, 0.1), 
                        color: (theme.palette as any)[tipo.color || 'primary'].main,
                        borderRadius: 2
                      }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {item.precio ? `$${parseFloat(item.precio).toFixed(2)}` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <StockBadge cantidad={item.cantidad} />
                  </TableCell>
                  <TableCell>
                    {item.fecha_vencimiento ? (
                      <Typography variant="caption" sx={{ 
                        fontWeight: 700, 
                        color: vencido ? 'error.main' : 'text.secondary',
                        bgcolor: vencido ? alpha(theme.palette.error.main, 0.05) : 'transparent',
                        px: 1, py: 0.5, borderRadius: 1
                      }}>
                        {new Date(item.fecha_vencimiento).toLocaleDateString()}
                      </Typography>
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Registrar Entrada">
                        <IconButton size="small" aria-label="Registrar Entrada" sx={{ color: 'success.main', bgcolor: alpha(theme.palette.success.main, 0.05) }} onClick={() => { setMovimientoOpen(item); setMovForm({ tipo: 'entrada', cantidad: 1, motivo: '' }); }}>
                          <AddCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Registrar Salida">
                        <IconButton size="small" aria-label="Registrar Salida" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }} onClick={() => { setMovimientoOpen(item); setMovForm({ tipo: 'salida', cantidad: 1, motivo: '' }); }}>
                          <RemoveCircleIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{ pr: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <IconButton size="small" onClick={() => { setShowTarget(item); setShowOpen(true); }} aria-label="Ver Detalle" sx={{ color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDuplicate(item)} aria-label="Duplicar" sx={{ color: 'success.main', bgcolor: alpha(theme.palette.success.main, 0.05) }}>
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEdit(item)} aria-label="Editar" sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget(item)} aria-label="Eliminar" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
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
          labelRowsPerPage="Productos por página"
          sx={{ borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}
        />
      </Box>

      <FormDialog 
        open={open} 
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); }} 
        onSave={handleSave}
        title={editing ? 'Actualizar Producto' : 'Nuevo Producto en Inventario'} 
        saving={saving} 
        initialValues={form} 
        validate={validate}
        maxWidth="md"
        submitLabel={editing ? 'Actualizar Producto' : 'Crear Producto'}
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <FormDialog 
        open={!!movimientoOpen} 
        onClose={() => setMovimientoOpen(null)}
        onSave={handleMovimiento} 
        title={`${movForm.tipo === 'entrada' ? 'Entrada' : 'Salida'} de Stock`}
        initialValues={movForm} 
        validate={(f: Record<string, any>): Record<string, string> => {
          const errs: Record<string, string> = {};
          if (f.cantidad < 1) errs.cantidad = 'Mínimo 1 unidad';
          else if (f.tipo === 'salida' && f.cantidad > availableStock) errs.cantidad = `Stock insuficiente. Disponible: ${availableStock}`;
          return errs;
        }}
        submitLabel={movForm.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Salida'}
      >
        {({ form: f, handleChange }) => (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Ajustando stock para: <strong>{movimientoOpen?.nombre}</strong>
            </Typography>
            <TextField select fullWidth label="Tipo de Movimiento" value={f.tipo} onChange={handleChange('tipo')}>
              <MenuItem value="entrada">Entrada (Compra / Reposición)</MenuItem>
              <MenuItem value="salida">Salida (Uso / Venta / Merma)</MenuItem>
            </TextField>
            <TextField fullWidth label="Cantidad de Unidades" type="number" value={f.cantidad} onChange={handleChange('cantidad')} slotProps={{ htmlInput: { min: 1, max: f.tipo === 'salida' ? availableStock : undefined } }} required error={f.tipo === 'salida' && f.cantidad > availableStock} helperText={f.tipo === 'salida' ? `Disponible: ${availableStock} unidades` : ''} />
            <TextField fullWidth label="Motivo o Referencia" value={f.motivo || ''} onChange={handleChange('motivo')} placeholder="Ej: Venta directa, Ajuste de inventario..." />
          </Box>
        )}
      </FormDialog>

      <ConfirmDialog 
        open={!!deleteTarget} 
        title="Eliminar Producto" 
        message={`¿Estás seguro de que deseas eliminar "${deleteTarget?.nombre}" del inventario? Esta acción es irreversible.`}
        onConfirm={handleDelete} 
        onCancel={() => setDeleteTarget(null)} 
      />
      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        onEdit={() => { if (showTarget) handleEdit(showTarget); }}
        title="Detalle del Producto"
        fields={[
          { label: 'Nombre', value: showTarget?.nombre },
          { label: 'Categoría', value: showTarget?.tipo, type: 'chip' },
          { label: 'Stock', value: showTarget?.cantidad != null ? `${showTarget.cantidad} unidades` : null },
          { label: 'Precio', value: showTarget?.precio != null ? `$${parseFloat(showTarget.precio).toFixed(2)}` : null },
          { label: 'Proveedor', value: showTarget?.proveedor },
          { label: 'Lote', value: showTarget?.lote },
          { label: 'Vencimiento', value: showTarget?.fecha_vencimiento, type: 'date' },
          { label: 'Descripción', value: showTarget?.descripcion },
        ]}
      />
    </Box>
  );
}

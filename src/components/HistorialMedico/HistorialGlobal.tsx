import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, MenuItem, IconButton, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Chip, InputAdornment, alpha, useTheme,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { useNotification } from '../shared/NotificationContext';
import ShowDialog from '../shared/ShowDialog';
import SkeletonTable from '../shared/SkeletonTable';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import { generateHistorialGlobalPDF } from '../../utils/pdfGenerator';
import { useDebounce, useSort } from '../../hooks';
import { TIPOS_HISTORIAL } from '../../constants';
import PageHeader from '../shared/PageHeader';

export default function HistorialGlobal() {
  const navigate = useNavigate();
  const theme = useTheme();
  const notifCtx = useNotification();
  const notify = notifCtx?.notify ?? (() => {});
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getHistorialAll({ tipo: filtroTipo || undefined, fechaDesde: fechaDesde || undefined, fechaHasta: fechaHasta || undefined });
      setHistorial(data || []);
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [filtroTipo, fechaDesde, fechaHasta, notify]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => historial.filter((h: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        h.mascota_nombre?.toLowerCase().includes(q) ||
        h.propietario_nombre?.toLowerCase().includes(q) ||
        h.descripcion?.toLowerCase().includes(q) ||
        h.diagnostico?.toLowerCase().includes(q) ||
        h.tratamiento?.toLowerCase().includes(q) ||
        TIPOS_HISTORIAL.some((t) => t.label.toLowerCase().includes(q) && t.value === h.tipo)
      );
    }),
    [historial, search]
  );

  const { orderBy, order, handleSort, sortedItems } = useSort(filtered);

  const exportPDF = async () => {
    try {
      const saved = await generateHistorialGlobalPDF(filtered);
      if (saved) notify('PDF de historiales generado');
    } catch (err) {
      notify('Error al generar PDF: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  return (
    <Box>
      <PageHeader
        icon={<MedicalServicesIcon />}
        title="Todos los Historiales"
        subtitle="Registros médicos de todos los pacientes"
        gradient="info"
        badge={
          <Chip
            label={`${historial.length} registro${historial.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.info.main, 0.1), color: 'info.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <TextField
              size="small"
              placeholder="Buscar en registros..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ borderRadius: 3, width: 240, bgcolor: (t) => alpha(t.palette.divider, 0.02), '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment>,
                }
              }}
            />
            <IconButton onClick={exportPDF} aria-label="Exportar Historiales" sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.05) }}>
              <PictureAsPdfIcon />
            </IconButton>
          </>
        }
      />

      <Paper sx={{ mb: 3, p: 2.5, borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="Tipo de Atención"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {TIPOS_HISTORIAL.map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" type="date" label="Desde" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" type="date" label="Hasta" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'fecha', label: 'Fecha' },
              { key: 'mascota_nombre', label: 'Paciente' },
              { key: 'propietario_nombre', label: 'Propietario' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'diagnostico', label: 'Hallazgos / Diagnóstico' },
              { key: 'tratamiento', label: 'Tratamiento / Plan' },
              { key: 'acciones-col', label: 'Acciones', align: 'center' },
            ]}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
          />
          <TableBody>
            {loading ? (
              <SkeletonTable rows={5} cols={7} />
            ) : sortedItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ py: 10 }}>
                  <EmptyState
                    icon={<MedicalServicesIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
                    title="Sin registros"
                    search={search ? `Sin registros para "${search}"` : 'No hay registros médicos con los filtros seleccionados.'}
                  />
                </TableCell>
              </TableRow>
            ) : sortedItems.map((h: any) => {
              const tipo = TIPOS_HISTORIAL.find((t) => t.value === h.tipo) || TIPOS_HISTORIAL[0];
              return (
                <TableRow key={h.id} hover sx={{ transition: 'background-color 0.2s', '& td': { verticalAlign: 'top', py: 3 }, cursor: 'pointer' }} onClick={() => navigate(`/historial/${h.mascota_id}`)}>
                  <TableCell sx={{ pl: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                      {new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'primary.main' }}>{h.mascota_nombre || `#${h.mascota_id}`}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{h.propietario_nombre || '-'}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={tipo.label}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        bgcolor: (t) => alpha((t.palette as any)[tipo.color || 'primary'].main, 0.12),
                        color: (t) => (t.palette as any)[tipo.color || 'primary'].main,
                        borderRadius: 1.5,
                        minWidth: 90,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>{h.descripcion || '-'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{h.diagnostico || '-'}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', bgcolor: (t) => alpha(t.palette.divider, 0.03), p: 1.5, borderRadius: 2, borderLeft: (t) => `3px solid ${alpha(t.palette.primary.main, 0.3)}` }}>
                      {h.tratamiento || 'Sin tratamiento prescrito'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ pr: 3 }} onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" onClick={() => { setShowTarget(h); setShowOpen(true); }} aria-label="Ver Detalle" sx={{ color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        title="Registro Clínico"
        fields={[
          { label: 'Paciente', value: showTarget?.mascota_nombre },
          { label: 'Propietario', value: showTarget?.propietario_nombre },
          { label: 'Fecha', value: showTarget?.fecha },
          { label: 'Tipo', value: TIPOS_HISTORIAL.find((t) => t.value === showTarget?.tipo)?.label ?? showTarget?.tipo },
          { label: 'Descripción', value: showTarget?.descripcion },
          { label: 'Diagnóstico', value: showTarget?.diagnostico },
          { label: 'Tratamiento', value: showTarget?.tratamiento },
          { label: 'Próxima Dosis', value: showTarget?.proxima_dosis, hidden: showTarget?.tipo !== 'vacuna' },
        ]}
      />
    </Box>
  );
}

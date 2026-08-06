import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, MenuItem, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Tooltip, Alert,
  Chip, CircularProgress, TablePagination, InputAdornment, Avatar, alpha, useTheme, Tabs, Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import VaccinesIcon from '@mui/icons-material/Vaccines';
import BugReportIcon from '@mui/icons-material/BugReport';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { useNotification } from '../shared/NotificationContext';
import ConfirmDialog from '../shared/ConfirmDialog';
import ShowDialog from '../shared/ShowDialog';
import SkeletonTable from '../shared/SkeletonTable';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import FormDialog from '../shared/FormDialog';
import { generateHistorialPDF, generateRecetaPDF } from '../../utils/pdfGenerator';
import { useDebounce, useSort } from '../../hooks';
import { TIPOS_HISTORIAL, PAGE_SIZES } from '../../constants';
import { toISODate } from '../../utils/date';
import { getPhotoDataUrl } from '../../utils/photoCache';
import PageHeader from '../shared/PageHeader';
import VacunasTab from './VacunasTab';
import DesparasitacionesTab from './DesparasitacionesTab';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const emptyForm = { fecha: toISODate(), tipo: 'consulta', descripcion: '', diagnostico: '', tratamiento: '', proxima_dosis: '', peso: '', temperatura: '', frecuencia_cardiaca: '', frecuencia_respiratoria: '' };

export default function HistorialList() {
  const { mascotaId } = useParams();
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<any[]>([]);
  const [mascota, setMascota] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'consultas' | 'cirugias' | 'vacunas' | 'desparasitaciones'>('consultas');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 400);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const notifCtx = useNotification();
  const notify = notifCtx?.notify ?? (() => {});
  const theme = useTheme();
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  const filtered = historial.filter((h: any) => {
    if (tab === 'cirugias' && h.tipo !== 'cirugia') return false;
    if (tab === 'consultas' && h.tipo !== 'consulta' && h.tipo !== 'receta') return false;
    if (!search) return true;
    return (
      h.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
      h.diagnostico?.toLowerCase().includes(search.toLowerCase()) ||
      h.tratamiento?.toLowerCase().includes(search.toLowerCase()) ||
      TIPOS_HISTORIAL.some((t) => t.label.toLowerCase().includes(search.toLowerCase()) && t.value === h.tipo)
    );
  });

  const { orderBy, order, handleSort, sortedItems } = useSort(filtered);

  const pesoData = useMemo(() => {
    return historial
      .filter((h: any) => h.peso != null && h.peso !== '')
      .map((h: any) => ({
        fecha: new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        peso: Number(h.peso),
        _sort: String(h.fecha),
      }))
      .sort((a: any, b: any) => (a._sort < b._sort ? -1 : 1));
  }, [historial]);

  const paginated = sortedItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historialData, mascotaData] = await Promise.all([
        window.api.getHistorial(Number(mascotaId)),
        window.api.getMascota(Number(mascotaId)),
      ]);
      if (!mascotaData) {
        setError('No se encontró la mascota. Verifique que el ID sea correcto.');
        setLoading(false);
        return;
      }
      setHistorial(historialData || []);
      setMascota(mascotaData);
      if (mascotaData?.foto) {
        const url = await getPhotoDataUrl(mascotaData.foto);
        setPhotoUrl(url);
      } else {
        setPhotoUrl(null);
      }
    } catch (err) {
      console.error('[Historial] Error loading:', err);
      setError(err instanceof Error ? err.message : String(err));
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [mascotaId, notify]);

  useEffect(() => { load(); }, [load]);

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.fecha) errs.fecha = 'La fecha es obligatoria';
    if (f.tipo === 'vacuna' && f.proxima_dosis && f.proxima_dosis < toISODate()) errs.proxima_dosis = 'La fecha debe ser futura';
    if (f.peso && (isNaN(Number(f.peso)) || Number(f.peso) < 0 || Number(f.peso) > 500)) errs.peso = 'Peso inválido (0-500 kg)';
    if (f.temperatura && (isNaN(Number(f.temperatura)) || Number(f.temperatura) < 25 || Number(f.temperatura) > 45)) errs.temperatura = 'Temperatura (25-45 °C)';
    if (f.frecuencia_cardiaca && (isNaN(Number(f.frecuencia_cardiaca)) || Number(f.frecuencia_cardiaca) < 20 || Number(f.frecuencia_cardiaca) > 300)) errs.frecuencia_cardiaca = 'Frec. cardíaca (20-300)';
    if (f.frecuencia_respiratoria && (isNaN(Number(f.frecuencia_respiratoria)) || Number(f.frecuencia_respiratoria) < 5 || Number(f.frecuencia_respiratoria) > 200)) errs.frecuencia_respiratoria = 'Frec. respiratoria (5-200)';
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setSaving(true);
    try {
      const payload = { ...f, mascota_id: parseInt(mascotaId ?? '0') };
      if (editing) {
        await window.api.updateHistorial({ id: editing, ...payload });
        notify('Registro actualizado correctamente');
      } else {
        await window.api.createHistorial(payload);
        notify('Registro guardado correctamente');
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

  const handleEdit = (h: any) => {
    setEditing(h.id);
    setForm({
      fecha: toISODate(new Date(h.fecha)),
      tipo: h.tipo,
      descripcion: h.descripcion || '',
      diagnostico: h.diagnostico || '',
      tratamiento: h.tratamiento || '',
      proxima_dosis: h.proxima_dosis ? toISODate(new Date(h.proxima_dosis)) : '',
      peso: h.peso != null ? String(h.peso) : '',
      temperatura: h.temperatura != null ? String(h.temperatura) : '',
      frecuencia_cardiaca: h.frecuencia_cardiaca != null ? String(h.frecuencia_cardiaca) : '',
      frecuencia_respiratoria: h.frecuencia_respiratoria != null ? String(h.frecuencia_respiratoria) : '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deleteHistorial(deleteTarget.id);
      notify('Registro eliminado correctamente');
      setDeleteTarget(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    }
  };

  const exportHistorialPDF = async () => {
    try {
      const saved = await generateHistorialPDF(mascota as any, historial, { photoDataUrl: photoUrl, includePhotos: true });
      if (saved) notify('Historial PDF generado');
    } catch (err) {
      notify('Error al generar PDF: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const exportRecetaPDF = async (registro: any) => {
    try {
      const saved = await generateRecetaPDF(mascota as any, registro);
      if (saved) notify('Receta PDF generada');
    } catch (err) {
      notify('Error al generar PDF: ' + (err instanceof Error ? err.message : String(err)), 'error');
    }
  };

  const FormContent = ({ form: f, handleChange, errors: errs }: { form: Record<string, any>; handleChange: any; errors: Record<string, string> }) => (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Fecha del Evento" type="date" value={f.fecha || ''} onChange={handleChange('fecha')} error={!!errs.fecha} helperText={errs.fecha} required slotProps={{ inputLabel: { shrink: true } }} aria-label="Fecha del evento" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        {tab === 'cirugias' ? (
          <TextField fullWidth label="Tipo de Atención" value="Cirugía" disabled />
        ) : (
          <TextField fullWidth select label="Tipo de Atención" value={f.tipo || 'consulta'} onChange={handleChange('tipo')} autoFocus={!editing}>
            {TIPOS_HISTORIAL.filter((t) => t.value !== 'vacuna' && t.value !== 'cirugia').map((t) => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
          </TextField>
        )}
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Motivo de Consulta / Descripción" multiline rows={2} value={f.descripcion || ''} onChange={handleChange('descripcion')} placeholder="Breve descripción del motivo de la visita..." autoComplete="off" aria-label="Descripción del motivo de visita" slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Temperatura (°C)" type="number" value={f.temperatura || ''} onChange={handleChange('temperatura')} helperText={errs.temperatura || '25 - 45'} error={!!errs.temperatura} slotProps={{ htmlInput: { min: 25, max: 45, step: 0.1 } }} aria-label="Temperatura" />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Frec. Cardíaca (lpm)" type="number" value={f.frecuencia_cardiaca || ''} onChange={handleChange('frecuencia_cardiaca')} helperText={errs.frecuencia_cardiaca || '20 - 300'} error={!!errs.frecuencia_cardiaca} slotProps={{ htmlInput: { min: 20, max: 300 } }} aria-label="Frecuencia cardíaca" />
      </Grid>
      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField fullWidth label="Frec. Respiratoria (rpm)" type="number" value={f.frecuencia_respiratoria || ''} onChange={handleChange('frecuencia_respiratoria')} helperText={errs.frecuencia_respiratoria || '5 - 200'} error={!!errs.frecuencia_respiratoria} slotProps={{ htmlInput: { min: 5, max: 200 } }} aria-label="Frecuencia respiratoria" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Diagnóstico Clínico" multiline rows={2} value={f.diagnostico || ''} onChange={handleChange('diagnostico')} placeholder="Resultados del examen físico y hallazgos..." autoComplete="off" aria-label="Diagnóstico clínico" slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Plan de Tratamiento / Receta" multiline rows={4} value={f.tratamiento || ''} onChange={handleChange('tratamiento')} placeholder="Medicamentos, dosis y recomendaciones..." autoComplete="off" aria-label="Plan de tratamiento o receta" slotProps={{ htmlInput: { maxLength: 1000 } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Peso del Paciente (kg)" type="number" value={f.peso || ''} onChange={handleChange('peso')} helperText={errs.peso || 'Registra el peso para ver su evolución'} error={!!errs.peso} slotProps={{ htmlInput: { min: 0, step: 0.1 } }} inputMode="numeric" aria-label="Peso del paciente" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Fecha de Próxima Dosis / Refuerzo" type="date" value={f.proxima_dosis || ''} onChange={handleChange('proxima_dosis')} slotProps={{ inputLabel: { shrink: true } }} helperText="Fecha futura" error={!!errs.proxima_dosis} aria-label="Fecha de próxima dosis" />
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <PageHeader
        icon={<MedicalServicesIcon />}
        title="Historial Clínico"
        subtitle={mascota ? `Evolución médica de ${mascota.nombre}` : 'Evolución médica del paciente'}
        gradient="info"
        badge={
          tab === 'vacunas' || tab === 'desparasitaciones' ? undefined : (
            <Chip
              label={`${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`}
              size="small"
              sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.info.main, 0.1), color: 'info.main', borderRadius: 1.5 }}
            />
          )
        }
        actions={
          <>
            <Button variant="text" startIcon={<ArrowBackIcon />} onClick={() => navigate('/mascotas')} sx={{ fontWeight: 700 }}>
              Volver a pacientes
            </Button>
            {tab !== 'vacunas' && tab !== 'desparasitaciones' && (
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
            )}
            {tab !== 'vacunas' && tab !== 'desparasitaciones' && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setEditing(null); setForm({ ...emptyForm, tipo: tab === 'cirugias' ? 'cirugia' : 'consulta' }); setErrors({}); setOpen(true); }}
                sx={{ px: 3, fontWeight: 700 }}
              >
                {tab === 'cirugias' ? 'Nueva Cirugía' : 'Nueva Consulta'}
              </Button>
            )}
            {tab === 'consultas' && mascota && (
              <Tooltip title="Exportar Historial Completo">
                <IconButton onClick={exportHistorialPDF} aria-label="Exportar Historial Completo" sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.05) }}>
                  <PictureAsPdfIcon />
                </IconButton>
              </Tooltip>
            )}
          </>
        }
      />

      {mascota && (
        <Paper sx={{ 
          display: 'flex', alignItems: 'center', gap: 4, mb: 5, p: 3, 
          borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`,
          boxShadow: 'none',
          bgcolor: (t) => alpha(t.palette.background.paper, 0.5)
        }}>
          <Avatar 
            src={photoUrl ?? undefined} 
            sx={{ 
              width: 100, height: 100, fontSize: 42, fontWeight: 800,
              bgcolor: 'primary.main', 
              boxShadow: (t) => `0 12px 24px -8px ${alpha(t.palette.primary.main, 0.4)}`,
              border: (t) => `4px solid ${alpha(t.palette.background.paper, 0.8)}`
            }}
          >
            {mascota.nombre?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ fontWeight: 800 }} color="text.primary">{mascota.nombre}</Typography>
              <Chip label={mascota.especie} size="small" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 1.5 }} />
              {mascota.alergias && (
                <Chip
                  icon={<WarningAmberIcon sx={{ fontSize: '0.8rem !important' }} />}
                  label={`Alergias: ${mascota.alergias}`}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.error.main, 0.1), color: 'error.main', borderRadius: 1.5 }}
                />
              )}
              {mascota.condiciones_cronicas && (
                <Chip
                  icon={<HealthAndSafetyIcon sx={{ fontSize: '0.8rem !important' }} />}
                  label={`Condición crónica: ${mascota.condiciones_cronicas}`}
                  size="small"
                  sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.warning.main, 0.12), color: 'warning.main', borderRadius: 1.5 }}
                />
              )}
            </Box>
            <Grid container spacing={3}>
              <Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Raza</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{mascota.raza || 'No especificada'}</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Edad</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{mascota.edad ? `${Math.floor(mascota.edad / 12)}a ${mascota.edad % 12}m` : '-'}</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Peso Actual</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{mascota.peso != null ? `${mascota.peso} kg` : '-'}</Typography>
              </Grid>
              <Grid>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, textTransform: 'uppercase', mb: 0.5 }}>Propietario</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }} color="primary.main">{mascota.propietario_nombre || '-'}</Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); setPage(0); }}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', borderRadius: 2 } }}
      >
        <Tab value="consultas" label="Consultas" icon={<MedicalServicesIcon />} iconPosition="start" />
        <Tab value="cirugias" label="Cirugías" icon={<HealthAndSafetyIcon />} iconPosition="start" />
        <Tab value="vacunas" label="Vacunas" icon={<VaccinesIcon />} iconPosition="start" />
        <Tab value="desparasitaciones" label="Desparasitaciones" icon={<BugReportIcon />} iconPosition="start" />
      </Tabs>

      {tab === 'vacunas' && <VacunasTab mascotaId={parseInt(mascotaId ?? '0', 10)} />}
      {tab === 'desparasitaciones' && <DesparasitacionesTab mascotaId={parseInt(mascotaId ?? '0', 10)} />}

      {tab !== 'vacunas' && tab !== 'desparasitaciones' && (<>
      {pesoData.length >= 2 && (
        <Paper sx={{ p: 3, mb: 4, borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none', bgcolor: (t) => alpha(t.palette.background.paper, 0.5) }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <TrendingUpIcon sx={{ color: 'success.main' }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Evolución de Peso</Typography>
            <Chip label={`${pesoData.length} mediciones`} size="small" sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.success.main, 0.1), color: 'success.main', borderRadius: 1.5, fontSize: '0.7rem' }} />
          </Box>
          <Box sx={{ width: '100%', height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pesoData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={alpha(theme.palette.divider, 0.3)} />
                <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} width={40} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#fff' }}
                  labelStyle={{ fontWeight: 800 }}
                  formatter={(value: any) => [`${value} kg`, 'Peso']}
                />
                <Line type="monotone" dataKey="peso" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

       <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'fecha', label: 'Fecha' },
              { key: 'tipo', label: 'Tipo' },
              { key: 'peso', label: 'Peso' },
              { key: 'diagnostico', label: 'Hallazgos / Diagnóstico' },
              { key: 'tratamiento', label: 'Tratamiento / Plan' },
              { key: 'proxima_dosis', label: 'Próx. Cita' },
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
                    title="Historial Vacío"
                    search={search ? `Sin registros para "${search}"` : "Este paciente no tiene atenciones registradas."}
                    action={!search && (
                      <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
                        Crear Primer Registro
                      </Button>
                    )}
                  />
                </TableCell>
              </TableRow>
            ) : paginated.map((h) => {
              const tipo = TIPOS_HISTORIAL.find((t) => t.value === h.tipo) || TIPOS_HISTORIAL[0];
              const vencida = h.proxima_dosis && new Date(h.proxima_dosis) < new Date();
              return (
                <TableRow key={h.id} hover sx={{ transition: 'background-color 0.2s', '& td': { verticalAlign: 'top', py: 3 } }}>
                  <TableCell sx={{ pl: 3 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary" }}>
                      {new Date(h.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </Typography>
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
                        minWidth: 90
                      }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {h.peso != null ? `${h.peso} kg` : '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>{h.descripcion || '-'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>{h.diagnostico || '-'}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 300 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap', bgcolor: (t) => alpha(t.palette.divider, 0.03), p: 1.5, borderRadius: 2, borderLeft: (t) => `3px solid ${alpha(t.palette.primary.main, 0.3)}` }}>
                      {h.tratamiento || 'Sin tratamiento prescrito'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {h.proxima_dosis ? (
                      <Typography variant="caption" sx={{ 
                        fontWeight: 800, 
                        color: vencida ? 'error.main' : 'success.main',
                        bgcolor: vencida ? alpha(theme.palette.error.main, 0.05) : alpha(theme.palette.success.main, 0.05),
                        px: 1, py: 0.5, borderRadius: 1
                      }}>
                        {new Date(h.proxima_dosis).toLocaleDateString()}
                      </Typography>
                    ) : '-'}
                  </TableCell>
                  <TableCell align="center" sx={{ pr: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      {(h.tipo === 'receta' || h.tratamiento) && (
                        <Tooltip title="Imprimir Receta">
                          <IconButton size="small" onClick={() => exportRecetaPDF(h)} aria-label="Imprimir Receta" sx={{ color: 'secondary.main', bgcolor: alpha(theme.palette.secondary.main, 0.05) }}>
                            <ReceiptLongIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <IconButton size="small" onClick={() => { setShowTarget(h); setShowOpen(true); }} aria-label="Ver Detalle" sx={{ color: 'info.main', bgcolor: alpha(theme.palette.info.main, 0.05) }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleEdit(h)} aria-label="Editar" sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget(h)} aria-label="Eliminar" sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}>
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
          count={sortedItems.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={PAGE_SIZES}
          labelRowsPerPage="Registros por página"
          sx={{ borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}
        />
      </Box>
      </>)}

      <FormDialog 
        open={open} 
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); }}
        onSave={handleSave} 
        title={editing
          ? (tab === 'cirugias' ? 'Actualizar Cirugía' : 'Actualizar Consulta')
          : (tab === 'cirugias' ? 'Nueva Cirugía' : 'Nueva Consulta')}
        saving={saving} 
        initialValues={form} 
        validate={validate}
        maxWidth="md"
        submitLabel={editing ? 'Actualizar Registro' : 'Crear Registro'}
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <ConfirmDialog 
        open={!!deleteTarget} 
        title="Eliminar Registro Clínico" 
        message={`¿Estás seguro de que deseas eliminar este registro? Esta acción es crítica y borrará los datos médicos permanentemente.`}
        onConfirm={handleDelete} 
        onCancel={() => setDeleteTarget(null)} 
      />
      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        onEdit={() => { if (showTarget) handleEdit(showTarget); }}
        title="Registro Clínico"
        fields={[
          { label: 'Fecha', value: showTarget?.fecha },
          { label: 'Tipo', value: TIPOS_HISTORIAL.find((t) => t.value === showTarget?.tipo)?.label ?? showTarget?.tipo },
          { label: 'Peso', value: showTarget?.peso != null ? `${showTarget.peso} kg` : null },
          { label: 'Temperatura', value: showTarget?.temperatura != null ? `${showTarget.temperatura} °C` : null },
          { label: 'Frec. Cardíaca', value: showTarget?.frecuencia_cardiaca != null ? `${showTarget.frecuencia_cardiaca} lpm` : null },
          { label: 'Frec. Respiratoria', value: showTarget?.frecuencia_respiratoria != null ? `${showTarget.frecuencia_respiratoria} rpm` : null },
          { label: 'Descripción', value: showTarget?.descripcion },
          { label: 'Diagnóstico', value: showTarget?.diagnostico },
          { label: 'Tratamiento', value: showTarget?.tratamiento },
          { label: 'Próxima Dosis', value: showTarget?.proxima_dosis, hidden: showTarget?.tipo !== 'vacuna' },
        ]}
      />
    </Box>
  );
}

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, TextField, MenuItem, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography, Tooltip,
  Chip, Select, FormControl, InputLabel, Avatar, Fade, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HistoryIcon from '@mui/icons-material/History';
import PetsIcon from '@mui/icons-material/Pets';
import { alpha, type Theme } from '@mui/material';
import SkeletonTable from '../shared/SkeletonTable';
import CalendarGrid from '../shared/CalendarGrid';
import { useNotification } from '../shared/NotificationContext';
import { useUndoDelete } from '../shared/useUndoDelete';
import ConfirmDialog from '../shared/ConfirmDialog';
import ShowDialog from '../shared/ShowDialog';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import FormDialog from '../shared/FormDialog';
import { generateCitasPDF } from '../../utils/pdfGenerator';
import { ESTADOS_CITA, ESPECIE_CONFIG } from '../../constants';
import { toISODate } from '../../utils/date';
import { useSort, useFilterPersistence, useKeyboardShortcuts } from '../../hooks';
import PageHeader from '../shared/PageHeader';

const TAB_ALL = 'todas';
const TABS = [
  { value: TAB_ALL, label: 'Todas', icon: <EventAvailableIcon sx={{ fontSize: 16 }} /> },
  { value: 'pendiente', label: 'Pendientes', icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, color: '#f59e0b' },
  { value: 'realizada', label: 'Realizadas', icon: <CheckCircleIcon sx={{ fontSize: 16 }} />, color: '#22c55e' },
  { value: 'cancelada', label: 'Canceladas', icon: <CancelIcon sx={{ fontSize: 16 }} />, color: '#ef4444' },
];

function getEmptyForm() {
  return { mascota_id: '', fecha: toISODate(), hora: '', motivo: '', estado: 'pendiente', notas: '' };
}

export default function CitasList() {
  const navigate = useNavigate();
  const [citas, setCitas] = useState<any[]>([]);
  const [mascotas, setMascotas] = useState<any[]>([]);
  const [monthData, setMonthData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(getEmptyForm());
  const [editing, setEditing] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [pendingToggle, setPendingToggle] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const filterPersist = useFilterPersistence('citas');
  const savedFilters = filterPersist.load();
  const [selectedDate, setSelectedDate] = useState(savedFilters.selectedDate || toISODate());
  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth() + 1);
  const notifCtx = useNotification();
  const notify = notifCtx?.notify ?? (() => {});
  const { confirmUndo } = useUndoDelete();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [viewMode, setViewMode] = useState(savedFilters.viewMode || 'list');
  const [conflictWarning, setConflictWarning] = useState('');
  const conflictTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showOpen, setShowOpen] = useState(false);
  const [showTarget, setShowTarget] = useState<any>(null);

  useEffect(() => {
    filterPersist.save({ viewMode, selectedDate });
  }, [viewMode, selectedDate, filterPersist]);

  const openNewForm = useCallback(() => { setEditing(null); setForm({ ...getEmptyForm(), fecha: selectedDate }); setErrors({}); setOpen(true); }, [selectedDate]);
  useKeyboardShortcuts(useMemo(() => ({
    'ctrl+n': openNewForm,
    'escape': () => { if (open) { setOpen(false); setEditing(null); } },
  }), [openNewForm, open]));

  const filteredByTab = useMemo(() => {
    if (activeTab === TAB_ALL) return citas;
    return citas.filter((c) => c.estado === activeTab);
  }, [citas, activeTab]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return filteredByTab;
    const q = searchQuery.toLowerCase();
    return filteredByTab.filter((c) =>
      c.mascota_nombre?.toLowerCase().includes(q) ||
      c.propietario_nombre?.toLowerCase().includes(q) ||
      c.motivo?.toLowerCase().includes(q)
    );
  }, [filteredByTab, searchQuery]);

  const sortComparator = useCallback((a: any, b: any, key: string) => {
    if (key === 'hora') {
      const aH = a.hora || '99:99';
      const bH = b.hora || '99:99';
      return aH.localeCompare(bH);
    }
    if (key === 'estado') {
      const orderMap: Record<string, number> = { pendiente: 0, realizada: 1, cancelada: 2 };
      return (orderMap[a.estado] ?? 0) - (orderMap[b.estado] ?? 0);
    }
    const aVal = a[key];
    const bVal = b[key];
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    return typeof aVal === 'string' ? aVal.localeCompare(bVal, 'es', { sensitivity: 'base' }) : (aVal < bVal ? -1 : aVal > bVal ? 1 : 0);
  }, []);
  const { orderBy, order, handleSort, sortedItems } = useSort(filteredBySearch, 'hora', 'asc', sortComparator);

  const loadMascotas = useCallback(async () => {
    try { setMascotas(await window.api.getMascotasForCitas()); }
    catch (err) { notify(err instanceof Error ? err.message : String(err), 'error'); }
  }, [notify]);

  const loadMonthData = useCallback(async () => {
    try { setMonthData(await window.api.getCitasByMonth(calendarYear, calendarMonth)); }
    catch (err) { notify(err instanceof Error ? err.message : String(err), 'error'); }
  }, [calendarYear, calendarMonth, notify]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getCitasByDate(selectedDate);
      setCitas(data);
    } catch (err) { notify(err instanceof Error ? err.message : String(err), 'error'); }
    finally { setLoading(false); }
  }, [selectedDate, notify]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMonthData(); }, [loadMonthData]);
  useEffect(() => { loadMascotas(); }, [loadMascotas]);

  useEffect(() => {
    if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current);
    if (!form.fecha || !form.hora) { setConflictWarning(''); return; }
    conflictTimerRef.current = setTimeout(async () => {
      try {
        const conflict = await window.api.checkCitaConflict(form.fecha, form.hora, editing || undefined);
        if (conflict) setConflictWarning('Ya existe una cita en este horario');
        else setConflictWarning('');
      } catch { setConflictWarning(''); }
    }, 500);
    return () => { if (conflictTimerRef.current) clearTimeout(conflictTimerRef.current); };
  }, [form.fecha, form.hora, editing]);

  const changeDay = (delta: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    const newDate = toISODate(d);
    setSelectedDate(newDate);
    if (d.getMonth() + 1 !== calendarMonth || d.getFullYear() !== calendarYear) {
      setCalendarYear(d.getFullYear());
      setCalendarMonth(d.getMonth() + 1);
    }
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
    const d = new Date(dateStr + 'T12:00:00');
    if (d.getMonth() + 1 !== calendarMonth || d.getFullYear() !== calendarYear) {
      setCalendarYear(d.getFullYear());
      setCalendarMonth(d.getMonth() + 1);
    }
  };

  const validate = (f: Record<string, any>) => {
    const errs: Record<string, string> = {};
    if (!f.fecha) errs.fecha = 'La fecha es obligatoria';
    if (!f.mascota_id) errs.mascota_id = 'Debe seleccionar una mascota';
    if (f.fecha && f.hora) {
      const now = new Date();
      const citaDate = new Date(f.fecha + 'T' + f.hora);
      if (!editing && citaDate < now) {
        errs.hora = 'La hora no puede ser en el pasado';
      }
    }
    return errs;
  };

  const handleSave = async (f: Record<string, any>) => {
    const errs = validate(f);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    if (conflictWarning) {
      setErrors({ hora: conflictWarning });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        mascota_id: Number(f.mascota_id), fecha: f.fecha, hora: f.hora || null,
        motivo: f.motivo || null, estado: f.estado || 'pendiente', notas: f.notas || null,
      };
      if (editing) {
        const res = await window.api.updateCita({ id: editing, ...payload });
        notify(res.historialCreado ? 'Cita actualizada — Historial médico creado automáticamente' : 'Cita actualizada');
      } else {
        await window.api.createCita(payload);
        notify('Cita creada');
      }
      setOpen(false);
      setEditing(null);
      setForm(getEmptyForm());
      setErrors({});
      load();
      loadMonthData();
    } catch (err: any) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: any) => {
    setEditing(c.id);
    setForm({
      mascota_id: c.mascota_id,
      fecha: toISODate(new Date(c.fecha + 'T12:00:00')),
      hora: c.hora ? c.hora.slice(0, 5) : '',
      motivo: c.motivo || '', estado: c.estado, notas: c.notas || '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDuplicate = (c: any) => {
    setEditing(null);
    setForm({
      mascota_id: c.mascota_id,
      fecha: toISODate(),
      hora: c.hora ? c.hora.slice(0, 5) : '',
      motivo: c.motivo || '', estado: 'pendiente', notas: '',
    });
    setErrors({});
    setOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await window.api.deleteCita(deleteTarget.id);
      setDeleteTarget(null);
      load();
      loadMonthData();
      confirmUndo({
        onUndo: async () => {
          try {
            await window.api.createCita({
              mascota_id: deleteTarget.mascota_id,
              fecha: deleteTarget.fecha,
              hora: deleteTarget.hora,
              motivo: deleteTarget.motivo,
              estado: deleteTarget.estado || 'pendiente',
              notas: deleteTarget.notas,
            });
            load();
            loadMonthData();
            notify('Cita restaurada', 'success');
          } catch (err) {
            notify(err instanceof Error ? err.message : String(err), 'error');
          }
        },
        message: `Cita de "${deleteTarget.mascota_nombre}" cancelada`,
      });
    } catch (err) { notify(err instanceof Error ? err.message : String(err), 'error'); }
  };

  const doToggleEstado = async (cita: any) => {
    const idx = ESTADOS_CITA.findIndex((e) => e.value === cita.estado);
    const nextEstado = ESTADOS_CITA[(idx + 1) % ESTADOS_CITA.length].value;
    try {
      const res = await window.api.updateCita({
        id: cita.id, mascota_id: cita.mascota_id, fecha: cita.fecha, hora: cita.hora,
        motivo: cita.motivo, estado: nextEstado, notas: cita.notas,
      });
      const estadoLabel = ESTADOS_CITA.find((e) => e.value === nextEstado)?.label ?? nextEstado;
      if (res.historialCreado) {
        notify(`Cita marcada como ${estadoLabel} — Historial médico creado automáticamente`);
      } else if (res.historialEliminado) {
        notify(`Estado: ${estadoLabel} — Historial médico auto-generado eliminado`);
      } else {
        notify(`Estado: ${estadoLabel}`);
      }
      load();
      loadMonthData();
    } catch (err) { notify(err instanceof Error ? err.message : String(err), 'error'); }
  };

  const handleToggleEstado = (cita: any) => {
    const nextEstado = ESTADOS_CITA[(ESTADOS_CITA.findIndex((e) => e.value === cita.estado) + 1) % ESTADOS_CITA.length].value;
    if (cita.estado === 'realizada' && nextEstado !== 'realizada') {
      setPendingToggle(cita);
      return;
    }
    doToggleEstado(cita);
  };

  const formatHora = (h: string | null) => h ? h.slice(0, 5) : '--:--';

  const fecha = new Date(selectedDate + 'T12:00:00');
  const selectedDayName = fecha.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = selectedDate === toISODate();

  const countPendientes = citas.filter((c) => c.estado === 'pendiente').length;
  const countRealizadas = citas.filter((c) => c.estado === 'realizada').length;

  const FormContent = ({ form: f, handleChange, errors: errs }: { form: Record<string, any>; handleChange: any; errors: Record<string, string> }) => (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth select label="Paciente (Mascota)" value={f.mascota_id || ''} onChange={handleChange('mascota_id')} error={!!errs.mascota_id} helperText={errs.mascota_id} required autoFocus={!editing} aria-label="Seleccionar mascota">
          {mascotas.map((m) => (
            <MenuItem key={m.id} value={m.id}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{m.nombre} <Typography component="span" variant="caption" color="text.secondary">({m.especie})</Typography></Typography>
                <Typography variant="caption" sx={{ opacity: 0.6 }}>{m.propietario_nombre}</Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {f.mascota_id && (() => {
        const selectedMascota = mascotas.find((m) => m.id === Number(f.mascota_id));
        if (!selectedMascota) return null;
        return (
          <Grid size={{ xs: 12 }}>
            <Box sx={{ p: 1.5, bgcolor: (t) => alpha(t.palette.info.main, 0.04), borderRadius: 2, border: (t) => `1px solid ${alpha(t.palette.info.main, 0.12)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <PetsIcon sx={{ fontSize: 18, color: 'info.main' }} />
              <Typography variant="caption" color="text.secondary">
                <strong>{selectedMascota.nombre}</strong> — {selectedMascota.especie} — Dueño: {selectedMascota.propietario_nombre}
              </Typography>
            </Box>
          </Grid>
        );
      })()}
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Fecha Programada" type="date" value={f.fecha || ''} onChange={handleChange('fecha')} error={!!errs.fecha} helperText={errs.fecha} required slotProps={{ inputLabel: { shrink: true } }} aria-label="Fecha de la cita" />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="Hora" type="time" value={f.hora || ''} onChange={handleChange('hora')} slotProps={{ inputLabel: { shrink: true } }} error={!!errs.hora || !!conflictWarning} helperText={errs.hora ? errs.hora : conflictWarning ? (
              <Typography component="span" variant="caption" sx={{ color: 'warning.main' }}>
                {conflictWarning}
              </Typography>
            ) : ''} aria-label="Hora de la cita" />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Motivo de Consulta" value={f.motivo || ''} onChange={handleChange('motivo')} placeholder="Ej: Vacunación, Control, Urgencia..." autoComplete="off" aria-label="Motivo de la consulta" slotProps={{ htmlInput: { maxLength: 200 } }} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <FormControl fullWidth>
          <InputLabel>Estado de la Cita</InputLabel>
          <Select value={f.estado || 'pendiente'} label="Estado de la Cita" onChange={handleChange('estado')}>
            {ESTADOS_CITA.map((e) => <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>)}
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField fullWidth label="Notas Adicionales" multiline rows={3} value={f.notas || ''} onChange={handleChange('notas')} placeholder="Observaciones relevantes..." autoComplete="off" aria-label="Notas adicionales de la cita" slotProps={{ htmlInput: { maxLength: 500 } }} />
      </Grid>
    </Grid>
  );

  return (
    <Box>
      <PageHeader
        icon={viewMode === 'list' ? <FormatListBulletedIcon /> : <CalendarMonthIcon />}
        title="Agenda"
        subtitle={viewMode === 'list' ? 'Control de citas y disponibilidad' : 'Vista mensual de citas'}
        badge={
          <Chip
            label={`${citas.length} cita${citas.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, val) => val && setViewMode(val)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  px: 2, py: 0.8, fontWeight: 700, fontSize: '0.8rem',
                  textTransform: 'none', borderRadius: '8px !important',
                  border: (t) => `1px solid ${alpha(t.palette.divider, 0.2)}`,
                  '&.Mui-selected': {
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                    color: 'primary.main',
                    borderColor: 'primary.main',
                  },
                },
              }}
            >
              <ToggleButton value="list">
                <FormatListBulletedIcon sx={{ fontSize: 16, mr: 0.5 }} /> Lista
              </ToggleButton>
              <ToggleButton value="calendar">
                <CalendarMonthIcon sx={{ fontSize: 16, mr: 0.5 }} /> Calendario
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openNewForm}
              sx={{ px: 3, fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
              title="Ctrl+N"
            >
              Nueva Cita
            </Button>
          </>
        }
      />

      {viewMode === 'list' ? (
        <Paper sx={{
          borderRadius: 3, border: '1px solid', borderColor: (t) => alpha(t.palette.divider, 0.1),
          boxShadow: (t) => `0 2px 12px ${alpha(t.palette.common.black, 0.04)}`, overflow: 'hidden'
        }}>
          <Box sx={{
            p: 2.5, pb: 0,
            background: (t) => isToday ? `linear-gradient(135deg, ${alpha(t.palette.primary.main, 0.03)}, ${alpha(t.palette.primary.dark, 0.06)})` : 'none',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton size="small" onClick={() => changeDay(-1)} aria-label="Día anterior"
                  sx={{ bgcolor: 'background.paper', border: (t) => `1px solid ${alpha(t.palette.divider, 0.15)}`, borderRadius: 1.5 }}>
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                <Typography variant="h6" sx={{
                  textTransform: 'capitalize', fontWeight: 800,
                  color: isToday ? 'primary.main' : 'text.primary',
                  px: 1, fontSize: '1.05rem'
                }}>
                  {selectedDayName}
                </Typography>
                <IconButton size="small" onClick={() => changeDay(1)} aria-label="Día siguiente"
                  sx={{ bgcolor: 'background.paper', border: (t) => `1px solid ${alpha(t.palette.divider, 0.15)}`, borderRadius: 1.5 }}>
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
                {isToday && (
                  <Chip label="Hoy" size="small" sx={{ fontWeight: 700, bgcolor: 'primary.main', color: 'white', borderRadius: 1, fontSize: '0.7rem', height: 22 }} />
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 0.8 }}>
                  <Chip icon={<AccessTimeIcon sx={{ fontSize: '0.8rem !important' }} />} label={`${countPendientes} pend.`} size="small"
                    sx={{ fontWeight: 600, bgcolor: (t) => alpha(t.palette.warning.main, 0.1), color: 'warning.main', borderRadius: 1.5, fontSize: '0.72rem' }} />
                  <Chip icon={<CheckCircleIcon sx={{ fontSize: '0.8rem !important' }} />} label={`${countRealizadas} real.`} size="small"
                    sx={{ fontWeight: 600, bgcolor: (t) => alpha(t.palette.success.main, 0.1), color: 'success.main', borderRadius: 1.5, fontSize: '0.72rem' }} />
                </Box>
                {citas.length > 0 && (
                  <Tooltip title="Exportar Agenda">
                    <IconButton size="small" onClick={() => {
                      generateCitasPDF(citas)
                        .then((saved) => { if (saved) notify('Reporte generado'); })
                        .catch((err) => notify('Error al generar PDF: ' + (err instanceof Error ? err.message : String(err)), 'error'));
                    }} aria-label="Exportar Agenda"
                      sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.08), borderRadius: 1.5 }}>
                      <PictureAsPdfIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mt: 2.5 }}>
              <Box sx={{ display: 'flex', gap: 0.8 }}>
                {TABS.map((tab) => (
                  <Chip
                    key={tab.value}
                    icon={tab.icon}
                    label={tab.label}
                    onClick={() => setActiveTab(tab.value)}
                    variant={activeTab === tab.value ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 700, fontSize: '0.75rem', borderRadius: 2, textTransform: 'none',
                      bgcolor: activeTab === tab.value ? (tab.color ? alpha(tab.color, 0.15) : (t) => alpha(t.palette.primary.main, 0.1)) : 'transparent',
                      color: activeTab === tab.value ? (tab.color || 'primary.main') : 'text.secondary',
                      borderColor: (t) => activeTab === tab.value ? (tab.color || 'primary.main') : alpha(t.palette.divider, 0.3),
                      '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.06) }
                    }}
                  />
                ))}
              </Box>
              <TextField
                size="small"
                placeholder="Buscar mascota, dueño o motivo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 0.5, fontSize: '1.1rem' }} />
                  }
                }}
                sx={{
                  minWidth: 240,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2.5, fontSize: '0.82rem', bgcolor: (t) => alpha(t.palette.divider, 0.04),
                  }
                }}
              />
            </Box>
          </Box>

          <TableContainer sx={{ borderRadius: 0 }}>
            <Table>
              <SortableTableHead
                columns={[
                  { key: 'mascota_nombre', label: 'Paciente' },
                  { key: 'hora', label: 'Hora', width: 90 },
                  { key: 'motivo', label: 'Motivo' },
                  { key: 'estado', label: 'Estado', align: 'center' },
                  { key: 'propietario_nombre', label: 'Propietario' },
                  { key: 'acciones-col', label: 'Acciones', align: 'center' },
                ]}
                orderBy={orderBy}
                order={order}
                onSort={handleSort}
              />
              <TableBody>
                {loading ? (
                  <SkeletonTable rows={4} cols={6} />
                ) : sortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ py: 8 }}>
                      <Fade in>
                        <Box sx={{ textAlign: 'center' }}>
                          <EventBusyIcon sx={{ fontSize: 48, color: (t: Theme) => alpha(t.palette.text.disabled, 0.2), mb: 2 }} />
                          <Typography variant="h6" sx={{ fontWeight: 700, color: "text.secondary", mb: 0.5 }}>
                            {searchQuery ? 'Sin resultados' : activeTab !== TAB_ALL ? `No hay citas ${activeTab === 'pendiente' ? 'pendientes' : 'realizadas'}` : 'Día sin compromisos'}
                          </Typography>
                          <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                            {searchQuery ? 'Intenta con otro término de búsqueda' : activeTab !== TAB_ALL ? 'No hay citas en este estado para esta fecha' : 'No hay citas agendadas para esta fecha'}
                          </Typography>
                          <Button variant="outlined" startIcon={<AddIcon />} onClick={openNewForm} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                            Agendar Cita
                          </Button>
                        </Box>
                      </Fade>
                    </TableCell>
                  </TableRow>
                ) : sortedItems.map((c) => {
                  const est = ESTADOS_CITA.find((e) => e.value === c.estado) || ESTADOS_CITA[0];
                    const especieConf = (ESPECIE_CONFIG as any)[c.especie] || ESPECIE_CONFIG.Otro;
                  const isPast = c.estado === 'pendiente' && selectedDate < toISODate();
                  return (
                    <TableRow
                      key={c.id}
                      hover
                      sx={{
                        transition: 'background-color 0.2s',
                        bgcolor: isPast ? (t) => alpha(t.palette.grey[500], 0.04) : undefined,
                        '&:last-child td': { borderBottom: 'none' },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{
                            width: 36, height: 36,
                            bgcolor: (t) => alpha(especieConf.color, 0.12),
                            color: especieConf.color,
                            fontWeight: 700, fontSize: '1rem',
                            '&:hover': { transform: 'scale(1.05)' },
                          }}>
                            {especieConf.icon}
                          </Avatar>
                          <Box>
                            <Typography
                              onClick={() => navigate(`/historial/${c.mascota_id}`)}
                              sx={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem', lineHeight: 1.3, '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}
                            >
                              {c.mascota_nombre}
                            </Typography>
                            <Chip label={c.especie} size="small" sx={{
                              height: 18, fontSize: '0.62rem', fontWeight: 600,
                              bgcolor: (t) => alpha(especieConf.color, 0.1),
                              color: especieConf.color,
                              mt: 0.3,
                            }} />
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <AccessTimeIcon sx={{ fontSize: '0.8rem', color: 'text.disabled' }} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: c.hora ? 'primary.main' : 'text.disabled' }}>
                            {formatHora(c.hora)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{c.motivo || '—'}</Typography>
                        {c.notas && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3, fontSize: '0.72rem', opacity: 0.7, fontStyle: 'italic', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.notas}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="Click para cambiar estado">
                          <Chip
                            label={est.label}
                            icon={est.value === 'pendiente' ? <AccessTimeIcon sx={{ fontSize: '0.85rem !important' }} /> : est.value === 'realizada' ? <CheckCircleIcon sx={{ fontSize: '0.85rem !important' }} /> : <CancelIcon sx={{ fontSize: '0.85rem !important' }} />}
                            onClick={() => handleToggleEstado(c)}
                            sx={{
                              cursor: 'pointer', fontWeight: 700, fontSize: '0.72rem',
                              borderRadius: 2, textTransform: 'none',
                              bgcolor: (t) => alpha((t.palette as any)[est.color || 'primary'].main, 0.1),
                              color: (t) => (t.palette as any)[est.color || 'primary'].main,
                              border: (t) => `1px solid ${alpha((t.palette as any)[est.color || 'primary'].main, 0.2)}`,
                              '&:hover': { bgcolor: (t) => alpha((t.palette as any)[est.color || 'primary'].main, 0.18) }
                            }}
                          />
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.84rem' }}>{c.propietario_nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 0.3 }}>
                          {c.telefono}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                          <Tooltip title="Ver Detalle">
                            <IconButton size="small" onClick={() => { setShowTarget(c); setShowOpen(true); }} aria-label="Ver Detalle"
                              sx={{ color: 'info.main', bgcolor: (t) => alpha(t.palette.info.main, 0.06), borderRadius: 1.5 }}>
                              <VisibilityIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Duplicar">
                            <IconButton size="small" onClick={() => handleDuplicate(c)} aria-label="Duplicar"
                              sx={{ color: 'success.main', bgcolor: (t) => alpha(t.palette.success.main, 0.06), borderRadius: 1.5, '&:hover': { bgcolor: (t) => alpha(t.palette.success.main, 0.12) } }}>
                              <ContentCopyIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => handleEdit(c)} aria-label="Editar"
                              sx={{ color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.06), borderRadius: 1.5, '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12) } }}>
                              <EditIcon sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cancelar cita">
                            <IconButton size="small" onClick={() => setDeleteTarget(c)} aria-label="Cancelar cita"
                              sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.06), borderRadius: 1.5, '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.12) } }}>
                              <DeleteIcon sx={{ fontSize: '1.1rem' }} />
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
        </Paper>
      ) : (
        <Box>
          <Paper sx={{
            p: 2, borderRadius: 3, border: '1px solid', borderColor: (t) => alpha(t.palette.divider, 0.1),
            boxShadow: (t) => `0 2px 12px ${alpha(t.palette.common.black, 0.04)}`,
          }}>
            <CalendarGrid
              currentMonth={calendarMonth}
              currentYear={calendarYear}
              selectedDate={selectedDate}
              monthData={monthData}
              onSelectDay={handleSelectDay}
              onPrevMonth={() => { setCalendarMonth((m) => { if (m === 1) setCalendarYear((y) => y - 1); return m === 1 ? 12 : m - 1; }); }}
              onNextMonth={() => { setCalendarMonth((m) => { if (m === 12) setCalendarYear((y) => y + 1); return m === 12 ? 1 : m + 1; }); }}
              onToday={() => { const n = new Date(); setSelectedDate(toISODate(n)); setCalendarYear(n.getFullYear()); setCalendarMonth(n.getMonth() + 1); }}
            />
          </Paper>

          <Paper sx={{
            mt: 2, borderRadius: 3, border: '1px solid', borderColor: (t) => alpha(t.palette.divider, 0.1),
            boxShadow: (t) => `0 2px 12px ${alpha(t.palette.common.black, 0.04)}`, overflow: 'hidden'
          }}>
            <Box sx={{ px: 2.5, py: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CalendarMonthIcon sx={{ fontSize: 20, color: 'primary.main' }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'capitalize' }}>
                  {selectedDayName}
                </Typography>
                <Chip label={`${citas.length} cita${citas.length !== 1 ? 's' : ''}`} size="small"
                  sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main', borderRadius: 1, fontSize: '0.7rem' }} />
              </Box>
              {citas.length > 0 && (
                <Tooltip title="Exportar Agenda">
                  <IconButton size="small" onClick={() => {
                    generateCitasPDF(citas)
                      .then((saved) => { if (saved) notify('Reporte generado'); })
                      .catch((err) => notify('Error al generar PDF: ' + (err instanceof Error ? err.message : String(err)), 'error'));
                  }} aria-label="Exportar Agenda"
                    sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.08), borderRadius: 1.5 }}>
                    <PictureAsPdfIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>Hora</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>Paciente</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }}>Motivo</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }} align="center">Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', py: 1.5 }} align="center">Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <SkeletonTable rows={3} cols={5} />
                  ) : citas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ py: 6 }}>
                        <Box sx={{ textAlign: 'center' }}>
                          <EventBusyIcon sx={{ fontSize: 36, color: (t: Theme) => alpha(t.palette.text.disabled, 0.2), mb: 1.5 }} />
                          <Typography variant="body1" sx={{ fontWeight: 700, color: "text.secondary" }}>Sin citas este día</Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ) : citas.map((c) => {
                    const est = ESTADOS_CITA.find((e) => e.value === c.estado) || ESTADOS_CITA[0];
                  const especieConf = (ESPECIE_CONFIG as any)[c.especie] || ESPECIE_CONFIG.Otro;
                    return (
                      <TableRow key={c.id} hover sx={{ '&:last-child td': { borderBottom: 'none' } }}>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "primary.main" }}>
                            {formatHora(c.hora)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 32, height: 32, bgcolor: (t) => alpha(especieConf.color, 0.12), color: especieConf.color, fontSize: '0.85rem' }}>
                              {especieConf.icon}
                            </Avatar>
                            <Box>
                              <Typography
                                onClick={() => navigate(`/historial/${c.mascota_id}`)}
                                sx={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.84rem', '&:hover': { color: 'primary.main', textDecoration: 'underline' } }}
                              >
                                {c.mascota_nombre}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">{c.propietario_nombre}</Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.motivo || '—'}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={est.label}
                            size="small"
                            icon={est.value === 'pendiente' ? <AccessTimeIcon sx={{ fontSize: '0.75rem !important' }} /> : est.value === 'realizada' ? <CheckCircleIcon sx={{ fontSize: '0.75rem !important' }} /> : <CancelIcon sx={{ fontSize: '0.75rem !important' }} />}
                            onClick={() => handleToggleEstado(c)}
                            sx={{
                              cursor: 'pointer', fontWeight: 700, fontSize: '0.68rem',
                              borderRadius: 1.5, textTransform: 'none', height: 26,
                              bgcolor: (t) => alpha((t.palette as any)[est.color || 'primary'].main, 0.1),
                              color: (t) => (t.palette as any)[est.color || 'primary'].main,
                              border: (t) => `1px solid ${alpha((t.palette as any)[est.color || 'primary'].main, 0.2)}`,
                              '&:hover': { bgcolor: (t) => alpha((t.palette as any)[est.color || 'primary'].main, 0.18) }
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.3 }}>
                            <IconButton size="small" onClick={() => { setShowTarget(c); setShowOpen(true); }} aria-label="Ver Detalle"
                              sx={{ color: 'info.main', bgcolor: (t) => alpha(t.palette.info.main, 0.06), borderRadius: 1.5 }}>
                              <VisibilityIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          <IconButton size="small" onClick={() => handleDuplicate(c)} aria-label="Duplicar"
                            sx={{ color: 'success.main', bgcolor: (t) => alpha(t.palette.success.main, 0.06), borderRadius: 1.5 }}>
                            <ContentCopyIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleEdit(c)} aria-label="Editar"
                            sx={{ color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.06), borderRadius: 1.5 }}>
                            <EditIcon sx={{ fontSize: '1rem' }} />
                          </IconButton>
                            <IconButton size="small" onClick={() => setDeleteTarget(c)} aria-label="Cancelar cita"
                              sx={{ color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.06), borderRadius: 1.5 }}>
                              <DeleteIcon sx={{ fontSize: '1rem' }} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}

      <FormDialog
        open={open}
        onClose={() => { setOpen(false); setEditing(null); setErrors({}); }}
        onSave={handleSave}
        title={editing ? 'Actualizar Cita' : 'Nueva Cita Médica'}
        saving={saving}
        initialValues={form}
        validate={validate}
        submitLabel={editing ? 'Actualizar Cita' : 'Crear Cita'}
        maxWidth="sm"
      >
        {({ form: f, handleChange, errors: errs }) => <FormContent form={f} handleChange={handleChange} errors={errs} />}
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Cancelar Cita"
        message={`¿Estás seguro de que deseas cancelar la cita de "${deleteTarget?.mascota_nombre}"? Podrás deshacer la acción en los próximos segundos si te equivocas.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={!!pendingToggle}
        title="Cambiar estado de la cita"
        message="Al quitar el estado 'Realizada' se eliminará el historial médico auto-generado de esta cita. ¿Desea continuar?"
        confirmLabel="Cambiar estado"
        onConfirm={() => { const t = pendingToggle; setPendingToggle(null); doToggleEstado(t); }}
        onCancel={() => setPendingToggle(null)}
      />
      <ShowDialog
        open={showOpen}
        onClose={() => { setShowOpen(false); setShowTarget(null); }}
        onEdit={() => { if (showTarget) handleEdit(showTarget); }}
        title="Detalle de la Cita"
        headerExtra={
          showTarget?.mascota_id ? (
            <Tooltip title="Ver Historial Clínico">
              <IconButton size="small" onClick={() => { setShowOpen(false); navigate(`/historial/${showTarget.mascota_id}`); }} sx={{ color: 'secondary.main' }}>
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined
        }
        fields={[
          { label: 'Paciente', value: (
            <Typography
              onClick={() => { setShowOpen(false); navigate(`/historial/${showTarget?.mascota_id}`); }}
              sx={{ cursor: 'pointer', fontWeight: 600, color: 'primary.main', '&:hover': { textDecoration: 'underline' } }}
            >
              {showTarget?.mascota_nombre}
            </Typography>
          )},
          { label: 'Especie', value: showTarget?.especie },
          { label: 'Fecha', value: showTarget?.fecha },
          { label: 'Hora', value: showTarget?.hora ? showTarget.hora.slice(0, 5) : null },
          { label: 'Motivo', value: showTarget?.motivo },
          { label: 'Estado', value: ESTADOS_CITA.find((e) => e.value === showTarget?.estado)?.label ?? showTarget?.estado },
          { label: 'Propietario', value: showTarget?.propietario_nombre },
          { label: 'Teléfono', value: showTarget?.telefono },
          { label: 'Notas', value: showTarget?.notas },
        ]}
      />
    </Box>
  );
}

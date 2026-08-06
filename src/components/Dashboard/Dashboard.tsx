import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import QuickActionsPanel from './QuickActionsPanel';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Skeleton, useTheme, Tooltip, IconButton, Divider, Alert, AlertTitle, alpha, TextField, Button, Avatar,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import PeopleIcon from '@mui/icons-material/People';
import PetsIcon from '@mui/icons-material/Pets';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningIcon from '@mui/icons-material/Warning';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNotification } from '../shared/NotificationContext';
import { MESES, TIPOS_HISTORIAL } from '../../constants';
import { toISODate } from '../../utils/date';

const PIE_COLORS = ['#6366f1', '#06b6d4', '#f59e0b', '#f43f5e', '#a855f7', '#10b981'];
const POLL_INTERVAL = 30000;

const RANGES = [
  { label: 'Hoy', days: 0 },
  { label: '7 días', days: 6 },
  { label: 'Este mes', month: true },
  { label: 'Este año', year: true },
  { label: 'Todo', all: true },
];

const GRADIENT_CARDS = [
  { icon: <PeopleIcon />, label: 'Propietarios', key: 'propietarios', gradient: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', accent: '#6366f1' },
  { icon: <PetsIcon />, label: 'Mascotas', key: 'mascotas', gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', accent: '#06b6d4' },
  { icon: <MedicalServicesIcon />, label: 'Consultas', key: 'consultas', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', accent: '#f59e0b' },
  { icon: <CalendarTodayIcon />, label: 'Vacunas', key: 'vacunas', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', accent: '#10b981' },
];

function StatCard({ icon, label, value, gradient, accent, onClick, loading }: any) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  if (loading) {
    return (
      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, p: 3 }}>
          <Skeleton variant="circular" width={60} height={60} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="text" width="60%" height={20} />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: isDark ? alpha(theme.palette.background.paper, 0.4) : '#ffffff',
        border: `1px solid ${alpha(accent, 0.12)}`,
        borderRadius: 4,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-6px)',
          borderColor: alpha(accent, 0.4),
          boxShadow: `0 20px 40px -12px ${alpha(accent, 0.25)}`,
        },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, p: 3, position: 'relative', zIndex: 1 }}>
        <Box
          sx={{
            width: 60, height: 60, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: `linear-gradient(135deg, ${alpha(accent, 0.15)}, ${alpha(accent, 0.05)})`,
            color: accent,
            boxShadow: `0 8px 20px -6px ${alpha(accent, 0.2)}`,
            '& .MuiSvgIcon-root': { fontSize: 32 },
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, mb: 0.5, color: isDark ? '#fff' : 'text.primary' }}>
            {value ?? 0}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, opacity: 0.8 }}>
            {label}
          </Typography>
        </Box>
      </CardContent>
      <Box sx={{
        position: 'absolute', right: -10, bottom: -10,
        opacity: 0.03, transform: 'rotate(-15deg)',
        '& .MuiSvgIcon-root': { fontSize: 100, color: accent }
      }}>
        {icon}
      </Box>
    </Card>
  );
}

function AlertCard({ icon, label, value, color, onClick }: any) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 4,
        border: `1px solid ${alpha(color, 0.1)}`,
        background: (theme) => alpha(color, theme.palette.mode === 'dark' ? 0.08 : 0.04),
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          borderColor: alpha(color, 0.3),
          background: (theme) => alpha(color, theme.palette.mode === 'dark' ? 0.12 : 0.06),
          boxShadow: `0 12px 24px -8px ${alpha(color, 0.2)}`,
        },
      }}
    >
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2.5, p: '20px !important' }}>
        <Box sx={{
          width: 48, height: 48, borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: alpha(color, 0.15), color: color,
        }}>
          {React.cloneElement(icon, { sx: { fontSize: 24 } })}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color, lineHeight: 1.2 }}>{value}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>{label}</Typography>
        </Box>
        <ArrowForwardIcon sx={{ color: alpha(color, 0.4), fontSize: 20 }} />
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const navigate = useNavigate();
  const notif = useNotification();
  const theme = useTheme();
  const pollRef = useRef<any>(null);
  const isDark = theme.palette.mode === 'dark';

  const load = useCallback(async () => {
    try {
      const params: Record<string, any> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const data = await window.api.getDashboardSummary(params);
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      notif?.notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [notif, startDate, endDate]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, POLL_INTERVAL);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const applyRange = (r: (typeof RANGES)[number]) => {
    const now = new Date();
    if (r.all) { setStartDate(''); setEndDate(''); return; }
    if (r.year) { setStartDate(`${now.getFullYear()}-01-01`); setEndDate(''); return; }
    if (r.month) { setStartDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`); setEndDate(''); return; }
    const d = new Date(now);
    d.setDate(d.getDate() - (r.days || 0));
    setStartDate(toISODate(d));
    setEndDate('');
  };

  const activeRange = (r: (typeof RANGES)[number]) => {
    if (r.all) return !startDate && !endDate;
    if (r.year) return startDate === `${new Date().getFullYear()}-01-01` && !endDate;
    if (r.month) return startDate === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01` && !endDate;
    const d = new Date();
    d.setDate(d.getDate() - (r.days || 0));
    return startDate === toISODate(d) && !endDate;
  };

  const updatedLabel = (() => {
    if (!lastUpdated) return null;
    const diff = Math.max(0, Math.floor((nowTick - lastUpdated.getTime()) / 1000));
    if (diff < 5) return 'Actualizado ahora';
    if (diff < 60) return `Actualizado hace ${diff}s`;
    return `Actualizado hace ${Math.floor(diff / 60)}m`;
  })();

  const filledMonths = useMemo(() => {
    const data = summary?.consultasPorMes || [];
    if (data.length === 0) return [];
    const keys = data.map((d: any) => d.mes).sort();
    let [cur, max] = [keys[0], keys[keys.length - 1]];
    const result: Array<{ mes: string; total: number }> = [];
    while (cur <= max) {
      const found = data.find((d: any) => d.mes === cur);
      result.push(found || { mes: cur, total: 0 });
      const [y, m] = cur.split('-').map(Number);
      cur = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
    }
    return result;
  }, [summary]);

  const cards = GRADIENT_CARDS.map(({ key, ...c }) => ({
    ...c,
    value: summary?.[key] ?? 0,
    onClick: key === 'propietarios' ? () => navigate('/propietarios')
      : key === 'mascotas' ? () => navigate('/mascotas')
      : undefined,
  }));

  const alertCards = [];
  if ((summary?.inventarioBajo ?? 0) > 0) {
    alertCards.push({ label: 'Productos con bajo stock', value: summary.inventarioBajo, icon: <WarningIcon />, color: '#f59e0b', onClick: () => navigate('/inventario') });
  }
  if ((summary?.citasPendientes ?? 0) > 0) {
    alertCards.push({ label: 'Citas para hoy', value: summary.citasPendientes, icon: <CalendarTodayIcon />, color: '#6366f1', onClick: () => navigate('/citas') });
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 5, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.05em', color: 'text.primary', mb: 0.5 }}>
            Resumen Operativo
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
            Vista general del estado de la clínica
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <QuickActionsPanel />
        </Box>
      </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', bgcolor: alpha(theme.palette.divider, 0.03), p: 1.5, borderRadius: 4, border: `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            {RANGES.map((r) => (
              <Chip
                key={r.label}
                label={r.label}
                size="small"
                onClick={() => applyRange(r)}
                variant={activeRange(r) ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 700, fontSize: '0.72rem', borderRadius: 2,
                  bgcolor: activeRange(r) ? (t) => alpha(t.palette.primary.main, 0.12) : 'transparent',
                  color: activeRange(r) ? 'primary.main' : 'text.secondary',
                  borderColor: (t) => activeRange(r) ? alpha(t.palette.primary.main, 0.5) : alpha(t.palette.divider, 0.3),
                }}
              />
            ))}
          </Box>
          <TextField 
            type="date" 
            size="small" 
            label="Desde" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'transparent' }, width: 160 }}
          />
          <TextField 
            type="date" 
            size="small" 
            label="Hasta" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'transparent' }, width: 160 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
            {updatedLabel}
          </Typography>
          <Tooltip title="Refrescar">
            <IconButton onClick={load} aria-label="Refrescar" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

      <Grid container spacing={3} sx={{ mb: 5 }}>
        {cards.map((card) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
            <StatCard {...card} loading={loading} />
          </Grid>
        ))}
      </Grid>

      {alertCards.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {alertCards.map((a) => (
            <Grid size={{ xs: 12, sm: 6 }} key={a.label}>
              <AlertCard {...a} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={4}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper sx={{ p: 3, borderRadius: 3, minHeight: 440, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>        
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Consultas Mensuales</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={filledMonths[filledMonths.length - 1]?.mes.slice(0, 4) || String(new Date().getFullYear())} size="small" sx={{ fontWeight: 700, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }} />
              </Box>
            </Box>
            <Box sx={{ width: '100%', height: 360 }}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={filledMonths} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={1} />
                      <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="mes"
                    tickFormatter={(v) => { const [, m] = v.split('-'); return MESES[parseInt(m) - 1]?.slice(0, 3) || v; }}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: theme.palette.text.secondary }}
                    dy={10}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: theme.palette.text.secondary }}
                  />
                  <ReTooltip
                    cursor={{ fill: alpha(theme.palette.divider, 0.05), radius: 8 }}
                    contentStyle={{
                      borderRadius: 16,
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      padding: '12px 16px',
                      backgroundColor: isDark ? '#1e293b' : '#fff'
                    }}
                    labelStyle={{ fontWeight: 800, marginBottom: 4, color: theme.palette.text.primary }}        
                  />
                  <Bar dataKey="total" fill="url(#barGradient)" radius={[8, 8, 0, 0]} maxBarSize={45} />        
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3, minHeight: 440, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Distribución por Especie</Typography>      
            <Box sx={{ width: '100%', height: 360, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={360}>
                <PieChart>
                  <Pie
                    data={summary?.mascotasPorEspecie}
                    dataKey="total"
                    nameKey="especie"
                    cx="50%" cy="45%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    stroke="none"
                  >
                    {summary?.mascotasPorEspecie?.map((_: any, idx: number) => (
                      <Cell key={`cell-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip
                    contentStyle={{
                      borderRadius: 16,
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                      backgroundColor: isDark ? '#1e293b' : '#fff'
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, mt: 2 }}>   
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 8, height: 24, borderRadius: 1, bgcolor: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Actividad Reciente</Typography>
            </Box>
            <Button size="small" variant="text" sx={{ fontWeight: 700 }} onClick={() => navigate('/auditoria')}>Ver todo</Button>
          </Box>
          <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden', border: `1px solid ${alpha(theme.palette.divider, 0.05)}`, boxShadow: 'none' }}>
            <Table>
              <TableHead sx={{ bgcolor: alpha(theme.palette.divider, 0.02) }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', pl: 3 }}>FECHA</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>PACIENTE</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary' }}>TIPO</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.secondary', pr: 3 }}>DETALLES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary?.recent?.map((r: any) => {
                  const tipo = TIPOS_HISTORIAL.find((t) => t.value === r.tipo);
                  return (
                    <TableRow key={r.id} hover sx={{ cursor: 'pointer', transition: 'background-color 0.2s' }} onClick={() => navigate(`/historial/${r.mascota_id}`)}>
                      <TableCell sx={{ pl: 3 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{new Date(r.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontSize: '0.8rem', fontWeight: 800 }}>
                            {r.mascota_nombre?.[0]}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.mascota_nombre}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={tipo?.label || r.tipo} 
                          size="small" 
                          sx={{ 
                            fontWeight: 700, 
                            fontSize: '0.7rem',
                            bgcolor: alpha((theme.palette as any)[tipo?.color || 'primary'].main, 0.12),
                            color: (theme.palette as any)[tipo?.color || 'primary'].main,
                            borderRadius: 1.5
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ pr: 3 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }} noWrap>{r.descripcion}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 3, mt: 2, height: '100%', display: 'flex', flexDirection: 'column', border: `1px solid ${alpha(theme.palette.divider, 0.05)}`, boxShadow: 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 8, height: 24, borderRadius: 1, bgcolor: 'success.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Próximas vacunas</Typography>
              </Box>
              <MedicalServicesIcon sx={{ color: 'success.main', fontSize: 22 }} />
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', maxHeight: 420 }}>
              {(summary?.upcomingVaccines ?? []).length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <CheckCircleIcon sx={{ fontSize: 40, color: alpha(theme.palette.success.main, 0.3), mb: 1 }} />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Sin vacunas por vencer en los próximos 30 días
                  </Typography>
                </Box>
              ) : (
                (summary?.upcomingVaccines ?? []).map((v: any) => {
                  const vencida = v.proxima_dosis && new Date(v.proxima_dosis) < new Date();
                  return (
                    <Box key={v.id} onClick={() => navigate(`/historial/${v.mascota_id}`)} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, cursor: 'pointer', mb: 1, transition: 'background-color 0.2s', '&:hover': { bgcolor: alpha(theme.palette.divider, 0.06) } }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', fontSize: '0.9rem', fontWeight: 800 }}>
                        {v.mascota_nombre?.[0]}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.mascota_nombre}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          Próx. dosis: {v.proxima_dosis ? new Date(v.proxima_dosis).toLocaleDateString() : '—'}
                        </Typography>
                      </Box>
                      {vencida && <Chip size="small" label="Vencida" color="error" sx={{ fontWeight: 700, fontSize: '0.62rem' }} />}
                    </Box>
                  );
                })
              )}
            </Box>
            <Button size="small" variant="text" sx={{ fontWeight: 700, mt: 1, alignSelf: 'flex-start' }} onClick={() => navigate('/historial')}>
              Ver historial clínico
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

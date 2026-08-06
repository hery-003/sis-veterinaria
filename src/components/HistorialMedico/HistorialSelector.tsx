import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, InputAdornment, Typography, Avatar, Chip, Grid, Button, alpha, useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import PetsIcon from '@mui/icons-material/Pets';
import ListAltIcon from '@mui/icons-material/ListAlt';
import { useDebounce } from '../../hooks';
import EmptyState from '../shared/EmptyState';
import { getPhotoDataUrl } from '../../utils/photoCache';
import PageHeader from '../shared/PageHeader';

export default function HistorialSelector() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [mascotas, setMascotas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [photos, setPhotos] = useState<Record<number, string | null>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await window.api.getMascotas({ page: 1, limit: 100 });
      setMascotas(res?.data || []);
    } catch (err) {
      console.error('[Historial] Error cargando mascotas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<number, string | null> = {};
      for (const m of mascotas) {
        if (m.foto) {
          try {
            const url = await getPhotoDataUrl(m.foto);
            if (!cancelled) next[m.id] = url;
          } catch { next[m.id] = null; }
        } else {
          next[m.id] = null;
        }
      }
      if (!cancelled) setPhotos(next);
    })();
    return () => { cancelled = true; };
  }, [mascotas]);

  const filtered = useMemo(
    () => mascotas.filter(
      (m: any) =>
        !search ||
        m.nombre?.toLowerCase().includes(search.toLowerCase()) ||
        m.especie?.toLowerCase().includes(search.toLowerCase()) ||
        m.raza?.toLowerCase().includes(search.toLowerCase()) ||
        m.propietario_nombre?.toLowerCase().includes(search.toLowerCase())
    ),
    [mascotas, search]
  );

  return (
    <Box>
      <PageHeader
        icon={<MedicalServicesIcon />}
        title="Historial Clínico"
        subtitle="Selecciona un paciente para ver su evolución médica"
        gradient="info"
        badge={
          <Chip
            label={`${mascotas.length} paciente${mascotas.length !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.info.main, 0.1), color: 'info.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<ListAltIcon />}
              onClick={() => navigate('/historial/todos')}
              sx={{ borderRadius: 3, fontWeight: 700, mr: 1 }}
            >
              Todos los historiales
            </Button>
            <TextField
              size="small"
              placeholder="Buscar paciente..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ borderRadius: 3, width: 260, bgcolor: (t) => alpha(t.palette.divider, 0.02), '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment>,
                }
              }}
            />
          </>
        }
      />

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <Typography color="text.secondary">Cargando pacientes...</Typography>
        </Box>
      ) : filtered.length === 0 ? (
        <Paper sx={{ borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}>
          <Box sx={{ py: 10 }}>
            <EmptyState
              icon={<PetsIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
              title={search ? 'Sin resultados' : 'Sin pacientes'}
              search={search ? `Sin pacientes para "${search}"` : 'Registra una mascota primero para poder consultar su historial.'}
            />
          </Box>
        </Paper>
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map((m: any) => {
            const gradient = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.info.main})`;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={m.id}>
                <Paper
                  onClick={() => navigate(`/historial/${m.id}`)}
                  sx={{
                    p: 2.5, borderRadius: 3, cursor: 'pointer', height: '100%',
                    border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`,
                    boxShadow: 'none',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: (t) => `0 12px 28px -12px ${alpha(t.palette.primary.main, 0.35)}`,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={photos[m.id] ?? undefined}
                      sx={{
                        width: 56, height: 56, fontSize: 24, fontWeight: 800,
                        background: gradient,
                        boxShadow: (t) => `0 8px 18px -6px ${alpha(t.palette.primary.main, 0.5)}`,
                      }}
                    >
                      {m.nombre?.[0]?.toUpperCase()}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.nombre}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        {m.especie}{m.raza ? ` · ${m.raza}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      label="Ver historial"
                      sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.info.main, 0.1), color: 'info.main', borderRadius: 1.5 }}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontWeight: 600 }}>
                    Propietario: <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>{m.propietario_nombre || '-'}</Box>
                  </Typography>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, InputAdornment, IconButton, Paper, List, ListItemButton,
  ListItemText, ListItemAvatar, Avatar, Typography, Chip, ClickAwayListener, alpha,
  useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import PetsIcon from '@mui/icons-material/Pets';
import PeopleIcon from '@mui/icons-material/People';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import type { SxProps, Theme } from '@mui/material';

interface SearchItem {
  id: number;
  nombre?: string;
  descripcion?: string;
  cedula?: string;
  especie?: string;
  mascota_nombre?: string;
  mascota_id?: number;
}

interface SearchResults {
  propietarios: SearchItem[];
  mascotas: SearchItem[];
  historial: SearchItem[];
}

const TYPE_CONFIG: Record<string, { icon: React.ReactElement; color: string; label: string }> = {
  propietarios: { icon: <PeopleIcon />, color: '#6366f1', label: 'Propietario' },
  mascotas: { icon: <PetsIcon />, color: '#06b6d4', label: 'Mascota' },
  historial: { icon: <MedicalServicesIcon />, color: '#f59e0b', label: 'Historial' },
};

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>({ propietarios: [], mascotas: [], historial: [] });
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const theme = useTheme();

  const handleSearch = (value: string) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults({ propietarios: [], mascotas: [], historial: [] });
      setOpen(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const sanitized = value.trim().replace(/[<>"'&]/g, '');
        const data = await window.api.globalSearch(sanitized);
        setResults(data);
        setOpen(true);
      } catch {
        setResults({ propietarios: [], mascotas: [], historial: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (type: string, item: SearchItem) => {
    setOpen(false);
    setQuery('');
    setResults({ propietarios: [], mascotas: [], historial: [] });
    if (type === 'mascotas') navigate(`/historial/${item.id}`);
    else if (type === 'propietarios') navigate(`/mascotas/${item.id}`);
    else if (type === 'historial') navigate(`/historial/${item.mascota_id}`);
  };

  const totalResults = results.propietarios.length + results.mascotas.length + results.historial.length;

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box sx={{ position: 'relative', width: { xs: '100%', sm: 280, md: 340 } }}>
        <TextField
          size="small"
          placeholder="Buscar pacientes o dueños..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (totalResults > 0) setOpen(true); }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              bgcolor: (t: Theme) => alpha(t.palette.divider, 0.04),
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: (t: Theme) => alpha(t.palette.divider, 0.08) },
              '& fieldset': { borderColor: 'transparent' },
              '&.Mui-focused fieldset': { borderColor: (t: Theme) => alpha(t.palette.primary.main, 0.3), borderWidth: 1 },
            },
          } as SxProps}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'primary.main', opacity: 0.7 }} />
                </InputAdornment>
              ),
              endAdornment: query ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => { setQuery(''); setResults({ propietarios: [], mascotas: [], historial: [] }); setOpen(false); }} aria-label="Limpiar búsqueda">
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }
          }}
        />
        {open && totalResults > 0 && (
          <Paper sx={{
            position: 'absolute', top: '115%', left: 0, right: 0, zIndex: 1400,
            borderRadius: 4, maxHeight: 440, overflow: 'hidden',
            border: (t: Theme) => `1px solid ${alpha(t.palette.divider, 0.1)}`,
            boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column'
          }}>
            <Box sx={{ overflowY: 'auto', p: 1 }}>
              {(Object.keys(TYPE_CONFIG) as string[]).map((type) => {
                const items = results[type as keyof SearchResults];
                if (!items.length) return null;
                const cfg = TYPE_CONFIG[type];
                return (
                  <Box key={type} sx={{ mb: 1 }}>
                    <Typography variant="overline" sx={{ px: 2, py: 1, display: 'block', color: 'text.disabled', fontWeight: 800, fontSize: '0.65rem' }}>
                      {cfg.label}
                    </Typography>
                    <List dense disablePadding>
                      {items.map((item) => (
                        <ListItemButton
                          key={item.id}
                          onClick={() => handleSelect(type, item)}
                          sx={{
                            borderRadius: 2,
                            mx: 0.5,
                            mb: 0.2,
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: alpha(cfg.color, 0.08) }
                          }}
                        >
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{
                              width: 32, height: 32,
                              bgcolor: alpha(cfg.color, 0.1),
                              color: cfg.color,
                              fontSize: 16,
                              border: `1px solid ${alpha(cfg.color, 0.2)}`
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', '& svg': { fontSize: 18 } }}>
                                {cfg.icon}
                              </Box>
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={item.nombre || item.descripcion}
                            slotProps={{
                              primary: { variant: 'body2' as const, sx: { fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                              secondary: { variant: 'caption' as const, sx: { fontWeight: 600, opacity: 0.7, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            }}
                            secondary={item.cedula || item.especie || item.mascota_nombre || ''}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ p: 1.5, bgcolor: (t: Theme) => alpha(t.palette.divider, 0.02), borderTop: (t: Theme) => `1px solid ${alpha(t.palette.divider, 0.05)}`, textAlign: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                {totalResults} resultados encontrados
              </Typography>
            </Box>
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}

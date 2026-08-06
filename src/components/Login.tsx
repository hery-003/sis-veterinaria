import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, TextField, Button, Typography, Alert, CircularProgress, InputAdornment, useTheme, alpha,
} from '@mui/material';
import PetsIcon from '@mui/icons-material/Pets';
import fondo from '../assets/fondo-veterinaria.jpg';
import pkg from '../../package.json';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth() ?? { login: async () => null };
  const navigate = useNavigate();
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme.palette.mode === 'dark';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user) navigate('/dashboard', { replace: true });
      else setError('Credenciales incorrectas. Verifique e intente nuevamente.');
    } catch (err) {
      setError((err instanceof Error ? err.message : String(err)) || 'Error de conexión con el servidor local');
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDark ? alpha('#fff', 0.02) : alpha('#6366f1', 0.03),
      borderRadius: 3,
      '& input': { 
        color: isDark ? '#fff' : 'text.primary',
        fontWeight: 600,
        fontSize: '0.95rem'
      },
      '& fieldset': { borderColor: isDark ? alpha('#818cf8', 0.15) : alpha('#6366f1', 0.12) },
      '&:hover fieldset': { borderColor: isDark ? alpha('#818cf8', 0.35) : alpha('#6366f1', 0.25) },
      '&.Mui-focused fieldset': { borderWidth: 2, borderColor: 'primary.main' },
    },
    '& .MuiInputLabel-root': { fontWeight: 600, color: 'text.secondary' },
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${fondo})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      },
      '&::after': {
        content: '""',
        position: 'absolute',
        inset: 0,
        background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)',
      },
    }}>

      <Paper sx={{
        p: { xs: 4, sm: 6 }, 
        width: 440, 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        borderRadius: 6, 
        position: 'relative', 
        zIndex: 1,
        overflow: 'hidden',
        bgcolor: (t) => alpha(t.palette.background.paper, 0.75),
        backdropFilter: 'blur(24px)',
        border: (t) => `1px solid ${alpha(t.palette.divider, 0.1)}`,
        boxShadow: (t) => isDark 
          ? '0 40px 100px -20px rgba(0,0,0,0.6)' 
          : '0 40px 100px -20px rgba(99,102,241,0.15)',
        animation: 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <Box sx={{
          width: 80, height: 80, borderRadius: 3.5,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)',
          mb: 3,
          boxShadow: '0 12px 30px -10px rgba(99,102,241,0.5)',
        }}>
          <PetsIcon sx={{ fontSize: 40, color: '#fff' }} />
        </Box>

        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 1
          }}
        >
          VetSystem
        </Typography>

        <Typography variant="body1" sx={{ mb: 4, fontWeight: 600, color: 'text.secondary', opacity: 0.8 }}>
          Portal de Gestión Clínica
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 3, borderRadius: 3, fontWeight: 600 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField
            label="Nombre de Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required autoFocus fullWidth
            sx={fieldSx}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><PersonIcon fontSize="small" color="primary" /></InputAdornment>,
              }
            }}
          />
          <TextField
            label="Contraseña" type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required fullWidth
            sx={fieldSx}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><LockIcon fontSize="small" color="primary" /></InputAdornment>,
              }
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            size="large" 
            fullWidth 
            disabled={loading} 
            sx={{
              py: 1.8, 
              fontSize: '1rem', 
              fontWeight: 800,
              borderRadius: 3.5, 
              mt: 1,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              boxShadow: '0 10px 25px -5px rgba(99,102,241,0.4)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: '0 15px 30px -5px rgba(99,102,241,0.5)',
                background: 'linear-gradient(135deg, #818cf8, #6366f1)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Acceder al Sistema'}
          </Button>
        </Box>

        <Box sx={{ mt: 5, pt: 3, borderTop: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, width: '100%', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            v{pkg.version} • Pro Edition
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
}

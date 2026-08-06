import React from 'react';
import { Button, Stack, alpha, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PetsIcon from '@mui/icons-material/Pets';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import { useNavigate } from 'react-router-dom';

const ACTIONS = [
  { label: 'Cita', icon: <CalendarMonthIcon />, path: '/citas' },
  { label: 'Mascota', icon: <PetsIcon />, path: '/mascotas' },
  { label: 'Propietario', icon: <PeopleIcon />, path: '/propietarios' },
  { label: 'Historial', icon: <MedicalServicesIcon />, path: '/historial' },
];

export default function QuickActionsPanel() {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Stack direction="row" spacing={1}>
      {ACTIONS.map((a) => (
        <Button
          key={a.label}
          size="small"
          startIcon={a.icon}
          onClick={() => navigate(a.path)}
          sx={{
            fontWeight: 700,
            textTransform: 'none',
            borderRadius: 3,
            color: 'text.primary',
            bgcolor: alpha(theme.palette.divider, 0.04),
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              borderColor: alpha(theme.palette.primary.main, 0.3),
            },
          }}
        >
          Nuevo {a.label}
        </Button>
      ))}
    </Stack>
  );
}

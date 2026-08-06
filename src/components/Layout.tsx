import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, IconButton, Button, Menu, MenuItem, Avatar, Badge,
  Breadcrumbs, Link, alpha, Tooltip, Divider, Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import PetsIcon from '@mui/icons-material/Pets';
import PeopleIcon from '@mui/icons-material/People';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import InventoryIcon from '@mui/icons-material/Inventory';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import BackupIcon from '@mui/icons-material/Backup';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyIcon from '@mui/icons-material/Key';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsIcon from '@mui/icons-material/Notifications';
import HistoryIcon from '@mui/icons-material/History';
import BugReportIcon from '@mui/icons-material/BugReport';
import { useAuth } from '../AuthContext';
import { useThemeMode } from '../ThemeContext';
import { useNotification } from './shared/NotificationContext';
import ChangePasswordDialog from './Usuarios/ChangePasswordDialog';
import BackupRestore from './shared/BackupRestore';
import GlobalSearch from './shared/GlobalSearch';

const drawerWidth = 260;
const miniDrawerWidth = 72;

const routeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  '/dashboard': { label: 'Dashboard', icon: <DashboardIcon sx={{ fontSize: 16 }} /> },
  '/mascotas': { label: 'Mascotas', icon: <PetsIcon sx={{ fontSize: 16 }} /> },
  '/propietarios': { label: 'Propietarios', icon: <PeopleIcon sx={{ fontSize: 16 }} /> },
  '/citas': { label: 'Citas', icon: <CalendarMonthIcon sx={{ fontSize: 16 }} /> },
  '/historial': { label: 'Historial Médico', icon: <MedicalServicesIcon sx={{ fontSize: 16 }} /> },
  '/inventario': { label: 'Inventario', icon: <InventoryIcon sx={{ fontSize: 16 }} /> },
  '/usuarios': { label: 'Usuarios', icon: <PersonIcon sx={{ fontSize: 16 }} /> },
  '/auditoria': { label: 'Auditoría', icon: <HistoryIcon sx={{ fontSize: 16 }} /> },
};

function getMenuItems(user: { rol?: string } | null | undefined) {
  const items = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Mascotas', icon: <PetsIcon />, path: '/mascotas' },
    { text: 'Propietarios', icon: <PeopleIcon />, path: '/propietarios' },
    { text: 'Citas', icon: <CalendarMonthIcon />, path: '/citas' },
    { text: 'Historial Médico', icon: <MedicalServicesIcon />, path: '/historial' },
    { text: 'Inventario', icon: <InventoryIcon />, path: '/inventario' },
  ];
  if (user?.rol === 'admin') {
    items.push({ text: 'Usuarios', icon: <PersonIcon />, path: '/usuarios' });
    items.push({ text: 'Auditoría', icon: <HistoryIcon />, path: '/auditoria' });
  }
  return items;
}

function BreadcrumbsNav({ location, onNavigate }: { location: ReturnType<typeof useLocation>; onNavigate: (path: string) => void }) {
  const pathParts = location.pathname.split('/').filter(Boolean);
  if (pathParts.length === 0 || pathParts[0] === 'dashboard') return null;

  return (
    <Breadcrumbs sx={{ mb: 2, '& .MuiBreadcrumbs-ol': { flexWrap: 'nowrap' } }}>
      <Link
        component="button"
        underline="hover"
        color="inherit"
        onClick={() => onNavigate('/dashboard')}
        sx={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}
      >
        <DashboardIcon sx={{ fontSize: 16 }} />
        Dashboard
      </Link>
      {pathParts.map((part, idx) => {
        const isLast = idx === pathParts.length - 1;
        const routeInfo = routeLabels[`/${part}`];
        const label = routeInfo?.label || (part.charAt(0).toUpperCase() + part.slice(1));
        const icon = routeInfo?.icon;

        if (isLast) {
          return (
            <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.85rem', fontWeight: 600, color: 'text.primary' }}>
              {icon}
              {label}
            </Box>
          );
        }
        return (
          <Link
            key={idx}
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => onNavigate(`/${part}`)}
            sx={{ fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 500 }}
          >
            {icon}
            {label}
          </Link>
        );
      })}
    </Breadcrumbs>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [miniSidebar, setMiniSidebar] = useState(false);
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null);
  const [changePwdOpen, setChangePwdOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [reminderCount, setReminderCount] = useState(0);
  const [reminders, setReminders] = useState<any>({ upcomingVaccines: [], pendingCitasToday: 0 });
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth() ?? { user: null, logout: () => {} };
  const { mode, toggleTheme } = useThemeMode() ?? { mode: 'light' as const, toggleTheme: () => {} };
  const notif = useNotification();
  const notify = notif?.notify ?? (() => {});

  useEffect(() => {
    if (!user) return;
    window.api.checkReminders().then((data) => {
      const overdueCount = (data?.upcomingVaccines ?? []).filter((v: any) => v.overdue).length;
      setReminderCount((data?.upcomingVaccines?.length ?? 0) + (data?.pendingCitasToday ?? 0) + (data?.upcomingDesparasitaciones?.length ?? 0));
      setReminders(data ?? { upcomingVaccines: [], pendingCitasToday: 0 });
      if (overdueCount > 0) {
        notify(`⚠️ ${overdueCount} vacuna(s) vencida(s) — revise el panel`, 'warning');
      }
      if ((data?.pendingCitasToday ?? 0) > 0) {
        notify(`📅 ${data.pendingCitasToday} cita(s) pendiente(s) para hoy`, 'info');
      }
    }).catch((err) => { console.warn('[Layout] Error loading reminders:', err); });
  }, [user]);

  const handleLogout = () => {
    setUserMenu(null);
    logout();
    navigate('/login');
  };

  const isSelected = (itemPath: string) => {
    if (itemPath === '/historial') return location.pathname.startsWith('/historial');
    return location.pathname.startsWith(itemPath);
  };

  const currentWidth = miniSidebar ? miniDrawerWidth : drawerWidth;

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'transparent' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: miniSidebar ? 'center' : 'flex-start', px: miniSidebar ? 0 : 2.5, minHeight: '80px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflow: 'hidden' }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 3,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
            color: '#fff', flexShrink: 0,
            boxShadow: '0 8px 16px -4px rgba(99,102,241,0.4)',
          }}>
            <PetsIcon sx={{ fontSize: 24 }} />
          </Box>
          {!miniSidebar && (
            <Typography variant="h6" noWrap sx={{ fontWeight: 800, letterSpacing: '-0.04em', background: 'linear-gradient(135deg, #6366f1, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              VetSystem
            </Typography>
          )}
        </Box>
      </Toolbar>
      
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {getMenuItems(user).map((item) => {
          const selected = isSelected(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                selected={selected}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                sx={{
                  borderRadius: 3,
                  px: miniSidebar ? 1 : 2,
                  minHeight: 48,
                  justifyContent: miniSidebar ? 'center' : 'flex-start',
                  transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, mode === 'dark' ? 0.15 : 0.08),
                    '& .MuiListItemIcon-root': { color: 'primary.main' },
                    '& .MuiListItemText-primary': { fontWeight: 700, color: 'primary.main' },
                  },
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    transform: 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: miniSidebar ? 0 : 36, 
                  color: selected ? 'primary.main' : 'text.secondary',
                  transition: 'color 0.2s ease'
                }}>
                  {item.icon}
                </ListItemIcon>
                {!miniSidebar && <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{item.text}</Typography>} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Box sx={{ p: 2, borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.05)}` }}>
        <ListItemButton
          onClick={() => setMiniSidebar(!miniSidebar)}
          sx={{ borderRadius: 3, justifyContent: miniSidebar ? 'center' : 'flex-start', minHeight: 48 }}
        >
          <ListItemIcon sx={{ minWidth: miniSidebar ? 0 : 36 }}>
            {miniSidebar ? <MenuIcon /> : <ChevronLeftIcon />}
          </ListItemIcon>
          {!miniSidebar && <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600 }}>Colapsar</Typography>} />}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
          backdropFilter: 'blur(12px)',
          borderBottom: (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          boxShadow: 'none',
          color: 'text.primary',
        }}
      >
        <Toolbar sx={{ minHeight: '80px !important', px: { xs: 2, sm: 4 } }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, mr: 1, ml: 'auto' }}>
            <GlobalSearch />
          </Box>

          <Typography variant="h6" noWrap sx={{ flexGrow: 1, fontWeight: 700, fontSize: '1.1rem', letterSpacing: '-0.02em' }}>
            {routeLabels[`/${location.pathname.split('/')[1] || ''}`]?.label || routeLabels[location.pathname]?.label || 'Sistema'}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ display: { xs: 'block', md: 'block' } }}>
              <GlobalSearch />
            </Box>

            <Tooltip title="Notificaciones">
              <IconButton size="small" aria-label="Notificaciones" onClick={(e) => setNotifAnchor(e.currentTarget)} sx={{ bgcolor: (theme) => alpha(theme.palette.divider, 0.05) }}>
                <Badge badgeContent={reminderCount} color="error">
                  <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
            </Tooltip>
            <Menu
              anchorEl={notifAnchor}
              open={!!notifAnchor}
              onClose={() => setNotifAnchor(null)}
              slotProps={{
                paper: { sx: { mt: 1.5, minWidth: 320, maxWidth: 380, borderRadius: 3, boxShadow: (theme) => theme.shadows[3], p: 1.5 } }
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, px: 1, pb: 1 }}>
                Notificaciones
              </Typography>
              {reminderCount === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 1, py: 2, textAlign: 'center', fontWeight: 600 }}>
                  No hay notificaciones pendientes
                </Typography>
              ) : (
                <Box>
                  {reminders.pendingCitasToday > 0 && (
                    <MenuItem dense onClick={() => { setNotifAnchor(null); navigate('/citas'); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon><CalendarMonthIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary="Citas pendientes hoy"
                        secondary={`${reminders.pendingCitasToday} cita(s) por atender`}
                      />
                    </MenuItem>
                  )}
                  {(reminders.upcomingVaccines ?? []).map((v: any) => (
                    <MenuItem key={v.id} dense onClick={() => { setNotifAnchor(null); navigate(`/historial/${v.mascota_id}`); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon><MedicalServicesIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary={`Vacuna: ${v.mascota_nombre}`}
                        secondary={`Próxima dosis: ${v.proxima_dosis ? new Date(v.proxima_dosis).toLocaleDateString() : 'Sin fecha'}${v.overdue ? ' · VENCIDA' : ''}`}
                      />
                      {v.overdue && <Chip size="small" color="error" label="Vencida" />}
                    </MenuItem>
                  ))}
                  {(reminders.upcomingDesparasitaciones ?? []).map((d: any) => (
                    <MenuItem key={`d-${d.id}`} dense onClick={() => { setNotifAnchor(null); navigate(`/historial/${d.mascota_id}`); }} sx={{ borderRadius: 2, mb: 0.5 }}>
                      <ListItemIcon><BugReportIcon fontSize="small" /></ListItemIcon>
                      <ListItemText
                        primary={`Desparasitación: ${d.mascota_nombre}`}
                        secondary={`Próxima dosis: ${d.proxima_dosis ? new Date(d.proxima_dosis).toLocaleDateString() : 'Sin fecha'}${d.overdue ? ' · VENCIDA' : ''}`}
                      />
                      {d.overdue && <Chip size="small" color="error" label="Vencida" />}
                    </MenuItem>
                  ))}
                </Box>
              )}
            </Menu>

            <Tooltip title={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              <IconButton onClick={toggleTheme} size="small" aria-label={mode === 'dark' ? 'Modo claro' : 'Modo oscuro'} sx={{ bgcolor: (theme) => alpha(theme.palette.divider, 0.05) }}>
                {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5, my: 1.5, opacity: 0.5 }} />

            <Button
              onClick={(e) => setUserMenu(e.currentTarget)}
              sx={{
                px: 1.5, py: 0.75,
                borderRadius: 3,
                textTransform: 'none',
                color: 'text.primary',
                bgcolor: (theme) => alpha(theme.palette.divider, 0.05),
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.divider, 0.1) }
              }}
            >
              <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.main', fontSize: '0.85rem', fontWeight: 700 }}>
                {user?.nombre?.[0]?.toUpperCase()}
              </Avatar>
              <Box sx={{ textAlign: 'left', display: { xs: 'none', sm: 'block' } }}>
                <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>{user?.nombre}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{user?.rol}</Typography>
              </Box>
            </Button>
          </Box>

          <Menu
            anchorEl={userMenu}
            open={!!userMenu}
            onClose={() => setUserMenu(null)}
            slotProps={{
              paper: { sx: { mt: 1.5, minWidth: 200, borderRadius: 3, boxShadow: (theme) => theme.shadows[3] } }
            }}
          >
            <MenuItem onClick={() => { setUserMenu(null); setChangePwdOpen(true); }}>
              <KeyIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Cambiar contraseña
            </MenuItem>
            {user?.rol === 'admin' && (
              <MenuItem onClick={() => { setUserMenu(null); setBackupOpen(true); }}>
                <BackupIcon fontSize="small" sx={{ mr: 1.5, color: 'text.secondary' }} /> Backup / Restaurar
              </MenuItem>
            )}
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
              <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} /> Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { sm: currentWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s ease' }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { width: drawerWidth, borderRight: 'none', boxShadow: (theme) => theme.shadows[4] },
          }}
        >
          {drawerContent}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              width: currentWidth, 
              borderRight: (theme) => `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              transition: 'width 0.3s ease',
              overflowX: 'hidden',
              bgcolor: 'background.paper',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      <Box component="main" sx={{ flexGrow: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Toolbar sx={{ minHeight: '80px !important' }} />
        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 4, md: 6 }, overflow: 'auto' }}>
          <Box sx={{ maxWidth: 1400, mx: 'auto', animation: 'fadeSlideUp 0.5s ease' }}>
            <BreadcrumbsNav location={location} onNavigate={navigate} />
            {children}
          </Box>
        </Box>
      </Box>

      <ChangePasswordDialog open={changePwdOpen} onClose={() => setChangePwdOpen(false)} selectedUserId={user?.id ?? null} />
      <BackupRestore open={backupOpen} onClose={() => setBackupOpen(false)} />
    </Box>
  );
}

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeModeProvider } from './ThemeContext';
import { NotificationProvider } from './components/shared/NotificationContext';
import ErrorBoundary from './components/shared/ErrorBoundary';
import Layout from './components/Layout';
import Login from './components/Login';
import ForceChangePassword from './components/shared/ForceChangePassword';
import { Box, CircularProgress } from '@mui/material';

const Dashboard = lazy(() => import('./components/Dashboard/Dashboard'));
const PropietariosList = lazy(() => import('./components/Propietarios/PropietariosList'));
const MascotasList = lazy(() => import('./components/Mascotas/MascotasList'));
const HistorialList = lazy(() => import('./components/HistorialMedico/HistorialList'));
const HistorialSelector = lazy(() => import('./components/HistorialMedico/HistorialSelector'));
const HistorialGlobal = lazy(() => import('./components/HistorialMedico/HistorialGlobal'));
const CitasList = lazy(() => import('./components/Citas/CitasList'));
const UsuariosList = lazy(() => import('./components/Usuarios/UsuariosList'));
const InventarioList = lazy(() => import('./components/Inventario/InventarioList'));
const AuditLogList = lazy(() => import('./components/AuditLog/AuditLogList'));

function ErrorBoundaryWithReset({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

function RouteLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
      <CircularProgress />
    </Box>
  );
}

function ProtectedRoutes() {
  const authCtx = useAuth();
  const user = authCtx?.user;
  const syncUser = authCtx?.syncUser ?? (() => {});
  const [forcePwdOpen, setForcePwdOpen] = useState(false);

  useEffect(() => {
    if (user?.must_change_password) setForcePwdOpen(true);
  }, [user]);

  if (!user) return <Navigate to="/login" replace />;

  const handleForcePwdComplete = async () => {
    setForcePwdOpen(false);
    try {
      const fresh = await window.api.getMe();
      if (fresh) syncUser({ ...fresh, must_change_password: false });
    } catch (err) {
      console.warn('[App] Error actualizando usuario tras cambio de contraseña:', err);
    }
  };

  const AdminOnly = ({ children }: { children: React.ReactNode }) =>
    user?.rol === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />;

  return (
    <>
      <ForceChangePassword open={forcePwdOpen} onComplete={handleForcePwdComplete} />
      <Layout>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/propietarios" element={<PropietariosList />} />
            <Route path="/mascotas" element={<MascotasList />} />
            <Route path="/mascotas/:propietarioId" element={<MascotasList />} />
            <Route path="/historial" element={<HistorialSelector />} />
            <Route path="/historial/todos" element={<HistorialGlobal />} />
            <Route path="/historial/:mascotaId" element={<HistorialList />} />
            <Route path="/citas" element={<CitasList />} />
            <Route path="/usuarios" element={<AdminOnly><UsuariosList /></AdminOnly>} />
            <Route path="/inventario" element={<InventarioList />} />
            <Route path="/auditoria" element={<AdminOnly><AuditLogList /></AdminOnly>} />
          </Routes>
        </Suspense>
      </Layout>
    </>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <HashRouter>
        <AuthProvider>
          <NotificationProvider>
            <ErrorBoundaryWithReset>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </ErrorBoundaryWithReset>
          </NotificationProvider>
        </AuthProvider>
      </HashRouter>
    </ThemeModeProvider>
  );
}

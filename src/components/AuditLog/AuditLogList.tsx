import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, TextField, IconButton, Paper, Table, TableBody, TableCell,
  TableContainer, TableRow, Typography, Tooltip, Chip,
  InputAdornment, TablePagination, alpha, useTheme, Avatar,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { useNotification } from '../shared/NotificationContext';
import SkeletonTable from '../shared/SkeletonTable';
import EmptyState from '../shared/EmptyState';
import SortableTableHead from '../shared/SortableTableHead';
import { useDebounce, useSort } from '../../hooks';
import { PAGE_SIZES } from '../../constants';
import PageHeader from '../shared/PageHeader';

const ACCION_COLORS = {
  CREATE: 'success', UPDATE: 'info', SOFT_DELETE: 'error',
  CHANGE_PASSWORD: 'warning', DELETE: 'error', MOVIMIENTO: 'primary',
  EXPORT_BACKUP: 'secondary', IMPORT_BACKUP: 'secondary',
};

export default function AuditLogList() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const { orderBy, order, handleSort, sortedItems: sortedLogs } = useSort(logs);
  const search = useDebounce(searchInput, 400);
  const notifCtx = useNotification();
  const notify = notifCtx?.notify ?? (() => {});
  const theme = useTheme();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.api.getAuditLog({ page: pagination.page, limit: pagination.limit, search });
      setLogs(data.data);
      setPagination((p) => ({ ...p, total: data.pagination.total, totalPages: data.pagination.totalPages }));
    } catch (err) {
      notify(err instanceof Error ? err.message : String(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, notify]);

  useEffect(() => { load(); }, [load]);

  return (
    <Box>
      <PageHeader
        icon={<HistoryIcon />}
        title="Auditoría"
        subtitle="Registro global de operaciones"
        gradient="info"
        badge={
          <Chip
            label={`${pagination.total} registro${pagination.total !== 1 ? 's' : ''}`}
            size="small"
            sx={{ fontWeight: 700, bgcolor: (t) => alpha(t.palette.info.main, 0.1), color: 'info.main', borderRadius: 1.5 }}
          />
        }
        actions={
          <>
            <TextField
              size="small"
              placeholder="Buscar por usuario o acción..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              sx={{ borderRadius: 3, width: { xs: '100%', sm: 300 }, bgcolor: (t) => alpha(t.palette.divider, 0.02), '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="disabled" /></InputAdornment>,
                }
              }}
            />
            <Tooltip title="Actualizar">
              <IconButton onClick={load} aria-label="Actualizar" sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.08), color: 'primary.main' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </>
        }
      />

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'none', border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}` }}>
        <Table>
          <SortableTableHead
            columns={[
              { key: 'created_at', label: 'Fecha y Hora', width: 180 },
              { key: 'usuario_nombre', label: 'Operador' },
              { key: 'accion', label: 'Acción' },
              { key: 'entidad', label: 'Módulo' },
              { key: 'entidad_id', label: 'Ref. ID' },
              { key: 'detalles', label: 'Detalles del Cambio', sortable: false },
            ]}
            orderBy={orderBy}
            order={order}
            onSort={handleSort}
          />
          <TableBody>
            {loading ? (
              <SkeletonTable rows={10} cols={6} />
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ py: 10 }}>
                  <EmptyState 
                    icon={<HistoryIcon sx={{ fontSize: 48, opacity: 0.2 }} />}
                    title="Historial de Auditoría Vacío"
                    search={search ? `Sin resultados para "${search}"` : "Aún no se han registrado acciones en el sistema."}
                  />
                </TableCell>
              </TableRow>
            ) : sortedLogs.map((log) => {
              const color = (ACCION_COLORS as any)[log.accion] || 'secondary';
              return (
                <TableRow key={log.id} hover sx={{ transition: 'background-color 0.2s' }}>
                  <TableCell sx={{ pl: 3, whiteSpace: 'nowrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }} color="text.primary">
                      {new Date(log.created_at).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 800, bgcolor: 'primary.main' }}>
                        {log.usuario_nombre?.[0] || log.usuario_username?.[0] || '?'}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.usuario_nombre || log.usuario_username}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={log.accion.replace('_', ' ')} 
                      size="small" 
                      sx={{ 
                        fontWeight: 700, 
                        fontSize: '0.65rem',
                        bgcolor: (t) => alpha((t.palette as any)[color].main, 0.12),
                        color: (t) => (t.palette as any)[color].main,
                        borderRadius: 1.5
                      }} 
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
                      {log.entidad.toLowerCase()}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, bgcolor: (t) => alpha(t.palette.divider, 0.05), px: 1, py: 0.5, borderRadius: 1 }}>
                      #{log.entidad_id ?? '-'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 350 }}>
                    <Tooltip title={
                      <Box sx={{ p: 1 }}>
                        {log.datos_previos && <Typography variant="caption" component="div"><strong>Anterior:</strong> {log.datos_previos}</Typography>}
                        {log.datos_nuevos && <Typography variant="caption" component="div" sx={{ mt: 0.5 }}><strong>Nuevo:</strong> {log.datos_nuevos}</Typography>}
                      </Box>
                    }>
                      <Typography variant="body2" noWrap color="text.secondary" sx={{ fontWeight: 500 }}>
                        {log.datos_nuevos || log.datos_previos || 'Sin detalles registrados'}
                      </Typography>
                    </Tooltip>
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
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, p) => setPagination((prev) => ({ ...prev, page: p + 1 }))}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value, 10), page: 1 }))}
          rowsPerPageOptions={PAGE_SIZES}
          labelRowsPerPage="Registros por página"
          sx={{ borderRadius: 3, border: (t) => `1px solid ${alpha(t.palette.divider, 0.08)}`, boxShadow: 'none' }}
        />
      </Box>
    </Box>
  );
}

import React from 'react';
import { Table, TableContainer, TableHead, TableBody, TableRow, TableCell, Paper, Box, Typography, Card, CardContent, useTheme, useMediaQuery } from '@mui/material';

interface Column {
  field: string;
  headerName: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  showMobile?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  emptyContent?: React.ReactNode;
  loading?: boolean;
  skeletonRows?: number;
  skeletonCols?: number;
  onRowClick?: (row: any) => void;
}

export default function ResponsiveTable({ columns, data, emptyContent, loading, skeletonRows = 5, skeletonCols = 5, onRowClick }: ResponsiveTableProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    return (
      <Box>
        {loading ? (
          Array.from({ length: skeletonRows }).map((_, i) => (
            <Card key={i} sx={{ mb: 1 }}>
              <CardContent sx={{ pb: '16px !important', pt: 2, px: 2 }}>
                <Box sx={{ animation: 'pulse 1.5s ease-in-out infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.4 }, '100%': { opacity: 1 } } }}>
                  <Box sx={{ height: 20, bgcolor: 'action.hover', borderRadius: 1, mb: 1, width: '60%' }} />
                  <Box sx={{ height: 16, bgcolor: 'action.hover', borderRadius: 1, mb: 0.5, width: '40%' }} />
                  <Box sx={{ height: 16, bgcolor: 'action.hover', borderRadius: 1, width: '80%' }} />
                </Box>
              </CardContent>
            </Card>
          ))
        ) : data.length === 0 ? (
          emptyContent
        ) : data.map((row, idx) => (
          <Card key={row.id || idx} sx={{ mb: 1, cursor: onRowClick ? 'pointer' : 'default' }} onClick={() => onRowClick?.(row)}>
            <CardContent sx={{ pb: '16px !important', pt: 2 }}>
              {columns.filter((c) => c.showMobile !== false).map((col) => (
                <Box key={col.field} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>{col.headerName}</Typography>
                  <Box sx={{ textAlign: 'right', maxWidth: '60%' }}>
                    {col.render ? col.render(row[col.field], row) : <Typography variant="body2">{row[col.field] ?? '-'}</Typography>}
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.field} align={col.align} sx={{ width: col.width }}>
                {col.headerName}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: skeletonCols }).map((_, j) => (
                  <TableCell key={j}><Box sx={{ height: 20, bgcolor: 'action.hover', borderRadius: 1 }} /></TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} sx={{ border: 0, textAlign: 'center', py: 4 }}>{emptyContent}</TableCell>
            </TableRow>
          ) : data.map((row) => (
            <TableRow key={row.id} hover={!!onRowClick} onClick={() => onRowClick?.(row)} sx={{ cursor: onRowClick ? 'pointer' : 'default' }}>
              {columns.map((col) => (
                <TableCell key={col.field} align={col.align}>
                  {col.render ? col.render(row[col.field], row) : row[col.field]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

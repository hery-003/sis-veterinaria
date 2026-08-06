import React from 'react';
import { TableHead, TableRow, TableCell, TableSortLabel, alpha, useTheme } from '@mui/material';

interface SortableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

interface SortableTableHeadProps {
  columns: SortableColumn[];
  orderBy: string | null;
  order: 'asc' | 'desc';
  onSort: (key: string) => void;
}

export default function SortableTableHead({ columns, orderBy, order, onSort }: SortableTableHeadProps) {
  const theme = useTheme();
  return (
    <TableHead sx={{
      bgcolor: alpha(theme.palette.background.default, 0.55),
      '& .MuiTableCell-root': {
        color: 'text.secondary',
        fontWeight: 800,
        fontSize: '0.7rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        py: 1.6,
        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
      },
      '& .MuiTableSortLabel-root': {
        fontWeight: 800,
        '&.Mui-active': { color: 'primary.main' },
      },
      '& .MuiTableSortLabel-icon': {
        opacity: 1,
      },
    }}>
      <TableRow>
        {columns.map((col) => (
          <TableCell key={col.key} align={col.align} sx={{ ...(col.width ? { width: col.width } : {}), whiteSpace: 'nowrap' }}>
            {col.sortable !== false && col.key && !col.key.endsWith('-col') ? (
              <TableSortLabel
                active={orderBy === col.key}
                direction={orderBy === col.key ? order : 'asc'}
                onClick={() => { onSort(col.key); }}
              >
                {col.label}
              </TableSortLabel>
            ) : col.label}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

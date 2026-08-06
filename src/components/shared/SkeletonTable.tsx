import React from 'react';
import { TableCell, TableRow, Skeleton } from '@mui/material';

export default function SkeletonTable({ rows = 5, cols = 5, height = 40 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <TableRow key={r} sx={{ '& td': { py: 2 } }}>
      {Array.from({ length: cols }).map((_, c) => (
        <TableCell key={c}>
          <Skeleton
            variant={c === 0 ? 'circular' : 'rounded'}
            width={c === 0 ? 44 : c === cols - 1 ? 90 : `${[60, 75, 85, 65, 70][c % 5]}%`}
            height={c === 0 ? 44 : height}
            sx={{ 
              borderRadius: c === 0 ? '50%' : 2, 
              maxWidth: 240,
              opacity: 0.6
            }}
          />
        </TableCell>
      ))}
    </TableRow>
  ));
}

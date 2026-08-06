import React from 'react';
import { Box, Typography, IconButton, Button, alpha, useTheme } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TodayIcon from '@mui/icons-material/Today';
import { DIAS_SEMANA, MESES } from '../../constants';
import { toISODate } from '../../utils/date';

export default function CalendarGrid({ currentMonth, currentYear, selectedDate, monthData, onSelectDay, onPrevMonth, onNextMonth, onToday }: {
  currentMonth: number;
  currentYear: number;
  selectedDate: string;
  monthData: Array<{ dia: number; total: number; pendientes: number }>;
  onSelectDay: (date: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}) {
  const theme = useTheme();
  const todayStr = toISODate();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth - 1, 1).getDay();
  const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

  const cells = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, other: true, prev: true });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - firstDayOfWeek - daysInMonth + 1, other: true, next: true });

  const getDayData = (d: number) => monthData.find((m) => m.dia === d);

  function dayDateStr(cell: { day: number; other?: boolean; prev?: boolean; next?: boolean }) {
    if (!cell.other) return `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
    if (cell.prev) {
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      return `${y}-${String(m).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
    }
    const m = currentMonth === 12 ? 1 : currentMonth + 1;
    const y = currentMonth === 12 ? currentYear + 1 : currentYear;
    return `${y}-${String(m).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
  }

  return (
    <Box sx={{ p: 0.5, userSelect: 'none' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, px: 1 }}>
        <IconButton size="small" onClick={onPrevMonth}
          sx={{ bgcolor: (t) => alpha(t.palette.divider, 0.06), '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main' } }}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.82rem' }}>
          {MESES[currentMonth - 1]} {currentYear}
        </Typography>
        <IconButton size="small" onClick={onNextMonth}
          sx={{ bgcolor: (t) => alpha(t.palette.divider, 0.06), '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: 'primary.main' } }}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5, textAlign: 'center' }}>
        {DIAS_SEMANA.map((dn) => (
          <Typography key={dn} variant="caption" sx={{ fontWeight: 700, color: 'text.disabled', py: 0.8, fontSize: '0.65rem', letterSpacing: '0.03em' }}>
            {dn.slice(0, 2)}
          </Typography>
        ))}
        {cells.map((cell, idx) => {
          const dateStr = dayDateStr(cell);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;
          const dayData = !cell.other ? getDayData(cell.day) : null;
          const total = dayData?.total || 0;
          const pendientes = dayData?.pendientes || 0;
          const hasCitas = total > 0;

          return (
            <Box key={idx} onClick={() => onSelectDay(dateStr)}
              sx={{
                position: 'relative',
                aspectRatio: '1/1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 2,
                cursor: 'pointer',
                border: isSelected ? `2px solid ${theme.palette.primary.main}` : isToday ? `2px solid ${alpha(theme.palette.primary.main, 0.3)}` : '2px solid transparent',
                bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.1) : 'transparent',
                color: cell.other ? 'text.disabled' : 'text.primary',
                transition: 'all 0.2s ease',
                '&:hover': !cell.other ? {
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  transform: 'scale(1.05)',
                  zIndex: 1,
                } : {},
              }}
            >
              <Typography variant="body2" sx={{
                fontWeight: isSelected || isToday ? 800 : 600,
                fontSize: '0.8rem',
                lineHeight: 1,
                color: isSelected ? 'primary.main' : isToday ? 'primary.main' : undefined,
              }}>
                {cell.day}
              </Typography>
              {hasCitas && (
                <Box sx={{ display: 'flex', gap: 0.3, mt: 0.4 }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: pendientes > 0 ? 'warning.main' : 'success.main' }} />
                  {pendientes > 0 && (
                    <Typography variant="caption" sx={{ fontSize: '0.55rem', fontWeight: 700, color: 'warning.main', lineHeight: '5px' }}>
                      {pendientes}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.5 }}>
        <Button
          size="small"
          startIcon={<TodayIcon sx={{ fontSize: '0.9rem !important' }} />}
          onClick={onToday}
          sx={{
            fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary',
            textTransform: 'none', borderRadius: 2, px: 1.5,
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }
          }}
        >
          Hoy
        </Button>
      </Box>
    </Box>
  );
}

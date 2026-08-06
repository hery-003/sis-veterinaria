import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Snackbar, Alert, Box, LinearProgress, Slide, type SlideProps } from '@mui/material';
import { alpha } from '@mui/material/styles';

interface Notification {
  id: number;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
  action?: React.ReactNode;
  duration?: number;
}

interface NotificationContextType {
  notify: (message: string, severity?: Notification['severity'], options?: { action?: React.ReactNode; duration?: number }) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

const MAX_VISIBLE = 4;
const DURATION = 4000;
const STACK_GAP = 1;

function SlideTransition(props: SlideProps) {
  return <Slide {...props} direction="left" />;
}

function NotificationItem({ notification, onClose, index }: {
  notification: Notification;
  onClose: (id: number) => void;
  index: number;
}) {
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const duration = notification.duration || DURATION;

  useEffect(() => {
    startTimeRef.current = Date.now();
    function tick() {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);
      if (pct > 0) {
        timerRef.current = setTimeout(tick, 100);
      }
    }
    timerRef.current = setTimeout(tick, 100);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [duration]);

  const handleClose = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose(notification.id);
  };

  return (
    <Box sx={{ position: 'relative', minWidth: 340, maxWidth: 450, mb: index < MAX_VISIBLE - 1 ? `${STACK_GAP}px` : 0 }}>
      <Alert
        onClose={handleClose}
        severity={notification.severity || 'info'}
        variant="filled"
        action={notification.action}
        sx={{
          borderRadius: 2,
          boxShadow: (t) => `0 6px 20px ${alpha('#000', 0.2)}, 0 0 0 1px ${alpha(t.palette.primary.main, 0.08)}`,
          alignItems: 'center',
          backdropFilter: 'blur(12px)',
          animation: 'slideIn 0.3s ease',
          '@keyframes slideIn': {
            from: { transform: 'translateX(100%)', opacity: 0 },
            to: { transform: 'translateX(0)', opacity: 1 },
          },
        }}
      >
        {notification.message}
      </Alert>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          borderBottomLeftRadius: 8, borderBottomRightRadius: 8, height: 3,
          bgcolor: 'transparent',
          '& .MuiLinearProgress-bar': {
            transition: 'none',
            bgcolor: (theme) => alpha(theme.palette.common.white, 0.4),
          },
        }}
      />
    </Box>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Notification[]>([]);
  const nextIdRef = useRef(1);

  const notify = useCallback((message: string, severity: Notification['severity'] = 'success', options?: { action?: React.ReactNode; duration?: number }) => {
    const id = nextIdRef.current++;
    setQueue((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), { id, message, severity, action: options?.action, duration: options?.duration }]);
  }, []);

  const handleClose = useCallback((id: number) => {
    setQueue((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const dismissTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const currentIds = new Set(queue.map(n => n.id));
    Object.keys(dismissTimersRef.current).forEach(id => {
      const numId = Number(id);
      if (!currentIds.has(numId)) {
        clearTimeout(dismissTimersRef.current[numId]);
        delete dismissTimersRef.current[numId];
      }
    });
    queue.forEach(n => {
      if (!dismissTimersRef.current[n.id]) {
        const dur = n.duration || DURATION;
        dismissTimersRef.current[n.id] = setTimeout(() => {
          setQueue((prev) => prev.filter((item) => item.id !== n.id));
          delete dismissTimersRef.current[n.id];
        }, dur);
      }
    });
    return () => {
      Object.values(dismissTimersRef.current).forEach(clearTimeout);
      dismissTimersRef.current = {};
    };
  }, [queue]);

  const contextValue = useMemo(() => ({ notify }), [notify]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <Snackbar
        open={queue.length > 0}
        autoHideDuration={undefined}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        slots={{ transition: SlideTransition }}
        sx={{ bottom: '24px !important', right: '24px !important' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: `${STACK_GAP}px` }}>
          {queue.map((n, i) => (
            <NotificationItem key={n.id} notification={n} onClose={handleClose} index={i} />
          ))}
        </Box>
      </Snackbar>
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextType | null {
  return useContext(NotificationContext);
}

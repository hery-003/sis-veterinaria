import React, { useCallback, useRef } from 'react';
import { Button } from '@mui/material';
import { useNotification } from './NotificationContext';

interface UndoDeleteOptions {
  onUndo: () => Promise<void>;
  message?: string;
  duration?: number;
}

export function useUndoDelete() {
  const notif = useNotification();

  const confirmUndo = useCallback(({ onUndo, message = 'Elemento eliminado', duration = 6000 }: UndoDeleteOptions) => {
    if (!notif) return;

    let undone = false;

    notif.notify(`${message} —`, 'info', {
      duration,
      action: (
        <Button
          color="inherit"
          size="small"
          onClick={async () => {
            if (undone) return;
            undone = true;
            try {
              await onUndo();
              notif.notify('Acción deshecha', 'success');
            } catch (err) {
              notif.notify(err instanceof Error ? err.message : String(err), 'error');
            }
          }}
          sx={{ fontWeight: 700, textTransform: 'none' }}
        >
          Deshacer
        </Button>
      ),
    });
  }, [notif]);

  return { confirmUndo };
}

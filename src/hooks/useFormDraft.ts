import { useState, useEffect, useCallback } from 'react';

const DRAFT_PREFIX = 'form_draft_';
const DRAFT_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface DraftMeta {
  data: Record<string, any>;
  savedAt: number;
}

export function useFormDraft(key: string, enabled = true) {
  const storageKey = DRAFT_PREFIX + key;

  const getDraft = useCallback((): Record<string, any> | null => {
    if (!enabled) return null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const meta: DraftMeta = JSON.parse(raw);
      if (Date.now() - meta.savedAt > DRAFT_TTL) {
        localStorage.removeItem(storageKey);
        return null;
      }
      return meta.data;
    } catch {
      return null;
    }
  }, [storageKey, enabled]);

  const saveDraft = useCallback((data: Record<string, any>) => {
    if (!enabled) return;
    try {
      const meta: DraftMeta = { data, savedAt: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(meta));
    } catch { /* storage full, ignore */ }
  }, [storageKey, enabled]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { getDraft, saveDraft, clearDraft };
}

export function useFilterPersistence(key: string) {
  const storageKey = `filter_${key}`;

  const load = useCallback((): Record<string, any> => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }, [storageKey]);

  const save = useCallback((filters: Record<string, any>) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch { /* ignore */ }
  }, [storageKey]);

  return { load, save };
}

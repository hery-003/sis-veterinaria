import { useState, useCallback, useRef } from 'react';

interface ApiError {
  message: string;
  fieldErrors: Record<string, string>;
}

interface ApiOptions {
  timeout?: number;
}

export function parseError(error: unknown): ApiError {
  try {
    const parsed = typeof error === 'string' ? JSON.parse(error) : error;
    if (parsed.errors && Array.isArray(parsed.errors)) {
      const fieldErrors: Record<string, string> = {};
      parsed.errors.forEach((e: { field?: string; message?: string }) => { if (e.field) fieldErrors[e.field] = e.message || ''; });
      return { message: parsed.message || String(error), fieldErrors };
    }
    return { message: parsed.message || String(error), fieldErrors: {} };
  } catch {
    return { message: String(error), fieldErrors: {} };
  }
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const call = useCallback(async <T>(apiFn: () => Promise<T>, options: ApiOptions = {}): Promise<T | { error: ApiError }> => {
    const { timeout = 30000 } = options;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
      const result = await Promise.race([
        apiFn(),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener('abort', () => reject(new Error('Solicitud cancelada')), { once: true })
        ),
      ]);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      const parsed = parseError(msg);
      setError(parsed);
      return { error: parsed };
    } finally {
      setLoading(false);
    }
  }, []);

  const resetError = useCallback(() => setError(null), []);

  return { call, loading, error, resetError, parseError };
}

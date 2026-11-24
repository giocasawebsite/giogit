import { useEffect, useRef, useState, useCallback } from 'react';

export type LiveSyncStatus = 'idle' | 'syncing' | 'healthy' | 'error' | 'paused';

interface UseAdminLiveSyncOptions {
  enabled?: boolean;
  intervalMs?: number; // Default: 3000ms (3 seconds)
  pauseWhenHidden?: boolean; // Default: true
  onSync?: () => Promise<any>;
}

export function useAdminLiveSync({
  enabled = true,
  intervalMs = 3000,
  pauseWhenHidden = true,
  onSync,
}: UseAdminLiveSyncOptions) {
  const [status, setStatus] = useState<LiveSyncStatus>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);

  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  const isSyncingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const performSync = useCallback(async () => {
    if (!onSyncRef.current) return;
    if (isSyncingRef.current) return; // Prevent overlapping requests
    if (pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
      setStatus('paused');
      return;
    }

    isSyncingRef.current = true;
    try {
      await onSyncRef.current();
      setStatus('healthy');
      setLastSyncedAt(new Date());
    } catch (err: any) {
      const isAuthError =
        err?.isAuthError ||
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.includes('Unauthorized') ||
        err?.message?.includes('Session expired');

      if (isAuthError) {
        // Stop timer immediately on authentication failure to prevent repeated 401 requests every 3s
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setStatus('error');
        console.warn('[AdminLiveSync] Admin authentication expired or invalid. Background sync halted.');
        return;
      }

      // Graceful error handling for temporary network glitches - retry on next interval
      console.warn('[AdminLiveSync] Background sync notice (retrying in 3s):', err?.message || err);
      setStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [pauseWhenHidden]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('idle');
      return;
    }

    // Set 3-second recurring live-sync timer
    timerRef.current = setInterval(() => {
      performSync();
    }, intervalMs);

    // Tab visibility handling: pause when tab is hidden, sync immediately when active
    const handleVisibilityChange = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        setStatus('paused');
      } else {
        // Immediately sync upon becoming visible
        performSync();
      }
    };

    if (pauseWhenHidden && typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (pauseWhenHidden && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      isSyncingRef.current = false;
    };
  }, [enabled, intervalMs, pauseWhenHidden, performSync]);

  return {
    status,
    lastSyncedAt,
    triggerSync: performSync,
  };
}

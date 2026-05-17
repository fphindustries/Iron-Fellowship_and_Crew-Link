/**
 * Adapts REST API calls to the Firebase-style listener pattern used throughout
 * the Zustand stores. Fetches once on subscribe, then polls on a short interval.
 * Socket.IO invalidation is handled separately via useSocketRoom hooks in components.
 */
import { api } from "../config/api.config";

export interface ListenerCallbacks<T> {
  onData: (items: T[]) => void;
  onError?: (err: unknown) => void;
  onLoaded?: () => void;
}

export function restListenerList<T>(
  path: string,
  callbacks: ListenerCallbacks<T>,
  pollIntervalMs = 0
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fetch = async () => {
    try {
      const data = await api.get<T[]>(path);
      if (!active) return;
      callbacks.onData(data);
      callbacks.onLoaded?.();
    } catch (e) {
      if (!active) return;
      callbacks.onError?.(e);
      callbacks.onLoaded?.();
    }
  };

  fetch();

  if (pollIntervalMs > 0) {
    const schedulePoll = () => {
      timer = setTimeout(async () => {
        if (!active) return;
        await fetch();
        if (active) schedulePoll();
      }, pollIntervalMs);
    };
    schedulePoll();
  }

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}

export function restListenerSingle<T>(
  path: string,
  callbacks: { onData: (item: T) => void; onError?: (err: unknown) => void; onLoaded?: () => void },
  pollIntervalMs = 0
): () => void {
  let active = true;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const fetchFn = async () => {
    try {
      const data = await api.get<T>(path);
      if (!active) return;
      callbacks.onData(data);
      callbacks.onLoaded?.();
    } catch (e) {
      if (!active) return;
      callbacks.onError?.(e);
      callbacks.onLoaded?.();
    }
  };

  fetchFn();

  if (pollIntervalMs > 0) {
    const schedulePoll = () => {
      timer = setTimeout(async () => {
        if (!active) return;
        await fetchFn();
        if (active) schedulePoll();
      }, pollIntervalMs);
    };
    schedulePoll();
  }

  return () => {
    active = false;
    if (timer) clearTimeout(timer);
  };
}

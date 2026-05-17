export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

export const SOCKET_NAMESPACES = {
  character: `${API_BASE_URL}/character`,
  campaign: `${API_BASE_URL}/campaign`,
  world: `${API_BASE_URL}/world`,
  homebrew: `${API_BASE_URL}/homebrew`,
  user: `${API_BASE_URL}/user`,
  yjs: `${API_BASE_URL}/yjs`,
} as const;

export const ignoreApiError = (_error?: unknown): void => undefined;

export const api = {
  url: (path: string) => `${API_BASE_URL}${path}`,
  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json() as Promise<T>;
  },
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },
  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  },
  async del<_T = void>(path: string, body?: unknown): Promise<void> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
  },
};

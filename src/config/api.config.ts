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
  async *postStream(
    path: string,
    body?: unknown
  ): AsyncGenerator<{ text?: string; _debug?: object }> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        const parsed = JSON.parse(data) as {
          text?: string;
          _debug?: object;
          error?: string;
        };
        if (parsed.error) throw new Error(parsed.error);
        yield parsed;
      }
    }
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

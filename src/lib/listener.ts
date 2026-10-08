/**
 * Слухач Telegram (контейнер bizdev-listener, таск 140108c8). Портал ходить до нього
 * лише з сервера, по внутрішній мережі bizdev-net; браузер його не бачить.
 */
const url = typeof process !== 'undefined' ? process.env.BIZDEV_LISTENER_URL : undefined;

export interface ListenerStatus {
  step: 'disconnected' | 'sending_code' | 'need_code' | 'checking' | 'need_password' | 'connected' | 'error';
  account: { id: string; username: string | null; name: string; phoneTail: string | null; since: string } | null;
  error: string | null;
  hint: string | null;
  code: { via: string | null; next: string | null } | null;
  lastMessageAt: string | null;
  allowed: { id: string; title: string | null; kind?: string; messages: number; last_at?: string | null }[];
  pult: { configured: boolean; botUsername?: string; bound?: boolean; bindCode?: string | null };
}

export async function listener(path: string, body?: Record<string, unknown>): Promise<ListenerStatus> {
  if (!url) throw new Error('BIZDEV_LISTENER_URL is not set');
  const res = await fetch(`${url}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45_000),
  });
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error ?? `listener ${res.status}`), { userFacing: true });
  return data;
}

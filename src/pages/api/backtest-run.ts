import type { APIRoute } from 'astro';
import { startRun } from '../../lib/agent/run';
import { apiRunsEnabled } from '../../lib/agent/llm';

/** Запуск прогону автоматичного порівняння (таск cfb5898d). Лише з сесією (middleware). Іде у фоні. */
export const POST: APIRoute = async ({ locals }) => {
  if (!apiRunsEnabled()) return json({ error: 'While the agent is being tuned, runs go from the chat «Dev - BLACK ORACLE #1» on the subscription' }, 409);
  const r = await startRun(locals.user?.email ?? null);
  if ('error' in r) return json({ error: r.error }, 409);
  return json({ ok: true, id: r.id });
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

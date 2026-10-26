import type { APIRoute } from 'astro';
import { startRun } from '../../lib/agent/run';
import { llmConfigured } from '../../lib/agent/llm';

/** Запуск прогону автоматичного порівняння (таск cfb5898d). Лише з сесією (middleware). Іде у фоні. */
export const POST: APIRoute = async ({ locals }) => {
  if (!llmConfigured()) return json({ error: 'The model key is not set on the server yet' }, 503);
  const r = await startRun(locals.user?.email ?? null);
  if ('error' in r) return json({ error: r.error }, 409);
  return json({ ok: true, id: r.id });
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

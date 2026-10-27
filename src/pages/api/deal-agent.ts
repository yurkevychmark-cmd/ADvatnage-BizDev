import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { UUID_RE } from '../../lib/deal-agent';

/**
 * Поля угоди для агента (критерій 2 таска 1dcedada): наступний дотик і пауза агента.
 * Пауза — у projects.agent_paused; агент (5/8) перевіряє її через agent_may_act у базі.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const id = String(body.id ?? '');
  if (!UUID_RE.test(id)) return json({ error: 'bad id' }, 400);
  const db = supabase as any;
  const who = locals.user?.email ?? null;

  const patch: Record<string, unknown> = {};
  if ('next_touch_at' in body) {
    if (body.next_touch_at === null || body.next_touch_at === '') patch.next_touch_at = null;
    else if (typeof body.next_touch_at === 'string' && !Number.isNaN(Date.parse(body.next_touch_at))) patch.next_touch_at = new Date(body.next_touch_at).toISOString();
    else return json({ error: 'bad next_touch_at' }, 400);
  }
  if (typeof body.agent_paused === 'boolean') {
    patch.agent_paused = body.agent_paused;
    patch.agent_paused_at = body.agent_paused ? new Date().toISOString() : null;
    patch.agent_paused_by = body.agent_paused ? who : null;
  }
  if (!Object.keys(patch).length) return json({ error: 'nothing to change' }, 400);

  const { data: deal, error } = await db.from('projects').update(patch).eq('id', id).select('name').maybeSingle();
  if (error) { console.error('[deal-agent] update', error.message); return json({ error: 'Could not save, try again' }, 500); }
  if (!deal) return json({ error: 'deal not found' }, 404);
  if ('agent_paused' in patch) {
    await db.from('activity_log').insert({ entity_type: 'deal', entity_name: deal.name, action: patch.agent_paused ? 'agent paused' : 'agent resumed' });
  }
  const { data: state } = await db.from('deal_agent_state').select('*').eq('project_id', id).maybeSingle();
  return json({ ok: true, state });
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

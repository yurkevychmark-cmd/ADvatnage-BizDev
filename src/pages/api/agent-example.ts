import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

/**
 * Правка прикладу агента без деплою (критерій 4 таска cfb5898d): текст відповіді й «агент бере / не бере».
 * Лише з сесією (middleware). Наступна чернетка бере приклад уже в новому вигляді.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const id = String(body.id ?? '');
  if (!/^p_[0-9a-f]{16}$/.test(id)) return json({ error: 'bad id' }, 400);
  const patch: Record<string, unknown> = { edited_by: locals.user?.email ?? null, edited_at: new Date().toISOString() };
  if (typeof body.reply === 'string') {
    const reply = body.reply.trim();
    if (!reply) return json({ error: 'The reply cannot be empty. Switch the example off instead.' }, 400);
    if (reply.length > 4000) return json({ error: 'too long' }, 400);
    patch.reply = reply;
  }
  if (typeof body.active === 'boolean') patch.active = body.active;
  if (!('reply' in patch) && !('active' in patch)) return json({ error: 'nothing to change' }, 400);
  const { error } = await (supabase as any).from('agent_examples').update(patch).eq('id', id);
  if (error) { console.error('[examples] update', error.message); return json({ error: 'Could not save, try again' }, 500); }
  return json({ ok: true });
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

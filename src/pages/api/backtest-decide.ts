import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { VERDICTS, type Verdict } from '../../lib/backtest';

/** Розмітка бектесту: одне рішення на ситуацію, повторне — перезаписує. Лише з сесією (middleware). */
export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const id = String(body.id ?? '');
  const verdict = String(body.verdict ?? '') as Verdict;
  const edited = typeof body.editedText === 'string' ? body.editedText.trim() : '';
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';
  if (!/^[\w-]{1,40}$/.test(id)) return json({ error: 'bad id' }, 400);
  if (!VERDICTS.includes(verdict)) return json({ error: 'bad verdict' }, 400);
  if (verdict === 'edited' && !edited) return json({ error: 'Write your version first' }, 400);
  if (edited.length > 4000) return json({ error: 'too long' }, 400);

  const { error } = await supabase.from('backtest_decisions').upsert(
    {
      situation_id: id,
      verdict,
      edited_text: verdict === 'edited' ? edited : null,
      note: note || null,
      decided_by: locals.user?.email ?? null,
      decided_at: new Date().toISOString(),
    },
    { onConflict: 'situation_id' },
  );
  if (error) { console.error('[backtest] decide', error.message); return json({ error: 'Could not save, try again' }, 500); }
  return json({ ok: true });
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

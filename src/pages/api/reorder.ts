import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  const { table, ids } = await request.json();
  if (!['buyers', 'operators'].includes(table)) {
    return new Response(JSON.stringify({ error: 'Invalid table' }), { status: 400 });
  }
  await Promise.all(
    (ids as string[]).map((id, i) =>
      supabase.from(table).update({ sort_order: i }).eq('id', id)
    )
  );
  return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
};

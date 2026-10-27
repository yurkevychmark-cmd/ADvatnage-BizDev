import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { listener, type Dialog } from '../../lib/listener';
import { UUID_RE, CHAT_ID_RE } from '../../lib/deal-agent';

/**
 * Прив'язка Telegram-чатів до карток баєра й оператора (критерій 1 таска 1dcedada).
 * Слухач читає лише прив'язані чати; після зміни портал просить його перечитати список одразу.
 * Назву й тип чату беремо зі списку діалогів слухача, а не з браузера.
 */
const TABLE: Record<string, { col: 'buyer_id' | 'operator_id'; entity: string }> = {
  buyer: { col: 'buyer_id', entity: 'buyers' },
  operator: { col: 'operator_id', entity: 'operators' },
};
const db = supabase as any;

export const GET: APIRoute = async ({ url }) => {
  if (url.searchParams.get('dialogs') === '1') {
    try {
      return json({ dialogs: await listener<Dialog[]>('/dialogs') });
    } catch (e: any) {
      return json({ error: e.userFacing ? e.message : 'The Telegram listener is unavailable.' }, 502);
    }
  }
  const t = TABLE[url.searchParams.get('type') ?? ''];
  const id = url.searchParams.get('id') ?? '';
  if (!t || !UUID_RE.test(id)) return json({ error: 'bad type or id' }, 400);
  return json({ links: await linksOf(t.col, id) });
};

export const POST: APIRoute = async ({ request, locals }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'bad json' }, 400); }
  const t = TABLE[String(body.type ?? '')];
  const id = String(body.id ?? '');
  if (!t || !UUID_RE.test(id)) return json({ error: 'bad type or id' }, 400);
  const { data: card } = await db.from(t.entity).select('name').eq('id', id).maybeSingle();
  if (!card) return json({ error: 'card not found' }, 404);

  if (body.action === 'link') {
    const chatId = String(body.chat_id ?? '');
    if (!CHAT_ID_RE.test(chatId)) return json({ error: 'bad chat_id' }, 400);
    let dialog: Dialog | undefined;
    try {
      dialog = (await listener<Dialog[]>('/dialogs')).find((d) => String(d.id) === chatId);
    } catch (e: any) {
      return json({ error: e.userFacing ? e.message : 'The Telegram listener is unavailable.' }, 502);
    }
    if (!dialog) return json({ error: 'The work account has no such chat.' }, 400);
    const { error } = await db.from('tg_chat_links').insert({
      chat_id: chatId, chat_title: dialog.title, chat_kind: dialog.kind, [t.col]: id, linked_by: locals.user?.email ?? null,
    });
    if (error && !/duplicate key/.test(error.message)) { console.error('[tg-links] link', error.message); return json({ error: 'Could not save, try again' }, 500); }
    await db.from('activity_log').insert({ entity_type: body.type, entity_name: card.name, action: `telegram chat linked: ${dialog.title ?? chatId}` });
  } else if (body.action === 'unlink') {
    const linkId = String(body.link_id ?? '');
    if (!UUID_RE.test(linkId)) return json({ error: 'bad link_id' }, 400);
    const { data: gone, error } = await db.from('tg_chat_links').delete().eq('id', linkId).eq(t.col, id).select('chat_title, chat_id');
    if (error) { console.error('[tg-links] unlink', error.message); return json({ error: 'Could not save, try again' }, 500); }
    if (gone?.length) await db.from('activity_log').insert({ entity_type: body.type, entity_name: card.name, action: `telegram chat unlinked: ${gone[0].chat_title ?? gone[0].chat_id}` });
  } else {
    return json({ error: 'bad action' }, 400);
  }

  // Слухач і сам перечитує список раз на хвилину — тож недоступність тут не помилка.
  const reload = await listener('/reload', {}).then(() => true, (e) => { console.error('[tg-links] reload', e.message); return false; });
  return json({ ok: true, listenerReloaded: reload, links: await linksOf(t.col, id) });
};

async function linksOf(col: string, id: string) {
  const { data: links } = await db.from('tg_chat_links').select('id, chat_id, chat_title, chat_kind, linked_by, linked_at').eq(col, id).order('linked_at');
  return Promise.all((links ?? []).map(async (l: any) => {
    const [{ count }, { data: last }] = await Promise.all([
      db.from('tg_messages').select('message_id', { count: 'exact', head: true }).eq('chat_id', l.chat_id),
      db.from('tg_messages').select('sent_at').eq('chat_id', l.chat_id).order('sent_at', { ascending: false }).limit(1),
    ]);
    return { ...l, chat_id: String(l.chat_id), messages: count ?? 0, last_at: last?.[0]?.sent_at ?? null };
  }));
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

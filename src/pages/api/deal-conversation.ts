import type { APIRoute } from 'astro';
import { supabase } from '../../lib/supabase';
import { UUID_RE } from '../../lib/deal-agent';
import { buildTimeline } from '../../lib/timeline';

/**
 * Вкладка «Розмова» в угоді (критерій 3 таска 1dcedada): історія прив'язаних чатів баєра й оператора,
 * чернетки й нотатки агента. Сторінка опитує цей маршрут з ?after=<курсор> і дописує лише нове.
 * Текст повідомлень у базі вже замаскований слухачем.
 */
const FIRST_LOAD = 300;
// Рядок, вставлений довгою транзакцією, може мати час трохи раніший за курсор — перекриття,
// а дублікати сторінка відкидає за ключем.
const OVERLAP_MS = 10_000;

export const GET: APIRoute = async ({ url }) => {
  const deal = url.searchParams.get('deal') ?? '';
  if (!UUID_RE.test(deal)) return json({ error: 'bad deal' }, 400);
  const afterRaw = url.searchParams.get('after');
  const after = afterRaw && !Number.isNaN(Date.parse(afterRaw)) ? new Date(afterRaw).toISOString() : null;
  const since = after ? new Date(Date.parse(after) - OVERLAP_MS).toISOString() : null;
  const db = supabase as any;

  const [{ data: chats, error: chatsErr }, { data: state }] = await Promise.all([
    db.from('deal_chats').select('chat_id, title, side').eq('project_id', deal),
    db.from('deal_agent_state').select('*').eq('project_id', deal).maybeSingle(),
  ]);
  if (chatsErr) { console.error('[conversation] chats', chatsErr.message); return json({ error: 'Could not load, retrying' }, 500); }
  const chatIds = [...new Set((chats ?? []).map((c: any) => String(c.chat_id)))];

  let messages: any[] = [];
  if (chatIds.length) {
    const cols = 'chat_id, message_id, sent_at, sender_name, is_outgoing, text, media, inserted_at';
    const q = db.from('tg_messages').select(cols).in('chat_id', chatIds);
    const { data, error } = since
      ? await q.gt('inserted_at', since).order('inserted_at', { ascending: true }).limit(1000)
      : await q.order('sent_at', { ascending: false }).limit(FIRST_LOAD);
    if (error) { console.error('[conversation] messages', error.message); return json({ error: 'Could not load, retrying' }, 500); }
    messages = data ?? [];
  }
  const recent = (table: string) => {
    const q = db.from(table).select('*').eq('project_id', deal);
    return since ? q.gt('created_at', since) : q.order('created_at', { ascending: false }).limit(100);
  };
  const [{ data: drafts }, { data: notes }] = await Promise.all([recent('agent_drafts'), recent('agent_notes')]);

  const { items, cursor } = buildTimeline(messages, drafts ?? [], notes ?? [], chats ?? [], after);
  return json({ chats: chats ?? [], items, cursor, state, truncated: !since && messages.length === FIRST_LOAD });
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

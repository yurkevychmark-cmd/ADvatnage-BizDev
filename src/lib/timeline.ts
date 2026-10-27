/**
 * Стрічка вкладки «Розмова» в угоді (таск 1dcedada, критерій 3). Чиста функція — без бази,
 * щоб порядок і курсор опитування перевірялися тестом (test/deal-timeline.test.mjs).
 */
export interface TimelineItem {
  key: string;
  kind: 'message' | 'draft' | 'note';
  at: string;            // коли сталося (для порядку)
  seenAt: string;        // коли з'явилося в базі (для курсора опитування)
  chat?: string | null;
  side?: 'buyer' | 'operator' | null;
  author?: string | null;
  outgoing?: boolean;
  text: string;
  media?: string | null;
  status?: string;
  why?: string | null;
}

/** Повідомлення, чернетки й нотатки — в одну стрічку за часом. Курсор — найпізніша поява в базі. */
export function buildTimeline(
  messages: any[], drafts: any[], notes: any[],
  chats: { chat_id: string | number; title: string | null; side: 'buyer' | 'operator' }[],
  after: string | null,
): { items: TimelineItem[]; cursor: string | null } {
  const chatOf = new Map<string, { title: string | null; side: 'buyer' | 'operator' }>();
  for (const c of chats) if (!chatOf.has(String(c.chat_id))) chatOf.set(String(c.chat_id), c);
  const items: TimelineItem[] = [
    ...messages.map((m) => ({
      key: `m:${m.chat_id}:${m.message_id}`, kind: 'message' as const, at: m.sent_at, seenAt: m.inserted_at,
      chat: chatOf.get(String(m.chat_id))?.title ?? null, side: chatOf.get(String(m.chat_id))?.side ?? null,
      author: m.sender_name, outgoing: !!m.is_outgoing, text: m.text ?? '', media: m.media ?? null,
    })),
    ...drafts.map((d) => ({
      key: `d:${d.id}`, kind: 'draft' as const, at: d.created_at, seenAt: d.created_at,
      chat: d.chat_id != null ? chatOf.get(String(d.chat_id))?.title ?? null : null,
      side: d.chat_id != null ? chatOf.get(String(d.chat_id))?.side ?? null : null,
      text: d.body, status: d.status, why: d.why ?? null,
    })),
    ...notes.map((n) => ({ key: `n:${n.id}`, kind: 'note' as const, at: n.created_at, seenAt: n.created_at, text: n.body })),
  ];
  items.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.key.localeCompare(b.key));
  const latest = items.reduce<string | null>((acc, i) => (!acc || Date.parse(i.seenAt) > Date.parse(acc) ? i.seenAt : acc), null);
  const cursor = latest && (!after || Date.parse(latest) > Date.parse(after)) ? latest : after;
  return { items, cursor };
}

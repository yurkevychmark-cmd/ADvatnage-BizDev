/**
 * Приклади для агента: відповіді Марка з BizDev-чатів (таблиця agent_examples, правиться в
 * порталі без деплою). Агент отримує 3–5 найближчих до ситуації (критерій 4 таска 3/8).
 *
 * «Найближчі» — BM25 по словах повідомлення партнера, плюс бонус за той самий тип ситуації.
 * Без векторів: прикладів сотні, слова угод (access, voluum, hash, creatives…) розрізняють їх добре,
 * і пошук працює без ключа й без виклику моделі.
 */
import { findLeak, normalize, sameText } from './leak';

export interface Example {
  id: string;
  pair_id: string | null;
  chat: string | null;
  ts: string | null;
  situation_type: string | null;
  partner_author: string | null;
  partner_role: string | null;
  partner_message: string;
  reply: string;
  active: boolean;
}

export interface Query {
  pairId?: string | null;
  chat?: string | null;
  ts?: string | null;
  type?: string | null;
  partnerMessage: string;
  /** Відповідь, з якою порівнюватимуть (лише в бектесті): приклади, що її видають, не беремо. */
  hiddenReply?: string | null;
}

const STOP = new Set('the a an and or to of in on for is are be it this that we you i our your me my with at as by from can will do does did have has was were not no yes ok okay please thanks thank hi hey'.split(' '));
const tokens = (s: string) => normalize(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w));

/** Чи можна показати приклад для цього запиту (без «списування» і без погляду в майбутнє того ж чату). */
export function allowed(e: Example, q: Query): boolean {
  if (!e.active) return false;
  if (q.pairId && (e.id === q.pairId || e.pair_id === q.pairId)) return false;
  // у тому самому чаті — лише те, що було раніше: пізніші репліки можуть переказувати цю відповідь
  if (q.chat && e.chat === q.chat && q.ts && e.ts && e.ts >= q.ts) return false;
  if (q.hiddenReply) {
    if (sameText(e.reply, q.hiddenReply)) return false;
    if (findLeak(`${e.partner_message}\n${e.reply}`, q.hiddenReply)) return false;
  }
  return true;
}

export function nearest(pool: Example[], q: Query, k = 4): Example[] {
  const cands = pool.filter((e) => allowed(e, q));
  if (!cands.length) return [];
  const docs = cands.map((e) => tokens(e.partner_message));
  const avg = docs.reduce((s, d) => s + d.length, 0) / docs.length || 1;
  const df = new Map<string, number>();
  for (const d of docs) for (const w of new Set(d)) df.set(w, (df.get(w) ?? 0) + 1);
  const qt = [...new Set(tokens(q.partnerMessage))];
  const N = docs.length;
  const scored = cands.map((e, i) => {
    const d = docs[i];
    let s = 0;
    for (const w of qt) {
      const f = d.filter((x) => x === w).length;
      if (!f) continue;
      const idf = Math.log(1 + (N - (df.get(w) ?? 0) + 0.5) / ((df.get(w) ?? 0) + 0.5));
      s += idf * ((f * 2.2) / (f + 1.2 * (0.25 + 0.75 * (d.length / avg))));
    }
    if (q.type && e.situation_type === q.type) s += 1.5;
    return { e, s };
  });
  scored.sort((a, b) => b.s - a.s || (b.e.ts ?? '').localeCompare(a.e.ts ?? ''));
  // 3–5: щонайменше 3, якщо є з чого; з нульовою схожістю беремо лише для добору до 3
  const out = scored.filter((x) => x.s > 0).slice(0, Math.max(3, Math.min(5, k))).map((x) => x.e);
  for (const x of scored) { if (out.length >= 3) break; if (!out.includes(x.e)) out.push(x.e); }
  return out;
}

export const exampleBlock = (list: Example[]) =>
  list.map((e, i) => [
    `Приклад ${i + 1}${e.situation_type ? ` · ${e.situation_type}` : ''}`,
    `${e.partner_author ?? 'Партнер'}${e.partner_role ? ` (${e.partner_role})` : ''}: ${e.partner_message.replace(/\n/g, ' ⏎ ')}`,
    `Марко: ${e.reply.replace(/\n/g, ' ⏎ ')}`,
  ].join('\n')).join('\n\n');

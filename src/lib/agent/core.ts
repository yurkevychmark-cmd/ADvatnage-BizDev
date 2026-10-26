/**
 * Чиста частина прогону без бази й мережі: підказка чернетки з перевіркою «списування» і правило збігу.
 * Окремо від run.ts, щоб її можна було перевірити тестом (backtest/test/agent.test.mjs).
 */
import { nearest, exampleBlock, type Example } from './examples';
import { findLeak } from './leak';
import { RED_TYPES, SITUATION_TYPES, ACTIONS, draftSystem, draftUser, profileFor, lengthCheck, type Ctx } from './prompts';

export interface Pair {
  id: string; chat: string; chat_title: string | null; ts: string;
  partner_author: string | null; partner_role: string | null;
  partner_message: string; real_reply: string; context: Ctx[];
  relevant: boolean | null; filter_reason: string | null; situation_type: string | null;
}

/** Збіг: та сама дія, нічого не вигадано, тон і довжина в нормі. Червоний тип — збіг лише якщо агент передав Марку. */
export function decideMatch(type: string, draft: { route: string }, j: { same_action: boolean; invented_fact: boolean; tone_ok: boolean }, lengthOk: boolean) {
  if (RED_TYPES.has(type)) return draft.route === 'human' && !j.invented_fact;
  if (draft.route === 'human') return false;
  return j.same_action && !j.invented_fact && j.tone_ok && lengthOk;
}

/** Чернетка для пари з перевіркою «списування». Повертає підказку, щоб її можна було перевірити тестом. */
export function buildDraftPrompt(p: Pair, examples: Example[]) {
  const picked = nearest(examples, { pairId: p.id, chat: p.chat, ts: p.ts, type: p.situation_type, partnerMessage: p.partner_message, hiddenReply: p.real_reply }, 4);
  const prof = profileFor(p.real_reply);
  const system = draftSystem(prof.passport, prof.style, exampleBlock(picked));
  const user = draftUser({ context: p.context, partnerAuthor: p.partner_author, partnerRole: p.partner_role, partner: p.partner_message, chatTitle: p.chat_title });
  // Розмова й повідомлення партнера — те, що агент бачитиме й наживо; перевіряємо профіль, паспорт і приклади.
  const leak = findLeak(system, p.real_reply);
  return { system, user, picked, leak, profileLinesRemoved: prof.removed };
}


const TYPES = new Set(SITUATION_TYPES.map((t) => t.slug));

/** Відповідь сортувальника → поля пари. */
export function triageResult(out: any) {
  const relevant = out?.relevant === true;
  return {
    relevant,
    situation_type: TYPES.has(out?.type) ? (out.type as string) : 'other',
    filter_reason: relevant ? null : String(out?.reason ?? 'відповідь не про це повідомлення').slice(0, 400),
  };
}

export interface Draft { route: 'draft' | 'human'; messages: string[]; why: string | null; card_gap: string | null }

/** Відповідь агента → чернетка: до 3 повідомлень; «draft» без тексту рахується як передача Марку. */
export function normalizeDraft(d: any): Draft {
  const route = d?.route === 'human' ? 'human' : 'draft';
  const messages = route === 'draft' && Array.isArray(d.messages) ? d.messages.map(String).map((s: string) => s.trim()).filter(Boolean).slice(0, 3) : [];
  return { route: route === 'draft' && !messages.length ? 'human' : route, messages, why: d?.why ? String(d.why) : null, card_gap: d?.card_gap ? String(d.card_gap) : null };
}

/** Відповідь оцінювача → рядок backtest_evals; збіг рахує код (decideMatch), не модель. */
export function evalRow(sid: string, type: string, draft: Draft, j: any, realReply: string, judge: string) {
  const act = (v: unknown) => ((ACTIONS as readonly string[]).includes(String(v)) ? String(v) : null);
  const verdict = { same_action: j?.same_action === true, invented_fact: j?.invented_fact === true, tone_ok: j?.tone_ok !== false };
  if (draft.route === 'human') { verdict.invented_fact = false; verdict.tone_ok = true; }
  const len = draft.route === 'human' ? { ratio: null, ok: true } : lengthCheck(draft.messages.join('\n').length, realReply.length);
  const match = decideMatch(type, draft, verdict, len.ok);
  const reasons: string[] = [];
  if (!match) {
    if (RED_TYPES.has(type) && draft.route !== 'human') reasons.push('Тема для Марка (гроші, бани чи «ти бот?»), а агент відповів сам.');
    else if (!RED_TYPES.has(type) && draft.route === 'human') reasons.push('Агент передав Марку, а Марко відповів як у звичайній ситуації.');
    if (j?.reason) reasons.push(String(j.reason));
    if (verdict.invented_fact && j?.invented_what) reasons.push(`Вигадано: ${j.invented_what}.`);
    if (!len.ok && len.ratio !== null) reasons.push(`Довжина ${len.ratio > 1 ? 'в' : 'лише'} ${len.ratio.toFixed(1)}× від відповіді Марка.`);
  }
  return {
    situation_id: sid, marko_action: act(j?.marko_action), agent_action: draft.route === 'human' ? 'handed_off' : act(j?.agent_action),
    same_action: verdict.same_action, invented_fact: verdict.invented_fact, invented_what: verdict.invented_fact ? (j?.invented_what ?? null) : null,
    tone_ok: verdict.tone_ok, length_ratio: len.ratio, length_ok: len.ok, match, reason: reasons.join(' ') || null,
    judge_model: judge, created_at: new Date().toISOString(),
  };
}

/**
 * Пачки для прогону на підписці: один субагент пише кілька чернеток, тож у пачці не має бути ситуації,
 * чия відповідь Марка трапляється в підказці іншої ситуації з цієї ж пачки (через приклад, профіль чи розмову).
 */
export function packBatches<T extends { prompt: string; reply: string }>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (const it of items) {
    const ok = (b: T[]) => b.length < size && b.every((o) => !findLeak(o.prompt, it.reply) && !findLeak(it.prompt, o.reply));
    const b = batches.find(ok);
    if (b) b.push(it); else batches.push([it]);
  }
  return batches;
}

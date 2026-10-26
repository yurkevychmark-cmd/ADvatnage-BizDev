/**
 * Чиста частина прогону без бази й мережі: підказка чернетки з перевіркою «списування» і правило збігу.
 * Окремо від run.ts, щоб її можна було перевірити тестом (backtest/test/agent.test.mjs).
 */
import { nearest, exampleBlock, type Example } from './examples';
import { findLeak } from './leak';
import { RED_TYPES, draftSystem, draftUser, profileFor, type Ctx } from './prompts';

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


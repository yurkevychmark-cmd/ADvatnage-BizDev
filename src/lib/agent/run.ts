/**
 * Прогін автоматичного порівняння (таск cfb5898d, BizDev-агент · 3/8).
 *
 * 1. Сортування: оцінювач один раз на пару вирішує, чи відповідь Марка про це повідомлення, і тип ситуації.
 * 2. Приклади: доречні пари стають прикладами (agent_examples); наявні, зокрема виправлені в порталі, не чіпаємо.
 * 3. Для кожної доречної пари агент пише чернетку, не бачачи відповіді Марка: перевірка «списування»
 *    стоїть перед кожним викликом; знайшла — чернетки немає, ситуація позначена причиною.
 * 4. Інша модель оцінює чернетку проти відповіді Марка; збіг рахує код за правилом нижче.
 * Нічого нікуди не надсилається.
 */
import { supabase } from '../supabase';
import { chat, parseJsonObject, DRAFTER_MODEL, JUDGE_MODEL, usage } from './llm';
import type { Example } from './examples';
import { TRIAGE_SYSTEM, triageUser, JUDGE_SYSTEM, judgeUser } from './prompts';
import { buildDraftPrompt, triageResult, normalizeDraft, evalRow, type Pair } from './core';

const db = supabase as any;

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

async function must<T>(q: PromiseLike<{ data: T; error: any }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

export async function triage(pairs: Pair[], judgeModel: string) {
  await pool(pairs.filter((p) => p.relevant === null), 4, async (p) => {
    const out = parseJsonObject(await chat({
      model: judgeModel, system: TRIAGE_SYSTEM, effort: 'low',
      user: triageUser({ context: p.context, partnerAuthor: p.partner_author, partnerRole: p.partner_role, partner: p.partner_message, reply: p.real_reply }),
    }));
    const r = triageResult(out);
    await must(db.from('backtest_pairs').update({ ...r, triage_model: judgeModel }).eq('id', p.id));
    Object.assign(p, r);
  });
}

/** Доречні пари → приклади. Наявні рядки (і виправлені в порталі) не перезаписуються. */
export async function syncExamples(pairs: Pair[]) {
  const have = new Set(((await must(db.from('agent_examples').select('id'))) as { id: string }[]).map((r) => r.id));
  const fresh = pairs.filter((p) => p.relevant && !have.has(p.id)).map((p) => ({
    id: p.id, role: 'bizdev', pair_id: p.id, chat: p.chat, ts: p.ts, situation_type: p.situation_type,
    partner_author: p.partner_author, partner_role: p.partner_role, partner_message: p.partner_message, reply: p.real_reply,
  }));
  for (let i = 0; i < fresh.length; i += 100) await must(db.from('agent_examples').insert(fresh.slice(i, i + 100)));
  return fresh.length;
}

export async function loadExamples(): Promise<Example[]> {
  return (await must(db.from('agent_examples').select('*').eq('role', 'bizdev').eq('active', true))) as Example[];
}

export async function runBacktest(runId: string) {
  const run = (await must(db.from('backtest_runs').select('*').eq('id', runId).single())) as any;
  const drafter: string = run.drafter_model;
  const judge: string = run.judge_model;
  if (drafter === judge) throw new Error('оцінює та сама модель, що писала');
  const pairs = (await must(db.from('backtest_pairs').select('*').order('ts'))) as Pair[];

  await triage(pairs, judge);
  await syncExamples(pairs);
  const examples = await loadExamples();
  const relevant = pairs.filter((p) => p.relevant);
  await must(db.from('backtest_runs').update({ total: relevant.length }).eq('id', runId));

  let done = 0;
  const errors: string[] = [];
  await pool(relevant.map((p, i) => ({ p, i })), 4, async ({ p, i }) => {
    try { await one(p, i); } catch (e) { errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`); }
    done++;
    if (done % 5 === 0 || done === relevant.length) await must(db.from('backtest_runs').update({ done }).eq('id', runId));
  });
  if (errors.length) {
    console.error('[backtest] run', runId, errors);
    await must(db.from('backtest_runs').update({ error: `${errors.length} без оцінки: ${errors.slice(0, 3).join(' · ')}`.slice(0, 500) }).eq('id', runId));
  }

  async function one(p: Pair, i: number) {
    const sid = `${runId}-${p.id}`;
    const type = p.situation_type ?? 'other';
    const prompt = buildDraftPrompt(p, examples);
    await must(db.from('backtest_situations').upsert({
      id: sid, run_id: runId, kind: 'pair', situation_type: type, source_chat: p.chat, source_title: p.chat_title, source_ts: p.ts,
      card: null, context: p.context, partner_message: p.partner_message, real_reply: p.real_reply, sort_order: i + 1,
      partner_author: p.partner_author, partner_role: p.partner_role, pair_id: p.id, example_ids: prompt.picked.map((e) => e.id),
    }, { onConflict: 'id' }));
    if (prompt.leak) throw new Error(`«списування» в ${p.id}: «${prompt.leak}»`); // не мало статися: приклади й профіль уже почищено

    const d = parseJsonObject(await chat({ model: drafter, system: prompt.system, user: prompt.user, effort: 'medium' }));
    const draft = normalizeDraft(d);
    await must(db.from('backtest_drafts').upsert({
      situation_id: sid, route: draft.route, messages: draft.messages, why: draft.why,
      card_gap: draft.card_gap, model: drafter, created_at: new Date().toISOString(),
    }, { onConflict: 'situation_id' }));

    const j = parseJsonObject(await chat({
      model: judge, system: JUDGE_SYSTEM, effort: 'high',
      user: judgeUser({ context: p.context, partnerAuthor: p.partner_author, partnerRole: p.partner_role, partner: p.partner_message, reply: p.real_reply, draft }),
    }));
    await must(db.from('backtest_evals').upsert(evalRow(sid, type, draft, j, p.real_reply, judge), { onConflict: 'situation_id' }));
  }
}

/** Запуск у фоні: відповідь кнопці повертається одразу, прогрес — у backtest_runs. */
export async function startRun(startedBy: string | null) {
  const { data: busy } = await db.from('backtest_runs').select('id, started_at').eq('status', 'running');
  const live = (busy ?? []).filter((r: any) => Date.now() - Date.parse(r.started_at) < 2 * 3600_000);
  if (live.length) return { error: `Run ${live[0].id} is still going` };
  for (const r of busy ?? []) await db.from('backtest_runs').update({ status: 'failed', error: 'перервано (сервер перезапускався)', finished_at: new Date().toISOString() }).eq('id', r.id);

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const id = `bt3-${stamp.slice(0, 8)}-${stamp.slice(8)}`;
  const drafter = DRAFTER_MODEL();
  const judge = JUDGE_MODEL();
  if (drafter === judge) return { error: 'Drafter and judge must be different models' };
  const { error } = await db.from('backtest_runs').insert({ id, drafter_model: drafter, judge_model: judge, started_by: startedBy });
  if (error) return { error: error.message };
  const before = { ...usage };
  const tokens = () => `${usage.calls - before.calls} calls, in ${usage.input - before.input}, out ${usage.output - before.output}`;
  runBacktest(id)
    .finally(() => console.log('[backtest] run', id, 'tokens:', tokens()))
    .then(() => db.from('backtest_runs').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', id))
    .catch((e: unknown) => {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[backtest] run', id, msg);
      return db.from('backtest_runs').update({ status: 'failed', error: msg.slice(0, 500), finished_at: new Date().toISOString() }).eq('id', id);
    });
  return { id };
}

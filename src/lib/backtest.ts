/** Бектест BizDev-агента (таск cfb5898d): типи ситуацій і зведення. */

export const TYPE_LABELS: Record<string, { label: string; red?: boolean }> = {
  access: { label: 'Access & technical issues' },
  timing: { label: 'Timing & status' },
  materials: { label: 'Materials & links' },
  scheduling: { label: 'Calls & scheduling' },
  advice: { label: 'Work advice' },
  results: { label: 'Results & numbers' },
  smalltalk: { label: 'Thanks & small talk' },
  money: { label: 'Money, payments & deal terms', red: true },
  ban: { label: 'Bans, disputes, pausing the deal', red: true },
  botq: { label: '“Are you a bot?”', red: true },
  trial_start: { label: 'Trial start' },
  weak_numbers: { label: 'Weak numbers' },
  new_geo: { label: 'New geo request' },
  report_late: { label: 'Report is late' },
  partner_silent: { label: 'Partner went quiet' },
  integration: { label: 'Integration & access' },
  creatives: { label: 'Creatives' },
  next_steps: { label: 'Status & next steps' },
  relay: { label: 'Buyer ↔ operator coordination' },
  other: { label: 'Other' },
};

export const typeLabel = (slug: string) => TYPE_LABELS[slug]?.label ?? slug;

export type Verdict = 'same' | 'no' | 'edited';
export const VERDICTS: Verdict[] = ['same', 'no', 'edited'];

export interface BacktestItem {
  id: string;
  kind: 'archive' | 'synthetic';
  type: string;
  title: string | null;
  ts: string | null;
  card: Record<string, unknown> | null;
  context: { ours: boolean; author: string; role?: string; ts?: string; text: string }[];
  partner: string;
  partnerAuthor: string | null;
  partnerRole: string | null;
  realReply: string | null;
  draft: { route: 'draft' | 'human' | 'none'; messages: string[]; why: string | null; cardGap: string | null; model: string } | null;
  decision: { verdict: Verdict; editedText: string | null; note: string | null; decidedBy: string | null; decidedAt: string } | null;
}

/** PostgREST віддає 1:1-вкладення то об'єктом, то масивом — приводимо до одного вигляду. */
const one = <T>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export function toItems(rows: any[]): BacktestItem[] {
  return rows.map((r) => {
    const d = one<any>(r.backtest_drafts);
    const x = one<any>(r.backtest_decisions);
    return {
      id: r.id,
      kind: r.kind,
      type: r.situation_type,
      title: r.source_title,
      ts: r.source_ts,
      card: r.card,
      context: r.context ?? [],
      partner: r.partner_message,
      partnerAuthor: r.partner_author ?? null,
      partnerRole: r.partner_role ?? null,
      realReply: r.real_reply,
      draft: d ? { route: d.route, messages: d.messages ?? [], why: d.why, cardGap: d.card_gap, model: d.model } : null,
      decision: x ? { verdict: x.verdict, editedText: x.edited_text, note: x.note, decidedBy: x.decided_by, decidedAt: x.decided_at } : null,
    };
  });
}

/** Прогони бектесту, новіший першим (bt1 — чати менторства, bt2 — BizDev-чати по трафіку). */
export const RUN_LABELS: Record<string, string> = {
  bt1: 'Run 1 · mentorship chats',
  bt2: 'Run 2 · BizDev traffic chats',
};

export async function loadRun(supabase: any, requested: string | null) {
  const { data: runRows } = await supabase.from('backtest_situations').select('run_id, created_at');
  const latest = new Map<string, string>();
  for (const r of runRows ?? []) if (!latest.has(r.run_id) || r.created_at > latest.get(r.run_id)!) latest.set(r.run_id, r.created_at);
  const runs = [...latest.entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id);
  const run = requested && runs.includes(requested) ? requested : runs[0] ?? null;
  if (!run) return { runs, run, items: [] as BacktestItem[], error: null };
  const { data, error } = await supabase
    .from('backtest_situations')
    .select('*, backtest_drafts(*), backtest_decisions(*)')
    .eq('run_id', run)
    .order('sort_order');
  return { runs, run, items: toItems(data ?? []), error };
}

export interface TypeSummary {
  type: string;
  total: number;
  marked: number;
  same: number;
  no: number;
  edited: number;
}

/** Зведення по типах: частка «так би і я» — від розмічених, не від усіх. */
export function summarize(items: BacktestItem[]): TypeSummary[] {
  const by = new Map<string, TypeSummary>();
  for (const it of items) {
    const s = by.get(it.type) ?? { type: it.type, total: 0, marked: 0, same: 0, no: 0, edited: 0 };
    s.total++;
    if (it.decision) { s.marked++; s[it.decision.verdict]++; }
    by.set(it.type, s);
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.type.localeCompare(b.type));
}

// ── Автоматичне порівняння (bt3, правка Марка 26.10): без ручної розмітки ──────────────────

/** Прогін автоматичного порівняння: id виду bt3-20261026-1412. */
export const isAutoRun = (run: string | null) => !!run && run.startsWith('bt3-');
export const runLabel = (run: string) =>
  RUN_LABELS[run] ?? (isAutoRun(run) ? `Auto · ${run.slice(4, 8)}-${run.slice(8, 10)}-${run.slice(10, 12)} ${run.slice(13, 15)}:${run.slice(15, 17)}` : run);

/** Планка автономності з плану v1.2: ≥90% збігів на 15+ ситуаціях типу. */
export const AUTONOMY = { minShare: 0.9, minCount: 15 };

export interface AutoItem {
  id: string; type: string; title: string | null; ts: string | null;
  context: BacktestItem['context']; partner: string; partnerAuthor: string | null; partnerRole: string | null;
  realReply: string; exampleIds: string[];
  draft: { route: string; messages: string[]; why: string | null; model: string } | null;
  ev: {
    markoAction: string | null; agentAction: string | null; sameAction: boolean; inventedFact: boolean; inventedWhat: string | null;
    toneOk: boolean; lengthRatio: number | null; lengthOk: boolean; match: boolean; reason: string | null; judgeModel: string;
  } | null;
}

export interface FilteredPair { id: string; chat: string; title: string | null; ts: string; partner: string; reply: string; reason: string | null }

export async function loadAutoRun(supabase: any, run: string) {
  const [{ data: rows, error }, { data: runRow }, { data: filtered }, { count: pending }] = await Promise.all([
    supabase.from('backtest_situations').select('*, backtest_drafts(*), backtest_evals(*)').eq('run_id', run).order('sort_order'),
    supabase.from('backtest_runs').select('*').eq('id', run).maybeSingle(),
    supabase.from('backtest_pairs').select('id, chat, chat_title, ts, partner_message, real_reply, filter_reason').eq('relevant', false).order('ts'),
    supabase.from('backtest_pairs').select('id', { count: 'exact', head: true }).is('relevant', null),
  ]);
  const items: AutoItem[] = (rows ?? []).map((r: any) => {
    const d = one<any>(r.backtest_drafts);
    const e = one<any>(r.backtest_evals);
    return {
      id: r.id, type: r.situation_type, title: r.source_title, ts: r.source_ts, context: r.context ?? [],
      partner: r.partner_message, partnerAuthor: r.partner_author, partnerRole: r.partner_role, realReply: r.real_reply ?? '',
      exampleIds: r.example_ids ?? [],
      draft: d ? { route: d.route, messages: d.messages ?? [], why: d.why, model: d.model } : null,
      ev: e ? {
        markoAction: e.marko_action, agentAction: e.agent_action, sameAction: e.same_action, inventedFact: e.invented_fact,
        inventedWhat: e.invented_what, toneOk: e.tone_ok, lengthRatio: e.length_ratio, lengthOk: e.length_ok, match: e.match,
        reason: e.reason, judgeModel: e.judge_model,
      } : null,
    };
  });
  const filteredPairs: FilteredPair[] = (filtered ?? []).map((p: any) => ({
    id: p.id, chat: p.chat, title: p.chat_title, ts: p.ts, partner: p.partner_message, reply: p.real_reply, reason: p.filter_reason,
  }));
  return { items, run: runRow ?? null, filteredPairs, unsorted: pending ?? 0, error };
}

export interface AutoTypeSummary { type: string; total: number; evaluated: number; match: number; share: number | null; status: 'self' | 'ask' | 'human'; why: string }

/** Зведення по типах: частка збігів і рішення «веде сам» / «питає Марка» за планкою з плану. */
export function summarizeAuto(items: AutoItem[]): AutoTypeSummary[] {
  const by = new Map<string, AutoTypeSummary>();
  for (const it of items) {
    const s = by.get(it.type) ?? { type: it.type, total: 0, evaluated: 0, match: 0, share: null, status: 'ask', why: '' };
    s.total++;
    if (it.ev) { s.evaluated++; if (it.ev.match) s.match++; }
    by.set(it.type, s);
  }
  for (const s of by.values()) {
    s.share = s.evaluated ? s.match / s.evaluated : null;
    if (TYPE_LABELS[s.type]?.red) { s.status = 'human'; s.why = 'Never on its own: money, bans or “are you a bot?”'; }
    else if (s.evaluated >= AUTONOMY.minCount && (s.share ?? 0) >= AUTONOMY.minShare) { s.status = 'self'; s.why = `≥${AUTONOMY.minShare * 100}% on ${s.evaluated} situations`; }
    else if (s.evaluated < AUTONOMY.minCount) { s.status = 'ask'; s.why = `Only ${s.evaluated} situations, needs ${AUTONOMY.minCount}+`; }
    else { s.status = 'ask'; s.why = `${Math.round((s.share ?? 0) * 100)}% match, needs ${AUTONOMY.minShare * 100}%`; }
  }
  return [...by.values()].sort((a, b) => b.total - a.total || a.type.localeCompare(b.type));
}

export const ACTION_LABELS: Record<string, string> = {
  answered: 'answered', clarified: 'asked to clarify', promised: 'promised to check', relayed: 'passed it on',
  ack: 'short thanks / ok', handed_off: 'handed to Marko',
};

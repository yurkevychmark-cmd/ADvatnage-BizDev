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

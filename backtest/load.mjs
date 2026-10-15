// Завантажує ситуації й чернетки бектесту в bizdev-db (SQL іде через ssh у docker exec, у лозі
// SQL немає). Повторний запуск оновлює ситуації й чернетки, але НЕ чіпає рішення Марка.
//   node load.mjs <situations.json> <drafts-out-dir> <run-id> <model> [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';

const [, , sitFile, draftsDir, runId, model] = process.argv;
const dry = process.argv.includes('--dry-run');
if (!sitFile || !draftsDir || !runId || !model) { console.error('usage: load.mjs <situations.json> <drafts-dir> <run-id> <model> [--dry-run]'); process.exit(2); }

const situations = JSON.parse(fs.readFileSync(sitFile, 'utf8'));
const drafts = new Map();
for (const f of fs.readdirSync(draftsDir).filter((x) => x.endsWith('.json'))) {
  for (const d of JSON.parse(fs.readFileSync(path.join(draftsDir, f), 'utf8'))) drafts.set(d.id, d);
}

// Перевірка до запису: кожна ситуація має чернетку; форма чернетки відповідає route.
const problems = [];
for (const s of situations) {
  const d = drafts.get(s.id);
  if (!d) { problems.push(`${s.id}: немає чернетки`); continue; }
  if (!['draft', 'human', 'none'].includes(d.route)) problems.push(`${s.id}: route ${d.route}`);
  if (!Array.isArray(d.messages) || d.messages.some((m) => typeof m !== 'string' || !m.trim())) problems.push(`${s.id}: messages`);
  if (d.route === 'draft' && (d.messages.length < 1 || d.messages.length > 3)) problems.push(`${s.id}: ${d.messages.length} повідомлень`);
  if (d.route !== 'draft' && d.messages.length) problems.push(`${s.id}: route ${d.route} з текстом`);
  if (!d.why || !String(d.why).trim()) problems.push(`${s.id}: немає why`);
}
for (const id of drafts.keys()) if (!situations.some((s) => s.id === id)) problems.push(`${id}: чернетка без ситуації`);
if (problems.length) { console.error(problems.join('\n')); process.exit(1); }

const rows = situations.map((s, i) => {
  const d = drafts.get(s.id);
  return {
    id: `${runId}-${s.id}`, run_id: runId, kind: s.kind, situation_type: s.type,
    source_chat: s.source?.chat ?? null, source_title: s.source?.title ?? null, source_ts: s.source?.ts ?? null,
    card: s.card, context: s.context, partner_message: s.partner, real_reply: s.realReply, sort_order: i + 1,
    partner_author: s.partnerAuthor ?? null, partner_role: s.partnerRole ?? null,
    draft: { route: d.route, messages: d.messages, why: String(d.why).trim(), card_gap: d.card_gap ?? null },
  };
});

const tag = `j${randomBytes(6).toString('hex')}`;
const json = JSON.stringify(rows);
if (json.includes(`$${tag}$`)) throw new Error('збіг тега');
const sql = `
begin;
with data as (select $${tag}$${json}$${tag}$::jsonb as d), r as (select jsonb_array_elements(d) as x from data)
insert into backtest_situations (id, run_id, kind, situation_type, source_chat, source_title, source_ts, card, context, partner_message, real_reply, sort_order, partner_author, partner_role)
select x->>'id', x->>'run_id', x->>'kind', x->>'situation_type', x->>'source_chat', x->>'source_title', x->>'source_ts',
       nullif(x->'card', 'null'::jsonb), x->'context', x->>'partner_message', x->>'real_reply', (x->>'sort_order')::int, x->>'partner_author', x->>'partner_role' from r
on conflict (id) do update set situation_type = excluded.situation_type, source_title = excluded.source_title, card = excluded.card,
  context = excluded.context, partner_message = excluded.partner_message, real_reply = excluded.real_reply, sort_order = excluded.sort_order,
  partner_author = excluded.partner_author, partner_role = excluded.partner_role;
with data as (select $${tag}$${json}$${tag}$::jsonb as d), r as (select jsonb_array_elements(d) as x from data)
insert into backtest_drafts (situation_id, route, messages, why, card_gap, model)
select x->>'id', x->'draft'->>'route', x->'draft'->'messages', x->'draft'->>'why', x->'draft'->>'card_gap', ${"'" + model.replace(/'/g, "''") + "'"} from r
on conflict (situation_id) do update set route = excluded.route, messages = excluded.messages, why = excluded.why, card_gap = excluded.card_gap, model = excluded.model, created_at = now();
select 'situations=' || count(*) from backtest_situations where run_id = '${runId.replace(/'/g, "''")}';
select 'drafts=' || count(*) from backtest_drafts d join backtest_situations s on s.id = d.situation_id where s.run_id = '${runId.replace(/'/g, "''")}';
commit;
`;

if (dry) { console.log(`ок: ${rows.length} ситуацій, ${drafts.size} чернеток; SQL ${sql.length} байт (без запису)`); process.exit(0); }
const host = process.env.BIZDEV_HOST ?? 'marko@144.91.104.211';
const r = spawnSync('ssh', ['-o', 'BatchMode=yes', host, 'docker exec -i bizdev-db psql -U bizdev -d bizdev -qAt -v ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
process.stdout.write(r.stdout);
if (r.status !== 0) { console.error(r.stderr.split('\n').filter((l) => !/\$/.test(l)).join('\n')); process.exit(1); }

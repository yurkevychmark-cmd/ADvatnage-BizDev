// Прогін бектесту на підписці (таск cfb5898d, рішення Марка 26.10): поки агента налаштовуємо, моделі не
// йдуть через API — чернетки пише Sonnet, оцінює Opus, обидва субагентами Claude Code у робочому чаті.
// Підказки будує той самий код, що й прогін через API (src/lib/agent), результати лягають у ті самі таблиці.
//
//   node run-local.mjs triage  --dir D   пари без сортування → D/triage/*.json (субагент Opus)
//   node run-local.mjs drafts  --dir D   (спершу застосовує D/triage/*.out.json) новий прогін, D/drafter/*.json (субагенти Sonnet)
//   node run-local.mjs judge   --dir D   чернетки з D/drafter/*.out.json → база, D/judge/*.json (субагенти Opus)
//   node run-local.mjs finish  --dir D   оцінки з D/judge/*.out.json → база, прогін «done»
//
// D — тека поза git (дані чатів). У D/drafter лише те, що бачить агент: жодної відповіді Марка.
// Вихід субагента — D/<фаза>/<пачка>.out.json: {"<id>": <JSON, якого просить підказка>, …}.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { loadAgent } from './lib/agent-bundle.mjs';

const DRAFTER = 'claude-sonnet-5-5 (subscription)';
const JUDGE = 'claude-opus-5-5 (subscription)';
const SIZE = { triage: 20, drafter: 8, judge: 12 };

const [, , cmd] = process.argv;
const di = process.argv.indexOf('--dir');
const dir = di > 0 ? path.resolve(process.argv[di + 1]) : null;
if (!cmd || !dir) { console.error('usage: run-local.mjs triage|drafts|judge|finish --dir <тека поза git>'); process.exit(2); }
if (!spawnSync('git', ['-C', dir, 'rev-parse'], { stdio: 'ignore' }).status) { console.error('тека в git-репозиторії: дані чатів туди не кладемо'); process.exit(2); }

const host = process.env.BIZDEV_HOST ?? 'marko@144.91.104.211';
function psql(sql) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', host, 'docker exec -i bizdev-db psql -U bizdev -d bizdev -qAt -v ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(r.stderr.split('\n').filter((l) => !/\$j/.test(l)).join('\n'));
  return r.stdout.trim();
}
const rows = (sql) => JSON.parse(psql(`select coalesce(json_agg(t), '[]') from (${sql}) t;`) || '[]');
/** jsonb-літерал з випадковим тегом: дані чатів ідуть у SQL без екранування. */
function lit(v) {
  const json = JSON.stringify(v);
  const tag = `j${randomBytes(6).toString('hex')}`;
  if (json.includes(`$${tag}$`)) throw new Error('збіг тега');
  return `$${tag}$${json}$${tag}$::jsonb`;
}

const A = await loadAgent();
const statePath = path.join(dir, 'state.json');
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const writeJson = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 }); fs.writeFileSync(f, JSON.stringify(v, null, 1), { mode: 0o600 }); };

function writeBatches(phase, items, system) {
  const d = path.join(dir, phase);
  fs.rmSync(d, { recursive: true, force: true });
  const batches = phase === 'drafter' ? A.packBatches(items, SIZE.drafter) : chunk(items, SIZE[phase]);
  batches.forEach((b, i) => writeJson(path.join(d, `${phase}-${String(i + 1).padStart(2, '0')}.json`), {
    ...(system ? { system } : {}), items: b.map(({ reply: _r, prompt: _p, ...x }) => x),
  }));
  console.log(`${phase}: ${items.length} у ${batches.length} пачках → ${d}`);
}
const chunk = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Виходи субагентів фази: id → JSON. Пропущені id повертаються окремо. */
function readOutputs(phase, ids) {
  const d = path.join(dir, phase);
  const out = {};
  for (const f of fs.existsSync(d) ? fs.readdirSync(d).filter((n) => n.endsWith('.out.json')) : []) {
    try { Object.assign(out, readJson(path.join(d, f))); } catch (e) { console.error(`${f}: не JSON (${e.message})`); }
  }
  return { out, missing: ids.filter((id) => !(id in out)) };
}

const loadPairs = () => rows('select * from backtest_pairs order by ts');

if (cmd === 'triage') {
  const todo = loadPairs().filter((p) => p.relevant === null);
  if (!todo.length) { console.log('triage: усі пари вже відсортовані'); process.exit(0); }
  writeBatches('triage', todo.map((p) => ({ id: p.id, user: A.triageUser({ context: p.context, partnerAuthor: p.partner_author, partnerRole: p.partner_role, partner: p.partner_message, reply: p.real_reply }) })), A.TRIAGE_SYSTEM);
}

if (cmd === 'drafts') {
  let pairs = loadPairs();
  const todo = pairs.filter((p) => p.relevant === null);
  if (todo.length) {
    const { out, missing } = readOutputs('triage', todo.map((p) => p.id));
    if (missing.length) { console.error(`без сортування ${missing.length} пар: спершу triage і субагенти`); process.exit(1); }
    const upd = todo.map((p) => ({ id: p.id, ...A.triageResult(out[p.id]) }));
    psql(`update backtest_pairs b set relevant = (x->>'relevant')::boolean, filter_reason = x->>'filter_reason', situation_type = x->>'situation_type', triage_model = '${JUDGE}'
      from jsonb_array_elements(${lit(upd)}) x where b.id = x->>'id';`);
    pairs = loadPairs();
  }
  const live = rows(`select id from backtest_runs where status = 'running' and started_at > now() - interval '6 hours'`);
  if (live.length) { console.error(`прогін ${live[0].id} ще йде`); process.exit(1); }

  // доречні пари → приклади (наявні, зокрема виправлені в порталі, не чіпаємо) — як syncExamples
  psql(`insert into agent_examples (id, role, pair_id, chat, ts, situation_type, partner_author, partner_role, partner_message, reply)
    select id, 'bizdev', id, chat, ts, situation_type, partner_author, partner_role, partner_message, real_reply from backtest_pairs where relevant
    on conflict (id) do nothing;`);
  const examples = rows(`select * from agent_examples where role = 'bizdev' and active`);
  const relevant = pairs.filter((p) => p.relevant);

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  const runId = `bt3-${stamp.slice(0, 8)}-${stamp.slice(8)}`;
  const situations = [];
  const items = [];
  relevant.forEach((p, i) => {
    const pr = A.buildDraftPrompt(p, examples);
    if (pr.leak) throw new Error(`«списування» в ${p.id}: «${pr.leak}»`);
    const sid = `${runId}-${p.id}`;
    situations.push({ id: sid, run_id: runId, kind: 'pair', situation_type: p.situation_type ?? 'other', source_chat: p.chat, source_title: p.chat_title, source_ts: p.ts,
      context: p.context, partner_message: p.partner_message, real_reply: p.real_reply, sort_order: i + 1,
      partner_author: p.partner_author, partner_role: p.partner_role, pair_id: p.id, example_ids: pr.picked.map((e) => e.id) });
    items.push({ id: sid, system: pr.system, user: pr.user, prompt: `${pr.system}\n${pr.user}`, reply: p.real_reply });
  });
  psql(`begin;
    insert into backtest_runs (id, drafter_model, judge_model, started_by, total) values ('${runId}', '${DRAFTER}', '${JUDGE}', 'chat: Dev - BLACK ORACLE #1', ${relevant.length});
    insert into backtest_situations (id, run_id, kind, situation_type, source_chat, source_title, source_ts, card, context, partner_message, real_reply, sort_order, partner_author, partner_role, pair_id, example_ids)
    select x->>'id', x->>'run_id', 'pair', x->>'situation_type', x->>'source_chat', x->>'source_title', x->>'source_ts', null, x->'context', x->>'partner_message', x->>'real_reply',
      (x->>'sort_order')::int, x->>'partner_author', x->>'partner_role', x->>'pair_id', x->'example_ids'
    from jsonb_array_elements(${lit(situations)}) x;
    commit;`);
  writeJson(statePath, { runId });
  writeBatches('drafter', items, null);
  // повторна перевірка вже записаних файлів: жодна відповідь Марка з пачки не трапляється в жодній підказці пачки
  const replyOf = new Map(items.map((x) => [x.id, x.reply]));
  for (const f of fs.readdirSync(path.join(dir, 'drafter'))) {
    const batch = readJson(path.join(dir, 'drafter', f)).items;
    for (const x of batch) for (const y of batch) {
      const leak = A.findLeak(`${x.system}\n${x.user}`, replyOf.get(y.id));
      if (leak) throw new Error(`${f}: у підказці ${x.id} відповідь ${y.id} («${leak}»)`);
    }
  }
  console.log(`прогін ${runId}: ${relevant.length} ситуацій`);
}

if (cmd === 'judge' || cmd === 'finish') {
  const { runId } = readJson(statePath);
  const sits = rows(`select s.*, d.route, d.messages from backtest_situations s left join backtest_drafts d on d.situation_id = s.id where s.run_id = '${runId}' order by s.sort_order`);
  if (cmd === 'judge') {
    const { out, missing } = readOutputs('drafter', sits.map((s) => s.id));
    const drafts = Object.entries(out).filter(([id]) => sits.some((s) => s.id === id)).map(([id, d]) => ({ situation_id: id, ...A.normalizeDraft(d) }));
    psql(`insert into backtest_drafts (situation_id, route, messages, why, card_gap, model, created_at)
      select x->>'situation_id', x->>'route', x->'messages', x->>'why', x->>'card_gap', '${DRAFTER}', now()
      from jsonb_array_elements(${lit(drafts)}) x
      on conflict (situation_id) do update set route = excluded.route, messages = excluded.messages, why = excluded.why, card_gap = excluded.card_gap, model = excluded.model, created_at = excluded.created_at;`);
    const byId = new Map(drafts.map((d) => [d.situation_id, d]));
    writeBatches('judge', sits.filter((s) => byId.has(s.id)).map((s) => ({ id: s.id, user: A.judgeUser({ context: s.context, partnerAuthor: s.partner_author, partnerRole: s.partner_role, partner: s.partner_message, reply: s.real_reply, draft: byId.get(s.id) }) })), A.JUDGE_SYSTEM);
    if (missing.length) console.log(`без чернетки ${missing.length}: ${missing.slice(0, 5).join(', ')}`);
  } else {
    const drafted = sits.filter((s) => s.route);
    const { out, missing } = readOutputs('judge', drafted.map((s) => s.id));
    const evals = drafted.filter((s) => out[s.id]).map((s) => A.evalRow(s.id, s.situation_type ?? 'other', { route: s.route, messages: s.messages ?? [], why: null, card_gap: null }, out[s.id], s.real_reply, JUDGE));
    const lost = [...sits.filter((s) => !s.route).map((s) => `${s.pair_id}: без чернетки`), ...missing.map((id) => `${id.slice(runId.length + 1)}: без оцінки`)];
    psql(`begin;
      insert into backtest_evals (situation_id, marko_action, agent_action, same_action, invented_fact, invented_what, tone_ok, length_ratio, length_ok, match, reason, judge_model, created_at)
      select x->>'situation_id', x->>'marko_action', x->>'agent_action', (x->>'same_action')::boolean, (x->>'invented_fact')::boolean, x->>'invented_what', (x->>'tone_ok')::boolean,
        (x->>'length_ratio')::real, (x->>'length_ok')::boolean, (x->>'match')::boolean, x->>'reason', x->>'judge_model', now()
      from jsonb_array_elements(${lit(evals)}) x
      on conflict (situation_id) do update set marko_action = excluded.marko_action, agent_action = excluded.agent_action, same_action = excluded.same_action,
        invented_fact = excluded.invented_fact, invented_what = excluded.invented_what, tone_ok = excluded.tone_ok, length_ratio = excluded.length_ratio,
        length_ok = excluded.length_ok, match = excluded.match, reason = excluded.reason, judge_model = excluded.judge_model, created_at = excluded.created_at;
      update backtest_runs set status = 'done', done = ${evals.length}, finished_at = now(), error = ${lost.length ? lit(`${lost.length} без оцінки: ${lost.slice(0, 3).join(' · ')}`.slice(0, 500)) + "#>>'{}'" : 'null'} where id = '${runId}';
      commit;`);
    const m = evals.filter((e) => e.match).length;
    console.log(`прогін ${runId}: оцінено ${evals.length} з ${sits.length}, збігів ${m}${lost.length ? `; без оцінки ${lost.length}` : ''}`);
  }
}

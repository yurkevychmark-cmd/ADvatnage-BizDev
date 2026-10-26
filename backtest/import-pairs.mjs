// Усі пари «повідомлення партнера → відповідь Марка» з BizDev-чатів у bizdev-db (таск cfb5898d,
// правка Марка 26.10: беруться всі пари, а не 50 відібраних).
//   node import-pairs.mjs <папка BizDev> [--dry-run] [--out pairs.json]   (--out: лише у файл, для тесту; файл поза git)
// Сирі чати лишаються на Mac: у базу йде лише замасковане (lib/mask-archive.mjs). Відповідь Марка
// чекаємо до 48 год (ввечері й на вихідних він відповідає зранку); чи вона справді про це
// повідомлення, вирішує сортування в прогоні, і відсіяне видно з причиною.
// Повторний запуск оновлює тексти; якщо текст пари змінився — сортування пари скидається.
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { loadBizdevFolder } from './lib/bizdev-archive.mjs';
import { candidates } from './lib/archive.mjs';
import { maskArchive } from './lib/mask-archive.mjs';

const [, , dir] = process.argv;
const dry = process.argv.includes('--dry-run');
if (!dir) { console.error('usage: import-pairs.mjs <BizDev dir> [--dry-run]'); process.exit(2); }

const docxText = (f) => execFileSync('textutil', ['-convert', 'txt', '-stdout', f], { encoding: 'utf8' });
const chats = loadBizdevFolder(dir, docxText);
const join = (ms) => ms.map((m) => (m.text || (m.media ? '[медіа]' : ''))).filter(Boolean).join('\n').trim();
const mask = (t) => maskArchive(t).text;

export const pairId = (chat, ts, author) => `p_${createHash('sha256').update(`${chat}|${ts}|${author}`).digest('hex').slice(0, 16)}`;

const rows = chats.flatMap((ch) => candidates(ch, { maxReplyMinutes: 48 * 60 })).map((c) => ({
  id: pairId(c.chat, c.partner[0].ts, c.partner[0].author),
  chat: c.chat, chat_title: c.title, ts: c.partner[0].ts,
  partner_author: c.partner[0].author, partner_role: c.partner[0].role,
  partner_message: mask(join(c.partner)), real_reply: mask(join(c.reply)), reply_ts: c.reply[0].ts,
  context: c.context.map((m) => ({ ours: m.ours || m.staff, author: m.author, role: m.role, ts: m.ts, text: mask(m.text || (m.media ? '[медіа]' : '')).slice(0, 600) })),
}));

const ids = new Set(rows.map((r) => r.id));
if (ids.size !== rows.length) throw new Error('дубль id пари');
console.log(`пар ${rows.length}; чатів ${new Set(rows.map((r) => r.chat)).size}`);
const outIdx = process.argv.indexOf('--out');
if (outIdx > 0) { fs.writeFileSync(process.argv[outIdx + 1], JSON.stringify(rows, null, 1), { mode: 0o600 }); process.exit(0); }
if (dry) process.exit(0);

const tag = `j${randomBytes(6).toString('hex')}`;
const json = JSON.stringify(rows);
if (json.includes(`$${tag}$`)) throw new Error('збіг тега');
const sql = `
begin;
with data as (select $${tag}$${json}$${tag}$::jsonb as d), r as (select jsonb_array_elements(d) as x from data)
insert into backtest_pairs (id, chat, chat_title, ts, partner_author, partner_role, partner_message, real_reply, reply_ts, context)
select x->>'id', x->>'chat', x->>'chat_title', x->>'ts', x->>'partner_author', x->>'partner_role', x->>'partner_message', x->>'real_reply', x->>'reply_ts', x->'context' from r
on conflict (id) do update set chat_title = excluded.chat_title, partner_role = excluded.partner_role,
  partner_message = excluded.partner_message, real_reply = excluded.real_reply, reply_ts = excluded.reply_ts, context = excluded.context,
  relevant = case when backtest_pairs.partner_message = excluded.partner_message and backtest_pairs.real_reply = excluded.real_reply then backtest_pairs.relevant end,
  filter_reason = case when backtest_pairs.partner_message = excluded.partner_message and backtest_pairs.real_reply = excluded.real_reply then backtest_pairs.filter_reason end,
  situation_type = case when backtest_pairs.partner_message = excluded.partner_message and backtest_pairs.real_reply = excluded.real_reply then backtest_pairs.situation_type end;
select 'pairs=' || count(*) from backtest_pairs;
commit;
`;
const host = process.env.BIZDEV_HOST ?? 'marko@144.91.104.211';
const r = spawnSync('ssh', ['-o', 'BatchMode=yes', host, 'docker exec -i bizdev-db psql -U bizdev -d bizdev -qAt -v ON_ERROR_STOP=1'], { input: sql, encoding: 'utf8' });
process.stdout.write(r.stdout);
if (r.status !== 0) { console.error(r.stderr.split('\n').filter((l) => !/\$/.test(l)).join('\n')); process.exit(1); }

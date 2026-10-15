// Вибірка 50 ситуацій з BizDev-чатів по трафіку (прогін bt2, правка Марка 15.10).
//   node select-bizdev.mjs <папка BizDev> <out.json> [--shortlist]
// Папка — експорти Telegram (підпапки з messages*.html) і .docx-діалоги, як їх зібрав Марко.
// Справжня відповідь — лише Марка. У out.json усе вже замасковано; ролі учасників збережено,
// щоб агент бачив, хто пише: оператор чи наш баєр.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadBizdevFolder } from './lib/bizdev-archive.mjs';
import { candidates } from './lib/archive.mjs';
import { maskArchive } from './lib/mask-archive.mjs';

const [, , dir, output] = process.argv;
if (!dir || !output) { console.error('usage: select-bizdev.mjs <BizDev dir> <out.json> [--shortlist]'); process.exit(2); }
const here = path.dirname(fileURLToPath(import.meta.url));

// macOS textutil витягує текст з .docx без сторонніх пакетів.
const docxText = (f) => execFileSync('textutil', ['-convert', 'txt', '-stdout', f], { encoding: 'utf8' });
const chats = loadBizdevFolder(dir, docxText);

const join = (ms) => ms.map((m) => (m.text || (m.media ? '[медіа]' : ''))).filter(Boolean).join('\n').trim();
const maskText = (t) => maskArchive(t).text;
const rows = chats.flatMap((ch) => candidates(ch, { maxReplyMinutes: 720 })).map((c) => ({
  chat: c.chat, title: c.title, ts: c.partner[0].ts,
  partnerAuthor: c.partner[0].author, partnerRole: c.partner[0].role, replyAuthor: c.reply[0].author,
  partner: maskText(join(c.partner)), reply: maskText(join(c.reply)),
  context: c.context.map((m) => ({ ours: m.ours || m.staff, author: m.author, role: m.role, ts: m.ts, text: maskText(m.text || (m.media ? '[медіа]' : '')).slice(0, 600) })),
}));

if (process.argv.includes('--shortlist')) {
  fs.writeFileSync(output, JSON.stringify(rows, null, 1), { mode: 0o600 });
  console.log(`кандидатів ${rows.length}`);
  process.exit(0);
}

const curation = JSON.parse(fs.readFileSync(path.join(here, 'curation-bizdev.json'), 'utf8'));
const byKey = new Map(rows.map((r) => [`${r.chat}|${r.ts}|${r.partnerAuthor}`, r]));
const picked = curation.map((c) => {
  const r = byKey.get(`${c.chat}|${c.ts}|${c.author}`);
  if (!r) throw new Error(`немає кандидата ${c.chat} ${c.ts} ${c.author} — змінились експорти чи фільтри`);
  return { ...r, type: c.type };
}).sort((a, b) => a.ts.localeCompare(b.ts));
fs.writeFileSync(output, JSON.stringify(picked, null, 1), { mode: 0o600 });
console.log(`вибрано ${picked.length}; чатів ${new Set(picked.map((r) => r.chat)).size}`);

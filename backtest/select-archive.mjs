// Вибірка 50 архівних ситуацій для бектесту.
//   node select-archive.mjs <nodes.jsonl> <out.json>
// nodes.jsonl — по рядку JSON {slug, title, content} на ноду сегмента «Чати Телеграм»
// (читається з бази знань, ноди не змінюються). У out.json усе вже замасковано.
// Квоти по типах — щоб у розмітці були і прості, і «червоні» ситуації; усередині типу
// порядок випадковий (стабільний хеш), не «найкращі»: бектест має бути чесним.
import fs from 'node:fs';
import { parseNode, candidates } from './lib/archive.mjs';
import { maskArchive } from './lib/mask-archive.mjs';
import { classify } from './lib/classify.mjs';

const [, , input, output] = process.argv;
if (!input || !output) { console.error('usage: select-archive.mjs <nodes.jsonl> <out.json>'); process.exit(2); }

export const QUOTA = { access: 7, timing: 5, materials: 5, scheduling: 5, advice: 9, results: 7, smalltalk: 4, money: 6, ban: 2 };
const MAX_PER_CHAT = 3;

const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const join = (ms) => ms.map((m) => (m.text || (m.media ? '[медіа]' : ''))).filter(Boolean).join('\n').trim();
const maskText = (t) => maskArchive(t).text;

const nodes = fs.readFileSync(input, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const rows = nodes.map(parseNode).flatMap(candidates).map((c) => {
  const partner = maskText(join(c.partner));
  const reply = maskText(join(c.reply));
  return {
    chat: c.chat, title: c.title, ts: c.partner[0].ts, partnerAuthor: c.partner[0].author, replyAuthor: c.reply[0].author,
    type: classify(partner), partner, reply,
    context: c.context.map((m) => ({ ours: m.ours, author: m.author, ts: m.ts, text: maskText(m.text || (m.media ? '[медіа]' : '')).slice(0, 600) })),
    _h: fnv(`${c.chat}|${c.partner[0].ts}`),
  };
}).filter((r) => r.partner.length >= 25 && r.partner.length <= 700
  && r.reply.length >= (r.type === 'smalltalk' ? 8 : 40) && r.reply.length <= 900
  && !/переслано від|↩︎/.test(r.partner) && !/↩︎/.test(r.reply) && !/^https?:\/\/\S+$/.test(r.reply));

// Режим перегляду: усі придатні кандидати без квот і без обмеження на чат (для ручного добору).
if (process.argv[4] === '--shortlist') {
  fs.writeFileSync(output, JSON.stringify(rows.sort((a, b) => a._h - b._h).map(({ _h, ...r }) => r), null, 1), { mode: 0o600 });
  console.log(`кандидатів ${rows.length}`);
  process.exit(0);
}

// Добір вручну (curation.json: chat, ts, type) — типи й пари перевірено очима: евристика
// інколи зводить повідомлення клієнта з відповіддю про інше. Без файла — вибірка за квотами.
const curationPath = process.argv.includes('--curation') ? process.argv[process.argv.indexOf('--curation') + 1] : null;
if (curationPath) {
  const curation = JSON.parse(fs.readFileSync(curationPath, 'utf8'));
  const byKey = new Map(rows.map((r) => [`${r.chat}|${r.ts}`, r]));
  const picked = curation.map((c) => {
    const r = byKey.get(`${c.chat}|${c.ts}`);
    if (!r) throw new Error(`немає кандидата ${c.chat} ${c.ts} — змінилась архівна нода чи фільтри`);
    return { ...r, type: c.type };
  }).sort((a, b) => a.ts.localeCompare(b.ts));
  fs.writeFileSync(output, JSON.stringify(picked.map(({ _h, ...r }) => r), null, 1), { mode: 0o600 });
  console.log(`вибрано ${picked.length}; чатів ${new Set(picked.map((r) => r.chat)).size}`);
  process.exit(0);
}

const chosen = [];
const perChat = {};
for (const [type, n] of Object.entries(QUOTA)) {
  const pool = rows.filter((r) => r.type === type).sort((a, b) => a._h - b._h);
  let taken = 0;
  for (const r of pool) {
    if (taken >= n) break;
    if ((perChat[r.chat] ?? 0) >= MAX_PER_CHAT) continue;
    perChat[r.chat] = (perChat[r.chat] ?? 0) + 1;
    chosen.push(r); taken++;
  }
  if (taken < n) console.error(`УВАГА: типу ${type} знайшлось лише ${taken} з ${n}`);
}
chosen.sort((a, b) => a.ts.localeCompare(b.ts));
fs.writeFileSync(output, JSON.stringify(chosen.map(({ _h, ...r }) => r), null, 1), { mode: 0o600 });
console.log(`вибрано ${chosen.length}; чатів ${new Set(chosen.map((r) => r.chat)).size}`);

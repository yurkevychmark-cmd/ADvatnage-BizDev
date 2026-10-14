// Збирає пачки для складання чернеток: паспорт + стильовий профіль + ситуації БЕЗ справжніх
// відповідей. Чернетку пише модель, яка справжньої відповіді не бачила — так само, як це
// буде в бойовому режимі.
//   node build-batches.mjs <selection.json> <synthetic.json> <out-dir> [розмір-пачки=10]
// Видає out-dir/batch-N.md і ../situations.json (поруч із out-dir, з справжніми відповідями — пачки їх не містять) (id → ситуація, для завантаження в базу).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [, , selFile, synFile, outDir, sizeArg] = process.argv;
if (!selFile || !synFile || !outDir) { console.error('usage: build-batches.mjs <selection.json> <synthetic.json> <out-dir> [size]'); process.exit(2); }
const SIZE = Number(sizeArg ?? 10);
const here = path.dirname(fileURLToPath(import.meta.url));
const passport = fs.readFileSync(path.join(here, 'profile/passport.md'), 'utf8');
const style = fs.readFileSync(process.env.STYLE_PROFILE ?? path.join(here, 'profile/style-profile.md'), 'utf8');

const archive = JSON.parse(fs.readFileSync(selFile, 'utf8')).map((r, i) => ({
  id: `a${String(i + 1).padStart(2, '0')}`, kind: 'archive', type: r.type,
  source: { chat: r.chat, title: r.title, ts: r.ts },
  context: r.context, partner: r.partner, realReply: r.reply, card: null,
}));
const synthetic = JSON.parse(fs.readFileSync(synFile, 'utf8')).map((r, i) => ({
  id: `s${String(i + 1).padStart(2, '0')}`, kind: 'synthetic', type: r.type,
  source: null, context: r.context, partner: r.partner, realReply: null, card: r.card,
}));
const all = [...archive, ...synthetic];

// Пачки змішані за типами й джерелами, щоб одна пачка не була одним настроєм.
const fnv = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };
const shuffled = [...all].sort((a, b) => fnv(a.id) - fnv(b.id));

const show = (s) => {
  const lines = [`### ${s.id}`];
  if (s.card) lines.push('Картка угоди (вигадана для бектесту, але вважай її справжньою):', '```json', JSON.stringify(s.card, null, 1), '```');
  else lines.push('Картки угоди немає: це розмова з архіву, у ній лише те, що видно нижче. Чого бракує — не вигадуй.');
  if (s.context.length) {
    lines.push('Попередні повідомлення (старіші зверху):');
    for (const m of s.context) lines.push(`- ${m.ours ? 'МИ' : 'ПАРТНЕР'} (${m.author}): ${m.text.replace(/\n/g, ' ⏎ ')}`);
  }
  lines.push('Нове повідомлення партнера:', '"""', s.partner, '"""');
  return lines.join('\n');
};

fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });
// Справжня відповідь однієї ситуації може стояти в контексті іншої (та сама розмова). Такі дві ситуації
// не потрапляють в одну пачку: інакше модель побачила б відповідь, яку мала б вгадати.
const conflicts = new Map(all.map((s) => [s.id, new Set()]));
for (const a of all) {
  if (!a.realReply) continue;
  const key = a.realReply.slice(0, 50);
  for (const b of all) {
    if (a !== b && b.context.some((m) => m.text.includes(key))) { conflicts.get(a.id).add(b.id); conflicts.get(b.id).add(a.id); }
  }
}
const nBatches = Math.ceil(shuffled.length / SIZE);
const batches = Array.from({ length: nBatches }, () => []);
shuffled.forEach((s, i) => {
  for (let k = 0; k < nBatches; k++) {
    const b = batches[(i + k) % nBatches];
    if (b.length < SIZE && !b.some((x) => conflicts.get(s.id).has(x.id))) { b.push(s); return; }
  }
  throw new Error(`не вдалося розкласти ${s.id} по пачках без конфлікту`);
});
batches.forEach((b, n) => {
  const text = `Ти — BizDev-менеджер: складаєш ЧЕРНЕТКИ відповідей партнерам від імені робочого акаунта. Нічого нікуди не надсилається; чернетки побачить Марко й розмітить.

# Паспорт ролі
${passport}

# Стильовий профіль
${style}

# Завдання

Для кожної ситуації нижче вирішуй сам, за паспортом:
- route "draft" — це в межах «Сам» або «Пропонує Марку»: пишеш чернетку відповіді партнеру;
- route "human" — це з «Ніколи сам» (гроші, ставки, інвойси, гаманці, продовження умов, суперечки про результат, бани, сірі теми, «ти бот?»): чернетки немає;
- route "none" — для «партнер замовк»: приводу для пінга немає, тож нічого не пишеш.

Правила чернетки: англійською (мовою партнера); 1–3 короткі повідомлення, як у живому чаті; без тире, списків і заборонених слів зі стильового профілю; цифри й умови лише з картки; чого немає в картці чи в розмові — не вигадуй, у чернетці напиши, що перевіриш, а в "card_gap" назви, чого бракує. Для «партнер замовк» чернетка — це пінг із названим приводом.

Поле "why" — 1–2 речення українською для Марка: чому так (чому саме така відповідь, або чому «це людині», або чому пінга немає).

Відповідь — лише JSON-масив без пояснень, по одному об'єкту на ситуацію, у тому ж порядку:
[{"id": "a01", "route": "draft|human|none", "messages": ["…", "…"], "why": "…", "card_gap": null або "що бракує"}]
Для "human" і "none" "messages" — порожній масив.

Читай лише цей файл. Не відкривай інших файлів і не шукай справжніх відповідей: чесність бектесту в тому, що ти їх не бачиш.

# Ситуації

${b.map(show).join('\n\n')}
`;
  fs.writeFileSync(path.join(outDir, `batch-${n + 1}.md`), text, { mode: 0o600 });
});
fs.writeFileSync(path.join(outDir, '..', 'situations.json'), JSON.stringify(all, null, 1), { mode: 0o600 });
console.log(`ситуацій ${all.length} (архів ${archive.length}, синтетичних ${synthetic.length}); пачок ${batches.length}`);

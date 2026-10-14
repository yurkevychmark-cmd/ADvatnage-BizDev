// Збирає рішення Марка з бектесту в Markdown для вузла бази знань `bizdev-agent-examples`
// (приклади «ситуація → як правильно», які агент бере в кожен виклик).
//   node export-examples.mjs > examples.md
// Вузол потім пишеться через MCP (write_wiki_page). Тексти вже замасковані; сюди потрапляють
// лише повідомлення партнера, чернетка/правка й примітка Марка — без справжніх відповідей архіву.
import { spawnSync } from 'node:child_process';
import { TYPES, SYNTHETIC_TYPES, SMALLTALK, OTHER } from './lib/classify.mjs';

const host = process.env.BIZDEV_HOST ?? 'marko@144.91.104.211';
const sql = `
select coalesce(json_agg(r order by r.sort_order), '[]'::json) from (
  select s.sort_order, s.id, s.kind, s.situation_type as type, s.partner_message as partner, s.card,
         d.route, d.messages, x.verdict, x.edited_text as edited, x.note
    from backtest_situations s
    join backtest_decisions x on x.situation_id = s.id
    left join backtest_drafts d on d.situation_id = s.id
) r;`;
const r = spawnSync('ssh', ['-o', 'BatchMode=yes', host, 'docker exec -i bizdev-db psql -U bizdev -d bizdev -qAtX'], { input: sql, encoding: 'utf8' });
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
const rows = JSON.parse(r.stdout.trim());

const label = Object.fromEntries([...TYPES, ...SYNTHETIC_TYPES, SMALLTALK, OTHER].map((t) => [t.slug, t.label]));
const quote = (t) => String(t).split('\n').map((l) => `> ${l}`).join('\n');
const dealLine = (c) => (c ? `*Картка угоди: ${Object.entries(c).map(([k, v]) => `${k}: ${v}`).join('; ')}*\n\n` : '');
const draftText = (x) => (x.route === 'draft' ? x.messages.join('\n') : x.route === 'human' ? '(це людині, агент нічого не пише)' : '(пінга немає)');

const byType = new Map();
for (const x of rows) byType.set(x.type, [...(byType.get(x.type) ?? []), x]);

const out = [];
out.push('# Приклади рішень: BizDev-менеджер', '',
  `Розмічено ${rows.length} ситуацій бектесту. Агент бере сюди приклади свого типу ситуації: «так би і я» — зразок, «своя редакція» — як Марко написав би сам, «не те» — як не треба. Вузол правиться без деплою: прибери чи допиши приклад, і наступна чернетка зміниться.`, '');
for (const [type, list] of [...byType].sort((a, b) => b[1].length - a[1].length)) {
  const same = list.filter((x) => x.verdict === 'same').length;
  out.push(`## ${label[type] ?? type}`, '', `Розмічено ${list.length}, «так би і я» ${same} (${Math.round((100 * same) / list.length)}%).`, '');
  for (const x of list) {
    out.push(dealLine(x.card) + '**Партнер:**', quote(x.partner), '');
    if (x.verdict === 'same') out.push('**Так би і я:**', quote(draftText(x)));
    else if (x.verdict === 'edited') out.push('**Як пише Марко:**', quote(x.edited), '', `*Чернетка агента була: ${draftText(x).replace(/\n/g, ' / ')}*`);
    else out.push('**Не те:**', quote(draftText(x)));
    if (x.note) out.push('', `*Примітка Марка: ${x.note}*`);
    out.push('', '---', '');
  }
}
process.stdout.write(out.join('\n'));

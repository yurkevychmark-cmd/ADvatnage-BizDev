// BizDev-чати по трафіку (папка Марка ~/Desktop/BizDev, правка Марка 15.10): експорти Telegram
// у HTML і діалоги, вставлені в .docx. Розбір у той самий вигляд, що й archive.mjs:
// {slug, title, msgs: [{ts, author, role, ours, staff, text, media}]}.
//
// Справжня відповідь у бектесті — лише Марка (BizDev-лід). Павло й Степан — наша технічна
// частина й керівник: їхні повідомлення лишаються в контексті, але не є ні «партнером», ні відповіддю.
import fs from 'node:fs';
import path from 'node:path';

const MARKO = new Set(['Марко', 'Marko']);
const STAFF = new Set(['Pavlo', 'Степан', 'Stepan']);

/** Ролі учасників, щоб агент бачив, хто пише. Невідомий — «партнер». */
export const ROLES = {
  Luke: 'оператор King-go90', Kai: 'оператор King-go90',
  Kim: 'оператор Moonroll', Greg: 'оператор Moonroll',
  Sezin: 'оператор (Sezin)',
  'Alfred 2up.io': 'оператор 2up.io', Alfred: 'оператор 2up.io',
  'Cas V360': 'оператор VIVO 360', 'Social media vivo360': 'оператор VIVO 360', VIVO: 'оператор VIVO 360',
  Alex: 'оператор 10Panda', "It's Me Alyssa": 'оператор 10Panda', Ali: 'оператор 10Panda',
  'Olesia V.': 'наш баєр', David_ADvantage: 'наш баєр', 'Микола': 'наш баєр', 'Микола FB Buyer': 'наш баєр',
  Mykola: 'наш баєр', Antonio: 'наш баєр', Valentyn: 'наш баєр',
  'Марко': 'ми (BizDev)', Marko: 'ми (BizDev)', Pavlo: 'ми (тех)', 'Степан': 'ми (CEO)', Stepan: 'ми (CEO)',
};

const mk = (author, ts, text, media = false) => ({
  ts, author, role: ROLES[author] ?? 'партнер', ours: MARKO.has(author), staff: STAFF.has(author), text: text.trim(), media,
});
const isoTs = (d, t) => { const [dd, mm, yyyy] = d.split('.'); return `${yyyy}-${mm}-${dd} ${t.slice(0, 5)}`; };
const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

/** Експорт Telegram Desktop (messages.html, messages2.html …). */
export function parseTelegramHtml(files, slug) {
  const msgs = [];
  let title = slug;
  for (const f of files) {
    const t = fs.readFileSync(f, 'utf8');
    const ti = /<div class="text bold">\s*([\s\S]*?)\s*<\/div>/.exec(t);
    if (ti) title = unescape(ti[1].trim());
    let last = null;
    const re = /<div class="message (default|service)[^"]*" id="message-?\d+">([\s\S]*?)(?=<div class="message (?:default|service)|$)/g;
    for (const m of t.matchAll(re)) {
      if (m[1] === 'service') continue;
      const body = m[2];
      const d = /class="pull_right date details" title="(\d\d\.\d\d\.\d{4}) (\d\d:\d\d)/.exec(body);
      const fn = /<div class="from_name">\s*([\s\S]*?)\s*<\/div>/.exec(body);
      if (fn) last = unescape(fn[1].replace(/<[^>]+>/g, '')).replace(/\s+\d\d\.\d\d\.\d{4} \d\d:\d\d:\d\d$/, '').trim();
      const tx = /<div class="text">([\s\S]*?)<\/div>/.exec(body);
      const text = tx ? unescape(tx[1].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '')) : '';
      const media = /class="(media_wrap|photo_wrap|video_file_wrap)|media_voice|media_file|media_video/.test(body);
      if (!d || !last) continue;
      msgs.push(mk(last, isoTs(d[1], d[2]), text, media));
    }
  }
  msgs.sort((a, b) => a.ts.localeCompare(b.ts));
  return { slug, title, msgs };
}

/**
 * Діалог, вставлений у .docx (текст уже витягнуто). Репліки: «Ім'я, [ДД.ММ.РРРР, ГГ:ХХ:СС]:» або
 * блоки «Marko …» / «Alfred …» без часу — вони отримують час попередньої репліки.
 */
export function parseDocxDialog(text, slug, title) {
  // Ім'я стоїть на початку рядка або після двох пробілів (так склеєно при вставці в docx).
  const header = /(?<=^|\n|\s{2})([^\s\[\]][^\n\[\]]{0,38}?), \[(\d\d\.\d\d\.\d{4}), (\d\d:\d\d):\d\d\]:/g;
  const bare = /(?:^|\s{2}|\n)(Marko|Alfred|VIVO:|Mykola:)(?=\s)/g;
  const cuts = [];
  for (const m of text.matchAll(header)) cuts.push({ at: m.index, end: m.index + m[0].length, author: m[1].trim(), ts: isoTs(m[2], m[3]) });
  for (const m of text.matchAll(bare)) {
    const at = m.index + m[0].indexOf(m[1]);
    if (cuts.some((c) => at >= c.at && at < c.end)) continue;
    cuts.push({ at, end: at + m[1].length, author: m[1].replace(':', ''), ts: null });
  }
  cuts.sort((a, b) => a.at - b.at);
  const msgs = [];
  let ts = null;
  cuts.forEach((c, i) => {
    if (c.ts) ts = c.ts;
    const body = text.slice(c.end, i + 1 < cuts.length ? cuts[i + 1].at : text.length);
    if (!ts) return; // вступ до першої датованої репліки — без часу, у бектест не йде
    const t = body.replace(/^\s*:?\s*/, '').trim();
    if (t) msgs.push(mk(c.author, ts, t));
  });
  return { slug, title, msgs };
}

/** Вся папка Марка: підпапки з messages*.html і .docx-діалоги (бриф онбордингу — не діалог, пропускаємо). */
export function loadBizdevFolder(dir, docxText) {
  const chats = [];
  for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!sub.isDirectory()) continue;
    const files = fs.readdirSync(path.join(dir, sub.name)).filter((f) => /^messages\d*\.html$/.test(f)).sort()
      .map((f) => path.join(dir, sub.name, f));
    if (files.length) chats.push(parseTelegramHtml(files, `bizdev-${sub.name}`));
  }
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.docx') && !/Onboarding Brief/i.test(x))) {
    const slug = `bizdev-${f.replace(/\.docx$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
    chats.push(parseDocxDialog(docxText(path.join(dir, f)), slug, f.replace(/\.docx$/, '').replace(/__/g, '<>')));
  }
  return chats;
}

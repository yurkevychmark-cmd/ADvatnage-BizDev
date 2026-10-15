// Розбір нод сегмента «Чати Телеграм» (експорти робочих чатів) у список повідомлень.
// Вузол — Markdown: «## ДД.ММ.РРРР», далі «**ГГ:ХХ · Автор**» і текст. Ноди лише читаються.

const HDR = /^\*\*(\d\d:\d\d) · (.+?)\*\*\s*$/;
const DAY = /^## (\d\d)\.(\d\d)\.(\d{4})/;
const MEDIA_LINE = /^\*(?:📷|🎥|🎤|📎|🎞|🎧|📄|🖼)[^\n]*\*\n?/gm;

/** Наша сторона в чатах: Марко, Павло, Степан. Решта — клієнти; «Meridian» — канал оголошень. */
export const OURS = new Set(['Marko', 'Pavlo', 'Степан']);
export const NOISE_AUTHORS = new Set(['Meridian']);

/** @param {{slug: string, title: string, content: string}} node */
export function parseNode(node) {
  const msgs = [];
  let day = null;
  let cur = null;
  for (const line of node.content.split('\n')) {
    const d = DAY.exec(line);
    if (d) { day = `${d[3]}-${d[2]}-${d[1]}`; cur = null; continue; }
    const h = HDR.exec(line);
    if (h) { cur = { ts: `${day} ${h[1]}`, author: h[2], lines: [] }; msgs.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return {
    slug: node.slug,
    title: node.title,
    msgs: msgs
      .map((m) => {
        const raw = m.lines.join('\n').trim();
        const hasMedia = /^\*(?:📷|🎥|🎤|📎|🎞|🎧|📄|🖼)/m.test(raw);
        const text = raw.replace(MEDIA_LINE, '').replace(/\n?\*Реакції:[^\n]*\*/g, '').trim();
        return { ts: m.ts, author: m.author, ours: OURS.has(m.author), noise: NOISE_AUTHORS.has(m.author), text, media: hasMedia };
      })
      .filter((m) => !m.noise),
  };
}

export function minutesBetween(a, b) {
  return (Date.parse(b.replace(' ', 'T') + ':00Z') - Date.parse(a.replace(' ', 'T') + ':00Z')) / 60000;
}

/**
 * Кандидати: пачка повідомлень клієнта (підряд, не більше 10 хв між ними), після якої наша
 * сторона відповідає першою — не пізніше ніж за maxReplyMinutes (для чатів менторства 45 хв: далі
 * відповідь, найімовірніше, про інше). Повідомлення staff (Павло, Степан) — ні партнер, ні відповідь. Контекст — до 6 попередніх повідомлень.
 */
export function candidates(chat, { maxReplyMinutes = 45 } = {}) {
  const { msgs } = chat;
  const out = [];
  for (let i = 0; i < msgs.length; i++) {
    if (msgs[i].ours || msgs[i].staff) continue;
    let j = i;
    while (j + 1 < msgs.length && !msgs[j + 1].ours && !msgs[j + 1].staff && minutesBetween(msgs[j].ts, msgs[j + 1].ts) <= 10) j++;
    const reply = msgs[j + 1];
    if (reply?.ours && minutesBetween(msgs[j].ts, reply.ts) <= maxReplyMinutes) {
      // наші репліки підряд (одна думка в 1–3 повідомлення) — це одна відповідь
      let k = j + 1;
      while (k + 1 < msgs.length && msgs[k + 1].ours && msgs[k + 1].author === reply.author
        && minutesBetween(msgs[k].ts, msgs[k + 1].ts) <= 5) k++;
      out.push({
        chat: chat.slug,
        title: chat.title,
        partner: msgs.slice(i, j + 1),
        reply: msgs.slice(j + 1, k + 1),
        context: msgs.slice(Math.max(0, i - 6), i),
      });
    }
    i = j;
  }
  return out;
}

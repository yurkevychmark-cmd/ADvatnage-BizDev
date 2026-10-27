// Які чати слухач читає (таск 1dcedada, 4/8): прив'язані до карток у порталі (tg_chat_links)
// плюс старий список BIZDEV_TG_ALLOWED_CHATS, поки його не очистять. Решта чатів не читається.

/** «123, -100456» → ['123', '-100456']; сміття відкидається, а не валить старт. */
export function parseChatIds(raw) {
  const out = [];
  for (const s of String(raw ?? '').split(/[\s,]+/)) {
    if (!/^-?\d+$/.test(s)) continue;
    out.push(String(BigInt(s)));
  }
  return out;
}

/** id → звідки дозволено: 'card' (прив'язано в порталі), 'env' або 'card+env'. */
export function mergeAllowed(envIds, linkedIds) {
  const m = new Map();
  for (const id of linkedIds) m.set(String(id), 'card');
  for (const id of envIds) m.set(String(id), m.has(String(id)) ? 'card+env' : 'env');
  return m;
}

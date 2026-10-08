// Маскування на записі (таск 140108c8, кр. 4): у базу лягає лише результат mask(),
// оригінал не зберігається ніде — ні в базі, ні в лозі. Краще замаскувати зайве, ніж
// пропустити: в архіві чатів менторства паролі й email так і лишились у нодах.
//
// Що ловимо: гаманці (EVM, BTC, TRON, TON, довгі base58 на кшталт Solana), приватні
// ключі (64 hex), коди підтвердження (поруч зі словом «код/code/otp/2fa/pin/sms» або
// повідомлення лише з коду), паролі (після «пароль/password/pass/pwd» або логін:пароль
// у посиланні), номери карток (13–19 цифр, що проходять Luhn), токени ботів і API-ключі.

const B58 = '1-9A-HJ-NP-Za-km-z';

// \b у JS не бачить кирилиці, тому межі слова — через \p{L}\p{N}.
const kw = (words) => `(?<![\\p{L}\\p{N}_])(?:${words})(?![\\p{L}\\p{N}_])`;
// «[» перед словом — це вже наша маска «[пароль]», не ключове слово.
const kwFree = (words) => `(?<!\\[)${kw(words)}`;
const PASSWORD_KW = new RegExp(kwFree('пароль|паролі|пароля|паролем|password|passwd|pass|pwd|пасс|пас'), 'giu');
// «доступ: admin / qwerty123» — тут пароль іде парою після логіна.
const ACCESS_KW = new RegExp(kwFree('доступ|доступи|доступу|доступів|access|creds|credentials'), 'giu');
const CODE_WORDS = kw('код|коду|кода|коди|code|otp|2fa|pin|пін|sms|смс|verification|підтвердження');

/** Номер картки: сума Luhn. */
function luhnOk(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

// Порядок важливий: спершу найвужчі шаблони, щоб довгий base58 не з'їв токен бота.
const RULES = [
  // Ключі й токени.
  { kind: 'key', label: '[ключ]', re: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g },                       // токен Telegram-бота
  { kind: 'key', label: '[ключ]', re: /\b(?:sk|pk|rk)-[A-Za-z0-9_-]{20,}/g },                    // sk-… (OpenAI, OpenRouter, Stripe)
  { kind: 'key', label: '[ключ]', re: /\b(?:ghp|gho|ghs|github_pat|xox[abpr])_[A-Za-z0-9_-]{20,}/g },
  { kind: 'key', label: '[ключ]', re: /\b(?:0x)?[a-fA-F0-9]{64}\b/g },                          // приватний ключ у hex

  // Гаманці.
  { kind: 'wallet', label: '[гаманець]', re: /\b0x[a-fA-F0-9]{40}\b/g },                         // EVM
  { kind: 'wallet', label: '[гаманець]', re: /\bbc1[ac-hj-np-z02-9]{11,71}\b/gi },               // BTC bech32
  { kind: 'wallet', label: '[гаманець]', re: /\b[EU]Q[A-Za-z0-9_-]{46}(?![A-Za-z0-9_-])/g },     // TON
  { kind: 'wallet', label: '[гаманець]', re: new RegExp(`\\bT[${B58}]{33}\\b`, 'g') },            // TRON
  { kind: 'wallet', label: '[гаманець]', re: new RegExp(`\\b[13][${B58}]{25,34}\\b`, 'g') },      // BTC legacy
  // Solana та інші base58: 32–44 знаки, обов'язково і цифри, і літери.
  { kind: 'wallet', label: '[гаманець]', re: new RegExp(`\\b(?=[${B58}]*\\d)(?=[${B58}]*[A-Za-z])[${B58}]{32,44}\\b`, 'g') },

  // Логін:пароль у посиланні — https://user:pass@host.
  { kind: 'password', label: '[пароль]', re: /(?<=:\/\/[^\s:/@]+:)[^\s@/]+(?=@)/g },

  // Код підтвердження поруч зі словом: «код 12345», «code: 123 456», «2FA 987654».
  { kind: 'code', label: '[код]', re: new RegExp(`(?<=${CODE_WORDS}[^\\d\\n]{0,20})\\d(?:[ -]?\\d){3,7}(?!\\d)`, 'giu') },
];

// ── Паролі ────────────────────────────────────────────────────────────────────────────
// Пароль рідко стоїть одразу після слова «пароль»: «пароль від кабінету Qwerty123»,
// «the password is Hunter22», «доступ: admin / qwerty123». Тому дивимось на кілька слів
// після ключового в тому ж рядку і маскуємо:
//  - слово після роздільника («:», «=», «—», «is», «це»; для «доступ» — після «/»);
//  - кожне слово, схоже на пароль (цифри, спецсимволи, Великі всередині слова);
//  - якщо такого немає — перше слово, що не є службовим («pass hunter», «пароль від кабінету Qwerty»).
// Краще замаскувати зайве слово, ніж залишити пароль.
const WINDOW = 10;
const SEP = new Set([':', '=', '—', '–', '-', '/', 'is', 'це', 'є']);
const STOP = new Set([
  'від', 'для', 'до', 'на', 'у', 'в', 'з', 'із', 'та', 'і', 'й', 'мій', 'моя', 'мого', 'твій', 'ваш', 'наш', 'новий', 'старий', 'такий',
  'кабінет', 'кабінету', 'кабінета', 'акаунт', 'акаунта', 'акаунту', 'аккаунт', 'аккаунта', 'аккаунту', 'профілю', 'панелі', 'панель',
  'сайту', 'сайт', 'пошти', 'пошта', 'входу', 'адмінки', 'трекера', 'трекер',
  'the', 'my', 'your', 'our', 'new', 'old', 'for', 'to', 'of', 'from', 'on', 'in', 'account', 'cabinet', 'panel', 'email', 'mail', 'login',
]);
const looksSecret = (w) => w.length >= 4 && (/\d/.test(w) || /[!@#$%^&*_+=~?]/.test(w) || /\p{L}\p{Lu}/u.test(w));

function maskAfter(rest, mode) {
  const parts = rest.split(/(\s+)/);
  const words = []; // { i, core }
  let force = /^\s*[:=—–-]/.test(rest) && mode === 'password';
  const marks = new Set();
  let alreadyMasked = false; // пароль уже сховало інше правило — запасне не потрібне
  for (let i = 0; i < parts.length && words.length < WINDOW; i++) {
    if (!parts[i] || /^\s+$/.test(parts[i])) continue;
    const lead = parts[i].match(/^[:=—–\/-]+/)?.[0] ?? '';
    if (lead === parts[i]) { force = force || mode === 'password' || lead.includes('/'); continue; } // окремий роздільник
    if (lead && (mode === 'password' || lead.includes('/'))) force = true;
    const t = parts[i].slice(lead.length);
    const tail = t.match(/[,;:=]+$/)?.[0] ?? '';
    const core = t.slice(0, t.length - tail.length);
    if (/^\[.*\]$/.test(core)) { alreadyMasked = true; force = false; continue; }
    if (!core) { if (/[:=]/.test(tail) && mode === 'password') force = true; continue; }
    if (SEP.has(core.toLowerCase())) { force = force || mode === 'password' || core === '/'; continue; }
    words.push({ i, core });
    if (force || looksSecret(core)) marks.add(i);
    force = /[:=]/.test(tail) && mode === 'password';
  }
  // Перше неслужбове слово після «пароль» ховається завжди (як у першій версії), навіть коли
  // далі у вікні є інше слово з цифрами: «пароль Moonlight і логін team1».
  if (!alreadyMasked && mode === 'password' && !/^[,.!?]/.test(rest.trimStart())) {
    const first = words.find((w) => !STOP.has(w.core.toLowerCase()) && w.core.length >= 3);
    if (first) marks.add(first.i);
  }
  for (const i of marks) {
    const lead = parts[i].match(/^[:=—–\/-]+/)?.[0] ?? '';
    const tail = parts[i].slice(lead.length).match(/[,;:=]+$/)?.[0] ?? '';
    parts[i] = lead + '[пароль]' + tail;
  }
  return { text: parts.join(''), hit: marks.size > 0 };
}

/**
 * Вікно після ключового слова: до кінця рядка й до наступного ключового слова (у того —
 * своє вікно: «фб пароль sunshine, трекер пароль moonlight»). Якщо рядок після ключового
 * порожній або закінчується роздільником («Пароль:» ↵ «Qwerty123», «пароль від кабінету:» ↵ …),
 * вікно переходить на наступний непорожній рядок.
 */
function windowAfter(text, from, limit) {
  let end = from;
  for (let lines = 0; lines < 4; lines++) {
    const nl = text.indexOf('\n', end);
    const lineEnd = nl < 0 || nl >= limit ? limit : nl;
    const head = text.slice(from, lineEnd);
    end = lineEnd;
    // Є у рядку хоч одне змістовне слово (не службове й не роздільник)?
    const words = head.split(/\s+/).some((t) => {
      const core = t.replace(/^[:=—–\/-]+|[,;:=]+$/g, '').toLowerCase();
      return /[\p{L}\p{N}]/u.test(core) && !STOP.has(core) && !SEP.has(core);
    });
    const endsWithSep = /[:=—–\/-]\s*$/.test(head);
    if ((words && !endsWithSep) || lineEnd >= limit) break;
    end = lineEnd + 1; // захопити наступний рядок
  }
  return Math.min(end, limit);
}

function maskPasswords(text, kinds) {
  const hits = [];
  for (const [re, mode] of [[PASSWORD_KW, 'password'], [ACCESS_KW, 'access']]) {
    re.lastIndex = 0;
    for (let m; (m = re.exec(text)); ) hits.push({ start: m.index, end: m.index + m[0].length, mode });
  }
  hits.sort((a, b) => a.start - b.start);
  // Справа наліво: заміни в пізніших вікнах не зсувають позиції ранніших.
  let out = text;
  for (let k = hits.length - 1; k >= 0; k--) {
    const h = hits[k];
    if (k > 0 && hits[k - 1].end > h.start) continue; // перекриття («логін/пароль» тощо) — бере попередній
    const limit = k + 1 < hits.length ? hits[k + 1].start : text.length;
    const to = windowAfter(text, h.end, limit);
    const r = maskAfter(text.slice(h.end, to), h.mode);
    if (r.hit) { kinds.add('password'); out = out.slice(0, h.end) + r.text + out.slice(to); }
  }
  return out;
}

/** Повідомлення лише з коду: «48213», «123 456». Круглі суми (10000) не чіпаємо. */
const BARE_CODE = /^\s*(\d(?:[ -]?\d){4,7})\s*$/;

/** Номер картки: 13–19 цифр, можна з пробілами чи дефісами. */
const CARD = /(?<![A-Za-z0-9])\d(?:[ -]?\d){12,18}(?![A-Za-z0-9])/g;

/**
 * @param {string | null | undefined} text
 * @returns {{ text: string, masked: string[] }} masked — види замаскованого (без значень)
 */
export function mask(text) {
  if (!text) return { text: '', masked: [] };
  const kinds = new Set();
  let out = String(text);

  out = out.replace(CARD, (m) => {
    const digits = m.replace(/[ -]/g, '');
    if (digits.length < 13 || digits.length > 19 || !luhnOk(digits)) return m;
    kinds.add('card');
    return '[картка]';
  });

  for (const r of RULES) {
    out = out.replace(r.re, () => { kinds.add(r.kind); return r.label; });
  }
  out = maskPasswords(out, kinds);

  const bare = BARE_CODE.exec(out);
  if (bare && !/000$/.test(bare[1].replace(/[ -]/g, ''))) {
    kinds.add('code');
    out = out.replace(bare[1], '[код]');
  }

  return { text: out, masked: [...kinds].sort() };
}

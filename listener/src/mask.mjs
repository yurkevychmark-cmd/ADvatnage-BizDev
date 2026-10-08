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
const PASSWORD_WORDS = kw('пароль|паролі|пароля|password|passwd|pass|pwd|пасс|пас');
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
  // Є двокрапка чи «=» в тому ж рядку («пароль від кабінету: abc») — маскуємо перше слово після неї.
  { kind: 'password', label: '[пароль]', re: new RegExp(`(?<=${PASSWORD_WORDS}[^\\n:=]{0,40}[:=]\\s*)[^\\s,;]{3,}`, 'giu') },
  // Без двокрапки — перше слово одразу після ключового («pass abc123», «пароль — abc»).
  { kind: 'password', label: '[пароль]', re: new RegExp(`(?<=${PASSWORD_WORDS}\\s*(?:[—–-]\\s*)?)(?=[^\\s:=,;])(?!\\[)[^\\s,;]{3,}`, 'giu') },

  // Код підтвердження поруч зі словом: «код 12345», «code: 123 456», «2FA 987654».
  { kind: 'code', label: '[код]', re: new RegExp(`(?<=${CODE_WORDS}[^\\d\\n]{0,20})\\d(?:[ -]?\\d){3,7}(?!\\d)`, 'giu') },
];

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

  const bare = BARE_CODE.exec(out);
  if (bare && !/000$/.test(bare[1].replace(/[ -]/g, ''))) {
    kinds.add('code');
    out = out.replace(bare[1], '[код]');
  }

  return { text: out, masked: [...kinds].sort() };
}

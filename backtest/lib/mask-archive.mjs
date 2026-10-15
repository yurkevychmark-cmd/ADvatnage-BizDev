// Маскування архіву перед тим, як текст потрапить у ситуацію бектесту чи в приклад.
// Береться маскування слухача (гаманці, коди, паролі, картки, ключі) і додається те, що
// слухач не ховає, а в архіві є: email, телефони, IP, посилання з токенами та повідомлення,
// що складаються лише з пароля. Імена учасників і назви чатів не ховаємо: Марко має
// впізнавати співрозмовника, а портал — за логіном.
import { mask } from '../../listener/src/mask.mjs';

const ZW = '​';

// [текст](mailto:адреса) → текст, щоб після маскування не лишалось «[[email]](mailto:[email])».
const MAILTO = /\[([^\]]*)\]\(mailto:[^)]*\)/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const IPV4 = /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g;
// Телефон: або з «+», або три групи цифр через пробіл/крапку/дефіс (дати 04.03.2026 й суми 1 500 не підходять).
const PHONE = /\+\d[\d\s().-]{7,}\d|(?<![\d.:/-])\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?(?![\d.:/-])/g;
// ?token= / &invite_token= / &key= / &password= у посиланнях.
const URL_SECRET = /([?&][\w-]*(?:token|key|password|pass|pwd|secret|auth)[\w-]*=)[^&\s)\]]+/gi;
// Доступи до рекламних акаунтів: рядок з 3+ полями через «|» (id|логін|пошта|пароль|cookie…).
const CRED_LINE = /^[^\n|]*(?:\|[^\n|]*){3,}$/gm;
// Cookie сесії Facebook: c_user=…; xs=…; fr=…
const COOKIE = /\b(?:c_user|xs|fr|datr|sb)=[^\s;|]+(?:;\s*(?:[\w-]+)=[^\s;|]+)*;?/g;
// Проксі ip:порт:логін:пароль (IP до цього вже став [ip]).
const PROXY = /(\[ip\]|\b[\w.-]+\.\w{2,}):\d{2,5}:[^\s:]+:[^\s]+/g;
// Посилання на Google Docs/Sheets/Drive: часто відкриті «для всіх, у кого є лінк» (витрати, креативи партнера).
const GDOC = /https?:\/\/(?:docs|drive)\.google\.com\/[^\s)\]]+/g;
// 32 hex — токени статистики й API (md5-подібні).
const HEX32 = /\b[a-fA-F0-9]{32}\b/g;
// Довгий випадковий токен (Facebook CAPI «EAA…», API-ключі, хеші): 40+ знаків, і літери, і цифри.
const LONG_TOKEN = /(?<![\w/=?&.-])(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{40,}(?![\w])/g;
// [@nick](https://t.me/nick) → @nick
const TG_LINK = /\[(@[A-Za-z0-9_]{3,})\]\(https:\/\/t\.me\/[A-Za-z0-9_]+\)/g;
// Повідомлення з одного слова, схожого на пароль: літери + цифри чи символи, 8–24 знаки, не посилання й не @нік.
const LONE_SECRET = /^(?=\S{8,24}$)(?=\S*[A-Za-z])(?=\S*[\d!@#$%^&*_+=])(?![@#]|https?:|www\.)\S+$/;

// У прозі архіву «pass the review», «access to the platform», «login credentials with the group» — не облікові дані.
// Ці слова-ключі діють лише з явним присвоєнням («pass: X»). «password», «пароль» лишаються
// ключовими завжди: справжні паролі експорт уже вичистив власними позначками, а самотні
// рядки-паролі ловить LONE_SECRET.
const KEY = /(?<![\p{L}\p{N}_])(pass|access|credentials|creds)(?![\p{L}\p{N}_])(?!\s*(?:[:=]|is\b))/giu;
const protectKeywords = (t) => t.replace(KEY, (m) => m[0] + ZW + m.slice(1));

export function maskArchive(text) {
  if (!text) return { text: '', masked: [] };
  const kinds = new Set();
  let out = String(text).replace(TG_LINK, '$1').replace(MAILTO, '$1');
  out = out.replace(CRED_LINE, () => { kinds.add('credentials'); return '[доступи до акаунта]'; });
  out = out.replace(COOKIE, () => { kinds.add('credentials'); return '[cookie]'; });
  out = out.replace(EMAIL, () => { kinds.add('email'); return '[email]'; });
  out = out.replace(IPV4, () => { kinds.add('ip'); return '[ip]'; });
  out = out.replace(GDOC, () => { kinds.add('doc_link'); return '[посилання на документ]'; });
  out = out.replace(PROXY, () => { kinds.add('credentials'); return '[проксі]'; });
  out = out.replace(URL_SECRET, (_, p) => { kinds.add('key'); return `${p}[ключ]`; });
  out = out.replace(HEX32, () => { kinds.add('key'); return '[ключ]'; });
  out = out.replace(LONG_TOKEN, () => { kinds.add('key'); return '[ключ]'; });
  out = out.replace(PHONE, (m) => {
    const digits = m.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 15) return m;
    kinds.add('phone');
    return '[телефон]';
  });
  if (LONE_SECRET.test(out.trim()) && !/\[[^\]]+\]/.test(out)) {
    kinds.add('password');
    return { text: '[пароль]', masked: [...kinds].sort() };
  }
  const r = mask(protectKeywords(out));
  r.masked.forEach((k) => kinds.add(k));
  return { text: r.text.replaceAll(ZW, ''), masked: [...kinds].sort() };
}

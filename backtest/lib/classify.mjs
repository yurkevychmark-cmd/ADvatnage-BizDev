// Тип ситуації за повідомленням партнера. Мітка евристична, у бектесті її перевіряє людина
// (тип можна виправити в базі). Червоні типи — ті, що за паспортом ролі агент ніколи не
// веде сам: гроші, бани, суперечки, «ти бот?». Для них чернетки немає, є позначка «це людині».

/** @type {{slug: string, label: string, red: boolean, re: RegExp}[]} */
export const TYPES = [
  { slug: 'botq', label: 'Питання «ти бот?»', red: true, re: /\b(are you (a )?(bot|ai|real)|you(?:'re| are) (a )?(bot|ai|robot)|chatgpt|ти бот|це бот)\b/i },
  { slug: 'money', label: 'Гроші, оплата, умови', red: true, re: /\b(pay(ment|ing|ed)?|invoice|price|pricing|usdt|crypto address|wallet|refund|discount|subscription|extend|extension|renew|commission|bank|transfer|paid|how much|installment|second part)\b/i },
  { slug: 'ban', label: 'Бани, скарги, суперечки', red: true, re: /\b(ban(ned|s)?|blocked|disabled|restricted|suspended|appeal|dispute|complain(t|ing)?|scam|fraud|lawsuit|not satisfied|unhappy|disappointed|waste of money|storm|kicked|account (died|dead|lost|is gone))\b/i },
  { slug: 'access', label: 'Доступи й технічні проблеми', red: false, re: /\b(log ?in|sign ?in|access|password|can'?t open|cannot open|not working|doesn'?t work|error|bug|broken|link (is )?(not|doesn)|can'?t see|can'?t find|403|404|500|loading)\b/i },
  { slug: 'scheduling', label: 'Дзвінки й домовленості', re: /\b(call|meeting|meet|zoom|schedule|reschedule|appointment|tomorrow|today at|what time|available|calendar|slot)\b/i, red: false },
  { slug: 'timing', label: 'Строки й статуси', red: false, re: /\b(when (will|can|do|is|are)|how long|deadline|status|any update|update on|eta|still waiting|delay(ed)?|report|ready yet|delivered|launch date|by (monday|tuesday|wednesday|thursday|friday)|next week)\b/i },
  { slug: 'materials', label: 'Матеріали й посилання', red: false, re: /\b(link|send (me )?(the|a)|where (can|do) i (find|get)|template|document|doc\b|pdf|guide|lesson|module|material|brief|presentation|examples?|resources?)\b/i },
  { slug: 'results', label: 'Результати й цифри', red: false, re: /\b(spend|spent|ftd|cpa|cpl|roi|roas|ctr|cpm|conversion|leads?|results?|performance|numbers|stats|revenue|profit|installs?|registrations?|reg\b|low quality|bad quality)\b/i },
  { slug: 'advice', label: 'Порада по роботі', red: false, re: /\b(how (do|can|to|should)|what (is|are|should)|which|should i|recommend|advice|tips?|best way|method|strategy|creative|campaign|pwa|tracker|keitaro|voluum|facebook|meta|ads?|geo|offer|cloak|pixel|postback)\b/i },
];

export const SYNTHETIC_TYPES = [
  { slug: 'trial_start', label: 'Старт тріалу', red: false },
  { slug: 'weak_numbers', label: 'Слабкі цифри', red: false },
  { slug: 'new_geo', label: 'Просять нове гео', red: false },
  { slug: 'report_late', label: 'Звіт запізнюється', red: false },
  { slug: 'partner_silent', label: 'Партнер замовк', red: false },
];

// Типи BizDev-чатів по трафіку (бектест bt2, правка Марка 15.10): розмова про угоду, а не навчання.
export const BIZDEV_TYPES = [
  { slug: 'integration', label: 'Інтеграція й доступи', red: false },
  { slug: 'creatives', label: 'Креативи', red: false },
  { slug: 'next_steps', label: 'Статус і наступні кроки', red: false },
  { slug: 'relay', label: 'Координація баєра й оператора', red: false },
];

export const SMALLTALK = { slug: 'smalltalk', label: 'Подяка й підтримка розмови', red: false };
export const OTHER = { slug: 'other', label: 'Інше', red: false };

export const ALL_TYPES = [...TYPES, ...SYNTHETIC_TYPES, ...BIZDEV_TYPES, SMALLTALK, OTHER];
export const typeInfo = (slug) => ALL_TYPES.find((t) => t.slug === slug) ?? OTHER;

/** Перший тип, чий шаблон збігся; без збігу — «подяка» для коротких і «інше» для решти. */
export function classify(partnerText) {
  const t = partnerText.trim();
  for (const type of TYPES) if (type.re.test(t)) return type.slug;
  const short = t.length <= 90 && !/\?/.test(t);
  return short ? SMALLTALK.slug : OTHER.slug;
}

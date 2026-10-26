/**
 * Підказки трьох кроків прогону: сортування пари (оцінювач), чернетка (агент), оцінка (оцінювач).
 * Агент і оцінювач — різні моделі; агент ніколи не отримує відповіді Марка.
 */
import passport from './passport.md?raw';
import styleProfile from './style-profile.md?raw';
import { findLeak } from './leak';

/** Типи BizDev-ситуацій. red — за паспортом агент їх ніколи не веде сам. */
export const SITUATION_TYPES: { slug: string; hint: string; red?: boolean }[] = [
  { slug: 'integration', hint: 'доступи, трекер, домени, посилання, налаштування, технічні проблеми' },
  { slug: 'creatives', hint: 'креативи, банери, відео, підходи до реклами' },
  { slug: 'next_steps', hint: 'статус, що далі, коли запуск, хто що робить' },
  { slug: 'relay', hint: 'передати інфу між оператором і нашим баєром, познайомити, тегнути людину' },
  { slug: 'results', hint: 'цифри, спенд, FTD, якість трафіку, звіти' },
  { slug: 'scheduling', hint: 'дзвінки, зустрічі, час' },
  { slug: 'smalltalk', hint: 'подяка, привітання, коротке «ок» без питання' },
  { slug: 'money', hint: 'оплата, інвойси, гаманці, хеші транзакцій, ставки, умови угоди, рефанди', red: true },
  { slug: 'ban', hint: 'бани акаунтів, пауза співпраці, суперечки, скарги', red: true },
  { slug: 'botq', hint: '«ти бот?»', red: true },
  { slug: 'other', hint: 'інше' },
];
export const RED_TYPES = new Set(SITUATION_TYPES.filter((t) => t.red).map((t) => t.slug));

export interface Ctx { ours?: boolean; author: string; role?: string; ts?: string; text: string }

export const contextBlock = (ctx: Ctx[]) =>
  ctx.length
    ? ctx.map((m) => `- ${m.author}${m.role ? `, ${m.role}` : ''}${m.ts ? ` [${m.ts}]` : ''}: ${m.text.replace(/\n/g, ' ⏎ ')}`).join('\n')
    : '(немає)';

// ── 1 · сортування пари ─────────────────────────────────────────────────────────

export const TRIAGE_SYSTEM = `Ти готуєш дані для перевірки AI-менеджера BizDev. Тобі дають шматок групового Telegram-чату (оператор казино, наш баєр і ми), нове повідомлення партнера і першу відповідь Марка після нього.

Визнач:
1. relevant — чи відповідь Марка справді на ЦЕ повідомлення (або на тему, яку воно продовжує). false, якщо Марко пише про щось інше: нову тему, відповідь на інше повідомлення, власне оголошення, або відповідь неможливо зрозуміти без вкладення (скрін, файл), якого не видно.
2. reason — якщо relevant=false: одне коротке речення українською, чому пару відсіяно. Якщо true — null.
3. type — тип ситуації за повідомленням партнера, один зі списку:
${SITUATION_TYPES.map((t) => `- ${t.slug}: ${t.hint}`).join('\n')}

Відповідь — лише JSON: {"relevant": true|false, "reason": "…"|null, "type": "…"}`;

export const triageUser = (p: { context: Ctx[]; partnerAuthor: string | null; partnerRole: string | null; partner: string; reply: string }) =>
  `Попередні повідомлення (старіші зверху):\n${contextBlock(p.context)}\n\nНове повідомлення — ${p.partnerAuthor ?? 'партнер'}${p.partnerRole ? ` (${p.partnerRole})` : ''}:\n"""\n${p.partner}\n"""\n\nПерша відповідь Марка після нього:\n"""\n${p.reply}\n"""`;

// ── 2 · чернетка агента ─────────────────────────────────────────────────────────

/** Стильовий профіль без розділу «Живі приклади»: приклади агент отримує окремо, найближчі до ситуації. */
export const STYLE_PROFILE = styleProfile.split(/\n## Живі приклади/)[0].trim();
export const PASSPORT = passport.trim();

/**
 * Рядки профілю й паспорта, що видають оцінювану відповідь, прибираються саме для цієї ситуації.
 * Повертає текст і скільки рядків прибрано.
 */
export function profileFor(hiddenReply: string | null): { passport: string; style: string; removed: number } {
  if (!hiddenReply) return { passport: PASSPORT, style: STYLE_PROFILE, removed: 0 };
  let removed = 0;
  const clean = (t: string) => t.split('\n').filter((l) => (findLeak(l, hiddenReply) ? (removed++, false) : true)).join('\n');
  return { passport: clean(PASSPORT), style: clean(STYLE_PROFILE), removed };
}

export const draftSystem = (passportText: string, style: string, examples: string) => `Ти — BizDev-менеджер агенції ADvantage: пишеш відповіді партнерам у групових Telegram-чатах угод від імені робочого акаунта. Зараз це перевірка на архіві: твою чернетку ніхто не надсилає.

# Паспорт ролі
${passportText}

# Стильовий профіль
${style}

# Як Марко відповідав у схожих ситуаціях
Це зразок тону, довжини й того, що робити. Не копіюй факти з прикладів: вони з інших розмов.

${examples || '(прикладів немає)'}

# Завдання
Вирішуй за паспортом:
- route "draft" — це в межах «Сам» або «Пропонує Марку»: пишеш відповідь партнеру;
- route "human" — це з «Ніколи сам» (гроші, ставки, інвойси, гаманці, хеші транзакцій, умови угоди, суперечки, бани, пауза співпраці, сірі теми, «ти бот?»): відповіді немає, це Марку.

Правила відповіді: мовою партнера; 1–3 короткі повідомлення, як у живому чаті; без тире, маркерів списку й окличних знаків; цифри, дати, імена й обіцянки — лише з розмови вище; чого в розмові немає, не вигадуй: напиши, що перевіриш, а в "card_gap" назви, чого бракує.

Поле "why" — 1–2 речення українською: чому так.

Відповідь — лише JSON: {"route": "draft"|"human", "messages": ["…"], "why": "…", "card_gap": null або "…"}. Для "human" — "messages": [].`;

export const draftUser = (p: { context: Ctx[]; partnerAuthor: string | null; partnerRole: string | null; partner: string; chatTitle: string | null }) =>
  `Чат: ${p.chatTitle ?? 'BizDev'}\nКартки угоди немає: у тебе лише ця розмова.\n\nПопередні повідомлення (старіші зверху):\n${contextBlock(p.context)}\n\nНове повідомлення — ${p.partnerAuthor ?? 'партнер'}${p.partnerRole ? ` (${p.partnerRole})` : ''}:\n"""\n${p.partner}\n"""`;

// ── 3 · оцінка ──────────────────────────────────────────────────────────────────

export const ACTIONS = ['answered', 'clarified', 'promised', 'relayed', 'ack', 'handed_off'] as const;

export const JUDGE_SYSTEM = `Ти незалежно оцінюєш AI-менеджера BizDev. Стандарт — як насправді відповів Марко (людина, керівник BizDev). Тобі дають розмову, повідомлення партнера, відповідь Марка і чернетку агента. Чернетку писала інша модель, яка відповіді Марка не бачила.

Дії (одне слово):
- answered — відповів по суті, дав інформацію;
- clarified — перепитав, уточнив, що мав на увазі партнер;
- promised — пообіцяв перевірити, зробити, повернутися з відповіддю;
- relayed — передав справу чи інфу іншій людині в чаті (тег, «познайомтесь», «X підготує»);
- ack — коротка подяка чи підтвердження без нової інформації;
- handed_off — агент не відповідає, передає Марку (route "human").

Оціни:
1. marko_action і agent_action — головна дія кожного.
2. same_action — true, якщо агент робить те саме, що Марко, по суті: ту саму дію з тим самим наміром. Різні слова — не проблема. Якщо Марко відповів фактом, якого агент знати не міг, а агент чесно пообіцяв перевірити — це promised проти answered, тобто false.
3. invented_fact — true, якщо в чернетці є цифра, дата, ім'я, посилання, обіцянка строку чи факт, якого немає ні в розмові, ні в повідомленні партнера. Збіг з відповіддю Марка не виправдовує вигадку: агент знав лише розмову. invented_what — що саме вигадано, інакше null.
4. tone_ok — true, якщо тон як у Марка: спокійно, по-діловому, рівний до рівного, без канцеляриту, без маркетингу, без окличних знаків і тире. Довжину тут не оцінюй.
5. reason — якщо дія не та, є вигадка чи тон не той: одне-два речення українською, що саме не так. Інакше null.

Відповідь — лише JSON: {"marko_action": "…", "agent_action": "…", "same_action": true|false, "invented_fact": true|false, "invented_what": "…"|null, "tone_ok": true|false, "reason": "…"|null}`;

export const judgeUser = (p: { context: Ctx[]; partnerAuthor: string | null; partnerRole: string | null; partner: string; reply: string; draft: { route: string; messages: string[] } }) =>
  `Попередні повідомлення (старіші зверху):\n${contextBlock(p.context)}\n\nНове повідомлення — ${p.partnerAuthor ?? 'партнер'}${p.partnerRole ? ` (${p.partnerRole})` : ''}:\n"""\n${p.partner}\n"""\n\nВідповідь Марка (стандарт):\n"""\n${p.reply}\n"""\n\nЧернетка агента (route ${p.draft.route}):\n"""\n${p.draft.route === 'human' ? '(агент не відповідає, передає Марку)' : p.draft.messages.join('\n')}\n"""`;

/** Довжина в межах: від 0.4 до 2.5 від довжини Марка, або різниця до 40 знаків (короткі репліки). */
export function lengthCheck(draftChars: number, markoChars: number): { ratio: number | null; ok: boolean } {
  if (!markoChars) return { ratio: null, ok: true };
  const ratio = draftChars / markoChars;
  return { ratio, ok: Math.abs(draftChars - markoChars) <= 40 || (ratio >= 0.4 && ratio <= 2.5) };
}

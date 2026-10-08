// Нова версія маскування не відкриває того, що ховала перша (умова судді, коло 2).
// Порівнюємо на кількох тисячах згенерованих фраз з паролями: різні ключові слова,
// роздільники, переноси рядків, два паролі в одному повідомленні.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mask } from '../src/mask.mjs';
import { mask as maskV1 } from './fixtures/mask-v1.mjs';

const PREFIX = ['', 'фб ', 'Привіт! ', 'логін admin ', 'login: team1\n', 'тест: '];
const KEYWORD = ['пароль', 'Пароль', 'password', 'Password', 'pass', 'pwd', 'пароль від кабінету', 'пароль від акаунта', 'the password is', 'доступ: admin /'];
const SEP = [' ', ': ', ':', ' — ', ' - ', '=', ':\n', '\n', ': \n\n', ' is '];
const VALUE = ['Qwerty123', 'sunshine', 'S3cret_pass', 'kL9#mm2', 'hunter22', 'Zx9_k', 'qwerty', 'Moonlight'];
const SUFFIX = ['', ', а звіт завтра', '\nдякую', ' і логін team1', '. Скинь звіт'];

function* phrases() {
  for (const p of PREFIX) for (const k of KEYWORD) for (const s of SEP) for (const [i, v] of VALUE.entries()) {
    const suffix = SUFFIX[(i + s.length) % SUFFIX.length];
    yield { text: `${p}${k}${s}${v}${suffix}`, values: [v] };
  }
  // Два паролі в одному повідомленні — в одному рядку і на різних.
  for (const k of KEYWORD) for (const s of SEP) for (const join of [', ', ', трекер ', '\n', '\nа від трекера ']) {
    yield { text: `фб ${k}${s}sunshine${join}пароль${s}moonlight7`, values: ['sunshine', 'moonlight7'] };
  }
}

test('усе, що ховала перша версія, нова теж ховає', () => {
  let checked = 0, v1Hidden = 0, nowHidden = 0;
  const regressions = [];
  for (const { text, values } of phrases()) {
    const before = maskV1(text).text, after = mask(text).text;
    for (const v of values) {
      checked++;
      if (!before.includes(v)) v1Hidden++;
      if (!after.includes(v)) nowHidden++;
      if (!before.includes(v) && after.includes(v)) regressions.push(`${JSON.stringify(text)} → ${JSON.stringify(after)}`);
    }
  }
  assert.deepEqual(regressions.slice(0, 10), [], `${regressions.length} регресій`);
  assert.ok(nowHidden >= v1Hidden);
  console.log(`фраз-значень: ${checked}; перша версія ховала ${v1Hidden}, нова ховає ${nowHidden}`);
});

test('випадки обох кіл судді', () => {
  for (const [text, secret] of [
    ['пароль від кабінету Qwerty123', 'Qwerty123'],
    ['Пароль від кабінету — S3cret_pass', 'S3cret_pass'],
    ['the password is Hunter22', 'Hunter22'],
    ['доступ: admin / qwerty123', 'qwerty123'],
    ['Пароль:\nQwerty123', 'Qwerty123'],
    ['фб пароль sunshine, трекер пароль moonlight', 'sunshine'],
    ['фб пароль sunshine, трекер пароль moonlight', 'moonlight'],
    ['пароль від кабінету\nQwerty123', 'Qwerty123'],
    ['the password is\nHunter22', 'Hunter22'],
  ]) assert.ok(!mask(text).text.includes(secret), `«${secret}» відкритий у ${JSON.stringify(mask(text).text)}`);
});

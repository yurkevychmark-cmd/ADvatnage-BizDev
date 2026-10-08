import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mask } from '../src/mask.mjs';

const hidden = (input, secret, kind) => {
  const r = mask(input);
  assert.ok(!r.text.includes(secret), `лишилось «${secret}» у «${r.text}»`);
  assert.ok(r.masked.includes(kind), `немає виду ${kind} у ${JSON.stringify(r.masked)} для «${input}»`);
  return r;
};
const intact = (input) => {
  const r = mask(input);
  assert.equal(r.text, input);
  assert.deepEqual(r.masked, []);
};

test('гаманці', () => {
  hidden('кидай на 0x52908400098527886E0F7030069857D2E4169EE7 usdt', '0x52908400098527886E0F7030069857D2E4169EE7', 'wallet');
  hidden('TRC20: TJYeasTPa6gpEEfYqN6uj6Ux5vJjvHKiVr', 'TJYeasTPa6gpEEfYqN6uj6Ux5vJjvHKiVr', 'wallet');
  hidden('btc bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'wallet');
  hidden('1BoatSLRHtKNngkdXEeobR76b53LETtpyT', '1BoatSLRHtKNngkdXEeobR76b53LETtpyT', 'wallet');
  hidden('ton EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', 'EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t', 'wallet');
  hidden('sol 7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV', 'wallet');
});

test('коди підтвердження', () => {
  hidden('код 48213', '48213', 'code');
  hidden('Code: 123 456', '123 456', 'code');
  hidden('ось код з смс — 9081', '9081', 'code');
  hidden('2FA 987654', '987654', 'code');
  hidden('482137', '482137', 'code');
  hidden('  48 213 ', '48 213', 'code');
});

test('паролі', () => {
  hidden('пароль: Qwerty!2024', 'Qwerty!2024', 'password');
  hidden('логін admin пароль від кабінету: s3cr3tPass', 's3cr3tPass', 'password');
  hidden('pass hunter22', 'hunter22', 'password');
  hidden('password=Zx9_k', 'Zx9_k', 'password');
  hidden('Пароль — abc12345', 'abc12345', 'password');
  hidden('https://buyer:Tr0ub4dor@panel.example.com/login', 'Tr0ub4dor', 'password');
  const r = hidden('login: team1\npass: kL9#mm2', 'kL9#mm2', 'password');
  assert.ok(r.text.includes('team1'), 'логін не пароль, лишається');
});

test('картки й ключі', () => {
  hidden('карта 4111 1111 1111 1111 до пт', '4111 1111 1111 1111', 'card');
  hidden('5500-0000-0000-0004', '5500-0000-0000-0004', 'card');
  hidden('бот 1234567890:AAH6hX7Yy2bQk9fZ0aQwErTyUiOpAsDfGhJ', 'AAH6hX7Yy2bQk9fZ0aQwErTyUiOpAsDfGhJ', 'key');
  hidden('ключ sk-or-v1-0123456789abcdef0123456789abcdef', 'sk-or-v1-0123456789abcdef0123456789abcdef', 'key');
});

test('звичайна мова й цифри угод не чіпаються', () => {
  intact('Привіт! Як там тріал по Бразилії, є перші депозити?');
  intact('бюджет 10000 на тиждень, CPA 45$, baseline 2.5%');
  intact('10000');
  intact('звіт за 07.10.2026, spend $15 000, 120 FTD');
  intact('офер https://advantage-agency.co/offers/brazil-2026 ок?');
  intact('скинь новий код трекінгу на лендинг');
  intact('телефон +380 67 123 45 67'); // 12 цифр — не картка
  intact('кампанія 23847562938475 запущена'); // 14 цифр без Luhn
});

test('порожнє і null', () => {
  assert.deepEqual(mask(''), { text: '', masked: [] });
  assert.deepEqual(mask(null), { text: '', masked: [] });
});
